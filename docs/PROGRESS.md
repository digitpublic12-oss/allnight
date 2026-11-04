# Allnight — 진행 상황 (PROGRESS.md)

> 규칙: `AGENTS.md` §13 · 상태 구분: **대기 / 진행 중 / 완료 / 차단**  
> 최종 갱신: 2026-11-05

## 핸드북 진도표

> 기준: 수업 "웹 시스템 구축 핸드북" 10단계. **진도만 맞추고 세부 방식은 우리 docs를 따른다** (사용자 결정, 2026-11-05).  
> 핸드북의 "책바통" 예시 → ALLNIGHT로 바꿔 읽는다.

| 회차 | 단계 | 핸드북 산출물 | ALLNIGHT 대응 | 상태 |
|---|---|---|---|---|
| 1 | 1 시스템 설계 | SITEMAP.md, DB.md | `docs/SITEMAP.md`, `docs/DB.md` | 완료 |
| 1 | 2 규칙 파일 | AGENTS.md, DESIGN.md, 폴더·상황별 규칙 | `CLAUDE.md`(루트, 자동 로딩) → `docs/AGENTS.md`, `docs/DESIGN.md` | 완료 (`admin/AGENTS.md`는 8단계에서) |
| 1 | 3 페이지 명세서 | docs/pages/*.md | `docs/pages/01~13`, `index.md` | 완료 |
| 1 | 4 공통 뼈대·랜딩 | css/style.css, index.html | `css/style.css`, `index.html`(임시 소개 페이지) | 완료 |
| 2 | 5 DB 연동 준비 | Supabase, schema.sql, config.js | Next.js 프로젝트 생성, Supabase(개발용), DB.md → 마이그레이션 SQL, 네이버 지도 키 | 대기 |
| 2 | 6 로그인 | login.html | 로그인 모달 (`05_auth_modal`) | 대기 |
| 2 | 7 기능 페이지 | 등록·찾기·내 책 | 지도 검색(01), 장소 상세(02), 신규 제보(03), 수정 제보(04) | 대기 |
| 3 | 8 관리자 | admin/index.html | 관리자 화면 06~11, `admin/AGENTS.md` | 대기 |
| 3 | 9 점검 | 보안 시험, TEST.md | RLS 보안 시험(남의 데이터 수정·스스로 관리자 되기), 명세 완료 조건, `docs/TEST.md` | 대기 |
| 3 | 10 배포 | Cloudflare Pages | Cloudflare + Supabase URL 설정 | 대기 |

- 진도 위험: 2회차 분량이 핸드북보다 큼 (Next.js·지도 API 설정, 화면 4개). 2회차 계획 시 회차별 최소 범위를 정한다.

## 현재 요약

- 핸드북 **1회차(1~4단계) 완료**. 다음은 2회차 5단계(DB 연동 준비) 계획 수립.
- 실제 서비스(Next.js + Supabase) 개발은 아직 시작 전.

## 작업 목록

### 1. 랜딩페이지 초안 및 KO/EN 언어 전환 — 완료

- 변경 파일: `index.html`
- 기록: 커밋 `74dd199`, `7ce94e3`

### 2. 기획 문서 작성 — 완료

- 목표: 개발 전 제품·화면·데이터·디자인·작업 규칙 확정
- 생성 파일: `docs/PRD.md`, `docs/SITEMAP.md`, `docs/DB.md`, `docs/DESIGN.md`, `docs/AGENTS.md`, `docs/pages/01~13`
- 남은 이슈: 없음 (`AGENTS.md` 문서 표의 "작성 예정" 표기를 실제 상태로 정정함)

### 3. 랜딩페이지 CSS 분리 — 완료

- 목표: `index.html` 인라인 스타일을 `DESIGN.md` 기준 공통 CSS로 분리
- 승인: 사용자 요청 ("다 해줘", 2026-11-05), main 커밋 승인
- 기록: 문서 커밋 `4fe9ffc`, CSS 커밋 `172ebaf`
- 변경 파일: `index.html`, `css/style.css`
- 내용:
  - 인라인 `<style>` 제거, `css/style.css` 연결 (상대경로 — 파일로 직접 열어도 적용)
  - 새 CSS에 빠져 있던 랜딩 클래스 25개(데모, 비교표, 로드맵, 확장 배너) 스타일 이관 (`style.css` §20-B)
  - Pretendard 폰트를 jsDelivr CDN으로 연결 (기존 Google Fonts 링크는 Pretendard를 제공하지 않음)
- 검증:
  - `index.html`의 클래스 100개 모두 CSS에 정의되어 있음을 스크립트로 확인
  - 헤드리스 Chrome(1440px)으로 이전 버전과 비교 렌더링, 레이아웃 일치 확인
- 결정: 주요 버튼 색은 `DESIGN.md` 기준 블루(`--color-primary`) 유지 (사용자 결정, 2026-11-05)
- 결정: 데모 결과 목록은 예전처럼 3열로 되돌림 (사용자 결정, 2026-11-05)
- 미검증: 모바일·좁은 화면, 다크/라이트 모드 전환, KO/EN 전환 후 화면
- 남은 이슈: 없음

### 4. 소개 페이지 재구성 (`docs/pages/index.md`) — 완료

- 목표: 명세에 맞춰 `index.html` 머리말·꼬리말 재구성, 스타일을 `css/style.css` 하나로 통일
- 승인: 명세 초안 승인 (2026-11-05). 원래 요청의 책 메뉴·`index.md` 부재는 ALLNIGHT에 맞게 조정하기로 결정
- 변경 파일: `docs/pages/index.md`(신규), `index.html`, `css/style.css`
- 내용:
  - 머리말: 로고 + 장소 찾기(데모로 이동) / 장소 제보·로그인(준비 중, 비활성) + KO/EN
  - 꼬리말: 서비스 이름·설명, 문의(이메일 준비 중), 저작권
  - HTML의 `style=""` 18곳(JS 템플릿 포함)을 클래스로 교체, 폰트는 `style.css`의 `@import`로 이동
  - 버튼에 기본 `btn` 클래스 누락(3번 작업 때 생긴 문제)을 바로잡음 — 히어로·CTA 버튼이 스타일 없이 보였음
  - 이메일 입력창에 `input` 클래스 적용
- 검증: 클래스 정의 누락 0, KO/EN 사전 키 누락 0, 로컬 서버에서 KO·EN 화면 확인 (1440px)
- 미검증: 모바일·좁은 화면, 라이트 모드
- 남은 이슈: 문의 이메일 주소 미정

### 5. 규칙 파일 자동 로딩 (핸드북 2단계 보완) — 완료

- 목표: 새 대화·팀원의 AI도 규칙을 읽도록 루트에 안내 파일 추가
- 승인: 사용자 승인 (2026-11-05)
- 변경 파일: `CLAUDE.md`(신규), `docs/PROGRESS.md`(핸드북 진도표 추가)
- 내용: `CLAUDE.md`는 `docs/AGENTS.md`·`docs/PROGRESS.md`를 먼저 읽게 하고 작업별 문서를 안내 (규칙 내용은 반복하지 않음)
- 검증: 미검증 — 새 대화에서 "지금 적용되는 규칙 파일을 알려줘"로 확인 필요 (핸드북 2.6)

### 6. 서비스 개발 착수 (핸드북 5단계, Next.js + Supabase) — 대기

- 선행: 기술 스택 적합성 검토, 프로젝트 구조 승인 (`AGENTS.md` §6~7)

## 다음 단계 후보

1. 새 대화에서 규칙 파일 적용 확인 (핸드북 2.6)
2. 핸드북 5단계 계획 제출 (2회차 최소 범위 포함)
3. 화면 직접 확인 (다크 모드·KO/EN 전환) — 데스크톱 전용이므로 모바일은 미지원 안내만 확인
