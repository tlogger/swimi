import fs from 'fs';

async function main() {
  console.log('Fetching https://jasumap.com ...');
  const res = await fetch('https://jasumap.com', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  fs.writeFileSync('jasumap_raw.html', html, 'utf8');

  const match = html.match(/var\s+data\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
  if (!match) {
    console.error('var data not found');
    return;
  }
  const jData = JSON.parse(match[1]);
  console.log('Total jData:', jData.length);

  let countWithURL = 0, countWithURL2 = 0, countWithBigo1 = 0, countWithBigo2 = 0;
  const urlDomains = new Set();
  const url2Domains = new Set();

  jData.forEach(p => {
    if (p['URL']) {
      countWithURL++;
      try { urlDomains.add(new URL(p['URL']).hostname); } catch(e){}
    }
    if (p['URL2']) {
      countWithURL2++;
      try { url2Domains.add(new URL(p['URL2']).hostname); } catch(e){}
    }
    if (p['비고1']) countWithBigo1++;
    if (p['비고2']) countWithBigo2++;
  });

  console.log({ countWithURL, countWithURL2, countWithBigo1, countWithBigo2 });
  console.log('URL Domains:', Array.from(urlDomains));
  console.log('URL2 Domains:', Array.from(url2Domains));

  // Examine samples of URL2 (tistory etc.)
  const sampleURL2 = jData.filter(p => p['URL2']).slice(0, 5).map(p => ({ name: p['이름'], url: p['URL2'] }));
  console.log('Sample URL2:', sampleURL2);

  // Examine sample bigo
  console.log('Sample bigo1:', jData.filter(p => p['비고1']).slice(0, 5).map(p => ({ name: p['이름'], bigo1: p['비고1'] })));
  console.log('Sample bigo2:', jData.filter(p => p['비고2']).slice(0, 5).map(p => ({ name: p['이름'], bigo2: p['비고2'] })));
}

main();
