# 툭

떠오른 순간을 툭 던져두는 개인 기록 앱.

- 화면: `public/` (빌드 없음, 그대로 배포)
- 서버: `functions/api/[[path]].js` (Cloudflare Pages Functions)
- 저장: D1 (`DB`), 사진은 R2(`IMG`)가 연결돼 있으면 R2, 없으면 D1에 저장
- 접근: 환경변수 `TUK_KEY` 비밀키

## Cloudflare Pages 설정
- 빌드 명령: 비움
- 빌드 출력 디렉터리: `public`
- 바인딩: D1 → 변수 이름 `DB` / (선택) R2 → 변수 이름 `IMG`
- 변수 및 비밀: `TUK_KEY` (암호화)

## 바로 저장 링크 (단축어용)
`https://<주소>/?add=내용` → 받은함에 저장
`https://<주소>/?add=내용&tab=<탭ID>` → 그 탭에 저장 (탭 ID는 탭에 들어갔을 때 주소 # 뒤)
