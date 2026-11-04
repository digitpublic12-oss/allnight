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
| 2 | 5 DB 연동 준비 | Supabase, schema.sql, config.js | Next.js 프로젝트 생성, Supabase(개발용), 핵심 테이블 SQL(읽기 전용 RLS), 네이버 지도 키 | 대기 |
| 2 | 6 로그인 | login.html | **이후로 미룸** (시연 범위에 로그인 없음) | 보류 |
| 2 | 7 기능 페이지 | 등록·찾기·내 책 | 지도·시간 검색(01), 장소 상세(02) — 읽기만 | 대기 |
| 3 | 8 관리자 | admin/index.html | **Supabase 대시보드로 대체** (장소를 표 편집 화면·SQL로 직접 입력) | 보류 |
| 3 | 9 점검 | 보안 시험, TEST.md | 방문자가 데이터를 쓰거나 지울 수 없는지 시험, 명세 완료 조건, `docs/TEST.md` | 대기 |
| 3 | 10 배포 | Cloudflare Pages | Cloudflare + Supabase URL 설정 | 대기 |

## 시연 범위 (사용자 결정, 2026-11-05)

목표: **나중에 기능을 붙일 수 있는 기본 틀 + 시연 가능한 화면.** 로그인은 필요 없음.

- **만든다:** 지도 + 시간(18:00~익일 07:00) 검색 + 카테고리 필터 + 결과 목록(전체 영업 / 일부 영업 / 미확인 / 영업 안 함 구분) + 장소 상세(영업시간, 확인일, 확인 상태) + 배포
- **데이터:** Supabase 표 편집 화면 또는 SQL로 직접 입력. 사이트는 **읽기만** 가능하도록 RLS로 잠근다.
- **DB는 확장 가능하게:** `DB.md`의 핵심 테이블(카테고리·태그·장소·정기 영업시간·날짜별 예외)과 검색 함수를 그대로 만들고, 회원·제보·리뷰 테이블은 기능을 붙일 때 추가 마이그레이션으로 만든다.
- **이후 업데이트:** 회원·로그인(05), 신규·수정 제보(03·04), 리뷰·실제 영업 제보, 사진, 관리자 화면(06~11), CSV 일괄 등록, '정보 오래됨' 경고

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
- 검증: 새 대화에서 적용 규칙 확인 (핸드북 2.6, 2026-11-05) — `CLAUDE.md`, `docs/AGENTS.md`가 읽히고 `docs/PROGRESS.md`도 작업 전 확인 대상으로 인식됨

### 6. 핸드북 5단계 — 진행 중 (브랜치 `feat/stage5-setup`)

계획: 5-0 브랜치 → 5-1 Next.js 틀 → 5-2 Cloudflare 호환성 → 5-3 Supabase(직접) → 5-4 핵심 테이블 SQL → 5-5 검색 함수 → 5-6 네이버 지도

#### 5-0·5-1 브랜치와 Next.js 화면 틀 — 완료 (커밋 대기)

- 승인: 사용자 승인 (2026-11-05, "지도 빈칸으로 일단 만들어봐")
- 생성: `web/` (Next.js 16.4.5, React 19.3, TypeScript strict, App Router, ESLint, Tailwind 없음)
  - `src/app/globals.css` — DESIGN.md 토큰(Light/Dark, OS 설정 따름)과 공통 컴포넌트(.btn, .input, .chip)
  - `src/features/search/` — 왼쪽 400px 검색 패널(검색창, 특정 시각/시간 구간, 날짜, 18:00~익일 07:00 30분 슬라이더, 카테고리 칩 8개, 결과 없음 안내)
  - `src/features/map/` — 지도 자리 표시(격자 배경) + 비활성 '이 지역 검색' 버튼
  - 1024px 미만 미지원 안내
- 기타: 생성 도구의 예시 이미지 삭제, 루트 `.gitignore`에 `.env*.local` 추가. `web/AGENTS.md`는 Next.js가 자동 생성·재생성하는 파일이라 유지
- 검증: 타입 검사·린트·빌드 통과, 개발 서버 화면 확인(1440px Light/Dark, 900px 미지원 안내)
- 미검증: 슬라이더·구간 모드·칩 클릭 등 상호작용은 직접 조작해 보지 않음
- 남은 이슈: '현재 시각' 기본값 규칙 미확정 → 임시로 18:00 시작. 아이콘(Lucide)은 패키지 설치 승인 전이라 미사용. 테마 수동 전환·플로팅 메뉴는 시연 범위 밖
- 기록: 커밋 `a427ced`

#### 5-2 Cloudflare 호환성 확인 — 완료 (커밋 대기)

- 승인: 사용자 승인 (2026-11-05)
- 설치: `@opennextjs/cloudflare` 1.20.16 (Next.js 16.4.5를 지원하는 첫 버전), `wrangler` 4.151.0(개발용). npm 11의 설치 스크립트 차단으로 `workerd`·`esbuild` 설치 스크립트를 내용 확인 후 허용(`package.json` `allowScripts`)
- 설정: `open-next.config.ts`(추가 Cloudflare 자원 없이 최소 구성 — 템플릿의 R2 캐시·이미지 바인딩 제외), `wrangler.jsonc`(이름 `allnight`), 스크립트 `npm run preview` / `npm run deploy`
- **발견한 문제와 해결:** 생성 도구 기본값 `cacheComponents`·`partialPrefetching`을 켠 상태로는 Cloudflare 런타임에서 요청이 멈춰 500 오류 → 두 옵션을 끄자 정상. 이 서비스는 해당 기능이 필요 없음
- 검증: Cloudflare 런타임(wrangler 로컬)에서 `/` 200, 없는 주소 404, 런타임 오류 없음, 화면이 개발 서버와 동일. 타입 검사·린트(빌드 결과물 폴더 제외)·빌드 통과
- 미검증: 실제 Cloudflare 계정 배포 (10단계에서, 별도 승인)

## 다음 단계 후보

1. 핸드북 5단계 계획 제출 (2회차 최소 범위 포함)
2. 화면 직접 확인 (다크 모드·KO/EN 전환) — 데스크톱 전용이므로 모바일은 미지원 안내만 확인
