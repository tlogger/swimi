# 🏊 Swimi - Antigravity 프로젝트 가이드 및 옵시디언 연동 규칙

- **프로젝트명**: Swimi
- **개요**: 전국 수영장 정보 플랫폼 (Next.js, React, Vercel 배포, 수심 필터, 운영시간 파싱)
- **GitHub 저장소**: `https://github.com/tlogger/swimi`
- **옵시디언 전용 작업 기록 경로**: `G:\내 드라이브\all\Private\obsidian\Luke\20_Tech & Hobby\agentic\Swimi\Swimi 작업 기록.md`
- **옵시디언 산출물 폴더**: `G:\내 드라이브\all\Private\obsidian\Luke\20_Tech & Hobby\agentic\Swimi\`

---

## 📌 에이전트 작업 원칙
1. **컨텍스트 로드**: 작업 시작 시 옵시디언 전용 작업 기록 파일의 `## 📅 작업 타임라인` 최신 항목을 읽어 직전 진행 상황과 사양 결정을 파악하십시오.
2. **작업 완료 시 자동 로깅**: 작업이 완료되면 위 옵시디언 전용 작업 기록 파일의 `## 📅 작업 타임라인` 최상단에 표준 포맷으로 로그를 누적하십시오.
3. **배포 정책 (Push 선행 및 사용자 요청 시 실행)**:
   - 단순 로컬 `git commit`만으로는 배포를 실행하지 않습니다.
   - 사용자가 "deploy" 또는 "배포"를 요청할 때에만, 반드시 **`git push origin main`이 성공적으로 완료된 후 `npx vercel --prod --yes`를 순차 실행**하여 배포합니다 (`npm run deploy`).
