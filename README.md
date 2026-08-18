# 멀티미디어콘텐츠제작전문가 이론·CBT — GitHub Pages 최종본

필수 능력단위 10개의 이론 학습과 600문항 CBT 문제풀이를 제공하는 정적 Next.js 사이트입니다.
서버, PHP, DB 없이 GitHub Pages에서 운영할 수 있도록 정적 export 방식으로 정리되어 있습니다.

## 포함 내용

- 필수 능력단위: 10개
- 능력단위 요소: 60개
- 필요지식 주제: 163개
- 개별 용어: 582개
- 문제: 600문항(능력단위별 60문항)
- 종합 모의고사: 40문항, 90분

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run dev
```

터미널에 표시되는 `http://localhost:3000` 주소로 접속합니다.

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더의 파일을 저장소 최상위에 업로드합니다.
3. 기본 브랜치 이름을 `main`으로 사용합니다.
4. GitHub 저장소의 `Settings → Pages`에서 Source를 `GitHub Actions`로 선택합니다.
5. `main` 브랜치에 push하면 `.github/workflows/deploy-pages.yml`이 자동 실행됩니다.
6. Actions의 배포가 완료되면 Pages 주소로 접속합니다.

일반 프로젝트 저장소(`https://사용자명.github.io/저장소명/`)와 사용자 사이트 저장소(`사용자명.github.io`)를 자동 구분하여 경로를 맞춥니다.

## 주요 파일

- `app/page.tsx`: 이론 학습, 능력단위별 문제, 종합 모의고사 화면과 동작
- `app/globals.css`: 반응형 레이아웃 스타일
- `app/data/theory.json`: 이론 데이터
- `app/data/questions.json`: 600문항 데이터
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 빌드·배포
- `next.config.ts`: 정적 export 및 GitHub Pages 하위 경로 설정

## 검증

```bash
npm run lint
npm test
```

`npm run build`가 성공하면 `out/` 폴더에 GitHub Pages용 정적 파일이 생성됩니다.
