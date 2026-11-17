const DEFAULT_SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

export default async function handler(req: { method?: string; query?: Record<string, string | string[] | undefined> }, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; send: (body: string) => void; end: () => void };
}) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  const sinceRaw = req.query?.since;
  const since = typeof sinceRaw === 'string' && sinceRaw.trim() ? sinceRaw.trim() : null;
  const bustRaw = req.query?.bust;
  const bust = bustRaw === '1' || bustRaw === 'true';

  const params = new URLSearchParams({
    select: '*',
    order: since ? 'updated_at.asc' : 'name.asc',
    limit: '2000',
  });

  if (since) {
    params.set('updated_at', `gt.${since}`);
  } else {
    params.set('is_deleted', 'eq.false');
  }

  const targetUrl = `${supabaseUrl}/rest/v1/swimi_pools?${params.toString()}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      res.status(upstream.status).json({ error: `Supabase error ${upstream.status}`, detail: errText });
      return;
    }

    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (bust) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (since) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    }

    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: 'Upstream fetch failed', detail: message });
  }
}
