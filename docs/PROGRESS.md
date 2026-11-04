# Allnight — 진행 상황 (PROGRESS.md)

> 규칙: `AGENTS.md` §13 · 상태 구분: **대기 / 진행 중 / 완료 / 차단**  
> 최종 갱신: 2026-11-05

## 현재 요약

- 기획 문서(PRD, SITEMAP, DB, DESIGN, AGENTS, 화면 명세 01~13) 작성 완료.
- 랜딩페이지(`index.html`)의 스타일을 공통 CSS(`css/style.css`)로 분리하는 작업 완료, 커밋 전.
- 실제 서비스(Next.js + Supabase) 개발은 아직 시작 전.

## 작업 목록

### 1. 랜딩페이지 초안 및 KO/EN 언어 전환 — 완료

- 변경 파일: `index.html`
- 기록: 커밋 `74dd199`, `7ce94e3`

### 2. 기획 문서 작성 — 완료

- 목표: 개발 전 제품·화면·데이터·디자인·작업 규칙 확정
- 생성 파일: `docs/PRD.md`, `docs/SITEMAP.md`, `docs/DB.md`, `docs/DESIGN.md`, `docs/AGENTS.md`, `docs/pages/01~13`
- 남은 이슈: 없음 (`AGENTS.md` 문서 표의 "작성 예정" 표기를 실제 상태로 정정함)

### 3. 랜딩페이지 CSS 분리 — 완료 (커밋 대기)

- 목표: `index.html` 인라인 스타일을 `DESIGN.md` 기준 공통 CSS로 분리
- 승인: 사용자 요청 ("다 해줘", 2026-11-05)
- 변경 파일: `index.html`, `css/style.css`
- 내용:
  - 인라인 `<style>` 제거, `css/style.css` 연결 (상대경로 — 파일로 직접 열어도 적용)
  - 새 CSS에 빠져 있던 랜딩 클래스 25개(데모, 비교표, 로드맵, 확장 배너) 스타일 이관 (`style.css` §20-B)
  - Pretendard 폰트를 jsDelivr CDN으로 연결 (기존 Google Fonts 링크는 Pretendard를 제공하지 않음)
- 검증:
  - `index.html`의 클래스 100개 모두 CSS에 정의되어 있음을 스크립트로 확인
  - 헤드리스 Chrome(1440px)으로 이전 버전과 비교 렌더링, 레이아웃 일치 확인
- 미검증: 모바일·좁은 화면, 다크/라이트 모드 전환, KO/EN 전환 후 화면
- 남은 이슈 (결정 필요):
  - 주요 버튼 색이 금색에서 블루(`--color-primary`)로 바뀜 — `DESIGN.md` 기준이지만 랜딩 톤과 다름
  - 데모 결과 목록이 3열에서 2열로 바뀜

### 4. 서비스 개발 착수 (Next.js + Supabase) — 대기

- 선행: 기술 스택 적합성 검토, 프로젝트 구조 승인 (`AGENTS.md` §6~7)

## 다음 단계 후보

1. 3번 작업 커밋
2. 버튼 색상·데모 열 수 결정
3. 서비스 개발 착수 계획 제출
