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
- 기록: 커밋 `b648cb6`

#### 5-3 Supabase 프로젝트 — 완료 (키 입력 `.env.local`은 대기)

#### 5-4·5-5 핵심 테이블·접근 규칙·검색 함수 SQL — 완료

- 승인: 사용자 승인 (2026-11-05)
- 생성 파일 (Supabase SQL Editor에 순서대로 붙여넣어 실행):
  1. `supabase/migrations/20261105000001_core_tables.sql` — PostGIS, 카테고리·태그·장소·정기 영업시간·날짜별 예외 테이블, 인덱스
  2. `supabase/migrations/20261105000002_read_only_rls.sql` — 모든 테이블 RLS, 방문자 읽기 전용(쓰기 정책 없음)
  3. `supabase/migrations/20261105000003_search_places.sql` — `place_coverage`(장소 하나 판정), `search_places`(검색·정렬)
  4. `supabase/seed.sql` — 카테고리 8개, 기본 태그 5개, `[테스트]` 장소 5곳
  5. `supabase/tests/search_cases.sql` — DB.md §4.4 필수 사례 10개 자동 판정 (pass 열)
- `web/.env.example` — 필요한 설정 이름 (값은 사용자가 `.env.local`에 직접 입력)
- 설계 메모: 영업 구간 병합은 PostgreSQL 범위 타입(`tstzmultirange`)으로 처리. 요일 행이 없으면 미확인으로 취급
- 미루어 둔 것: 같은 날 구간끼리 겹침 검사(DB.md §6.2 트리거) — 지금은 대시보드 직접 입력이고 검색은 겹쳐도 병합되어 결과가 틀리지 않음. 관리자 화면을 만들 때 추가
- 검증: 개발용 Supabase에서 1→2→3→seed→tests 순서로 실행 (2026-11-05, 사용자 실행). **DB.md §4.4 필수 사례 10개 모두 pass**
- 기록: 커밋 `7f202bc`
- 실행 중 겪은 일: SQL Editor에 이전 파일 내용이 남은 채 실행해 "없음/이미 있음" 오류가 남 → 창을 비우고 파일 하나씩 실행하면 해결. Supabase가 ① 실행 전 "RLS 없는 테이블" 경고를 띄우는 것은 정상(RLS는 ②에서 설정)

## 다음 단계 후보

1. 핸드북 5단계 계획 제출 (2회차 최소 범위 포함)
2. 화면 직접 확인 (다크 모드·KO/EN 전환) — 데스크톱 전용이므로 모바일은 미지원 안내만 확인

### 7. 핸드북 7단계 (기능 페이지) — 진행 중

#### 7-1 검색 목록을 Supabase에 연결 — 완료 (커밋 `f58b61f`)

- 승인: 사용자 요청 (2026-11-05, "니가해줘")
- 설정: `web/.env.local`에 개발용 Supabase URL·publishable 키 입력 (Git 제외 확인)
- 설치: `@supabase/supabase-js` 2.118.0 (최신 2.119.0은 출시 하루 차라 3주 된 정식 버전 선택)
- 변경 파일: `web/src/lib/supabase.ts`(연결), `features/search/searchPlaces.ts`(카테고리 조회·검색 호출), `SearchResults.tsx`/`.module.css`(결과 4그룹·로딩·오류·결과 없음), `SearchPanel.tsx`(DB 카테고리 칩, 조작 250ms 후 자동 검색, Enter 검색어), `time.ts`(슬롯 → 한국 시각 ISO), `categories.ts` 삭제(DB가 기준)
- 동작 규칙: '특정 시각'은 그 시각부터 1분 구간으로 검색. 늦게 온 이전 응답은 버림
- 검증:
  - REST로 확인: 방문자 읽기 정상, 금 23:00 검색 결과가 예상과 일치, **방문자 쓰기 시도 거부(permission denied)**
  - 화면: 목 18:00 기본 검색에서 전체 영업 4 / 미확인 1, '정보 오래됨'·'확인 필요' 표시 확인
  - 타입 검사·린트·빌드 통과
- 미검증: 슬라이더·구간 모드·카테고리·검색어 조작 시 결과 변화는 직접 조작으로 확인 필요
- 보류: 방문자 삭제 시도 시험은 자동 안전장치가 실데이터 대량 삭제 위험으로 막아 실행하지 않음 → 9단계 점검에서 안전한 방식(존재하지 않는 id 대상)으로 진행

#### 7-2 장소 상세 패널 (`02_place_detail.md`, 시연 범위) — 완료 (커밋 대기)

- 승인: 사용자 요청 (2026-11-05, "딴거먼저하자" → 지도보다 상세 먼저)
- 만든 것: 뒤로가기(검색 조건·스크롤 유지), 카테고리·장소명, 선택 시간 영업 판정(DB `place_coverage` 사용), 검증 상태·마지막 확인일, 30일 초과 경고, 네이버 지도에서 보기(주소 검색 링크), 다가오는 날짜별 예외 안내, 오늘 영업시간(예외 우선), 주간 시간표(기본 접힘), 주소·복사, 전화·웹사이트(있을 때만), 태그, '장소를 찾을 수 없습니다'
- 주소: 목록에서 열면 `/place/ID`로 바뀌고 브라우저 뒤로가기로 목록 복귀. 상세 주소로 바로 들어오거나 새로고침해도 열림 (`src/app/place/[placeId]/page.tsx`, 공통 화면 `features/shell/AppShell.tsx`)
- 빼 둔 것(시연 범위 밖): 리뷰, 실제 영업 여부 제보, 정보 수정 제보, 대표 사진, 지도 핀 이동, '영업 여부 제보 있음'·'수정 제보 검토 중' 경고(관련 테이블 없음)
- 검증: 타입 검사·린트·빌드 통과. 화면 확인 — 스터디카페 상세(영업 중, 30일 경고, 11/6 임시 휴무 안내, 오늘 09:00~익일 01:00), 잘못된 ID → '장소를 찾을 수 없습니다'
- 미검증: 목록 클릭 → 상세 → 뒤로가기 흐름, 주간 시간표 펼치기, 주소 복사(직접 조작 필요). Cloudflare 미리보기에서 `/place/ID`(서버 렌더링 경로) 동작은 배포 전 확인

### 8. 핸드북 10단계 (배포) — 1차 완료

- 승인: 사용자 승인 (2026-11-05, "니가 올려봐 깃헙")
- 방식: 기존 GitHub ↔ Cloudflare Workers Builds 연결(서비스 이름 `allnight`) 그대로 사용. `main`에 올리면 자동 빌드·배포
- Cloudflare 설정(사용자가 대시보드에서 변경): Root directory `web`, Build `npx opennextjs-cloudflare build`, Deploy `npx opennextjs-cloudflare deploy`, Build 변수 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- 기록: `feat/stage5-setup`을 `main`에 fast-forward 후 push (`7ce94e3..9ac980e`). Workers Builds 결과 success, 사용자가 배포 주소에서 화면 확인
- 바뀐 점: 배포 주소의 화면이 옛 랜딩페이지 → 새 사이트(검색 화면). 랜딩페이지 파일(`index.html`, `css/`)은 저장소에 남아 있음
- 남은 것: 운영용 Supabase 분리(AGENTS.md §9, 지금은 개발 DB 사용), 네이버 지도 키 등록 시 배포 주소도 서비스 URL에 추가

### 9. 로그인·제보(회원/비회원)·관리자 페이지 — 진행 중 (브랜치 `feat/auth-submissions`)

- 승인: 사용자 승인 (2026-11-05). 계획 S1 DB → S2 로그인 → S3 제보(Turnstile) → S4 관리자 → S5 점검·배포
- 시연 범위 조정: 지도 없이 진행 — 제보는 주소를 글자로 받고, 신규 장소 좌표는 관리자가 승인할 때 입력

#### S1 DB (회원·제보·관리자) — 완료 (커밋 대기)

- 파일: `supabase/migrations/20261105000004_auth_submissions_admin.sql` (사용자가 SQL Editor에서 실행. Supabase 연결 도구의 직접 적용은 확인 창을 띄울 수 없어 자동 거절됨)
- 내용: `profiles`(가입 시 랜덤 닉네임 자동 생성, 회원은 닉네임만 수정 가능), `is_admin()`, `submissions`(사이트에서 직접 넣기 불가, 회원은 본인 것만 조회), `verification_history`·`place_change_history`(관리자만 조회), 관리자 함수 `approve_submission`·`reject_submission`·`admin_save_place`·`admin_mark_verified`·`admin_set_place_hidden`(모두 관리자 확인 후 실행, 변경 전후 기록). 장소 테이블은 여전히 사이트에서 읽기 전용
- 검증 (연결 도구로 읽기 조회 + 방문자 권한 REST 시험): 테이블 4개 RLS 켜짐, 가입 트리거 존재, 방문자 → 관리자 함수 호출 거부·제보함 직접 넣기 거부·회원 목록 조회 거부, 회원 → role 수정 권한 없음, 기존 검색 정상
- 보안 점검 경고 7건(로그인 사용자가 관리자 함수 호출 가능) — 의도된 것: 함수 안에서 관리자 여부를 다시 확인해 거부함. 관리자 승인 실제 동작은 S4에서 관리자 계정으로 시험

#### S2 로그인 — 완료

- 사전 설정(사용자): Supabase Auth의 Confirm email 끔 (실습 기간 한정, 공개 운영 시 다시 켜고 메일 서버 연결)
- 만든 것: `features/auth/AuthProvider.tsx`(앱 전체 로그인 상태·프로필·토스트, 로그인 후 원래 작업 이어가기 콜백), `AuthModal.tsx`(중앙 모달 로그인/회원가입 탭, ESC·배경·✕로 닫기, 포커스 복원, 05_auth_modal.md §4 오류 문구), `features/shell/TopMenu.tsx`(우측 상단 [로그인] / [닉네임 ▾ → 로그아웃], 관리자 링크 없음). 로그인 상태는 브라우저에 저장(새로고침 유지)
- 검증: 타입 검사·린트·빌드 통과. 사용자가 실제 가입·로그인 → `profiles`에 랜덤 닉네임(달빛부엉이225)·`member`로 자동 생성 확인(읽기 조회)
- 관리자 지정: 사용자가 SQL Editor에서 해당 계정 `role = 'admin'`으로 변경, 조회로 확인

#### S3 제보(회원·비회원) — 완료

- 사전 설정(사용자): Cloudflare Turnstile 위젯 생성(호스트 localhost·배포 도메인), `web/.env.local`에 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`·`TURNSTILE_SECRET_KEY`·`SUPABASE_SECRET_KEY`(서버 전용) 입력. 두 비밀값은 값 출력 없이 형식·실제 동작(읽기 요청, 가짜 토큰 확인)만 검사
- 만든 것
  - `app/api/submissions/route.ts` — 크기 제한 → Turnstile → 회원 토큰 확인 → 입력 검사 → 카테고리·태그·장소 존재 확인 → 회원 1시간 20건 제한 → `submissions` 저장(서버 전용 키). 공개 `places`에는 만들지 않음
  - `features/submission/validate.ts`(화면·서버 공용 입력 규칙, 허용 칸만 남김), `HoursEditor`(요일별 상태·구간, 24시간·월요일 복사, 자동 익일), `Turnstile`, `SubmissionPanel`(신규/수정 공용 폼, 유사 장소 안내, 수정은 바뀐 칸만 전송, 작성 중 이탈 확인, 오류 칸으로 이동), `MySubmissionsPanel`(회원 본인 제보 상태·반려 사유)
  - 주소: `/submit`, `/place/ID/correct`, `/my/submissions` (새로고침 지원). 우측 상단 [장소 제보], 계정 메뉴 '내 제보', 상세의 [정보 수정 제보]. `features/shell/navigation.ts`로 [뒤로]가 사이트 밖으로 나가지 않게 함
- 검증: 타입 검사·린트·빌드 통과. API에 잘못된 형식·과대 요청·Turnstile 없음·가짜 토큰 → 모두 거부, 제보함 0건 유지. 사용자 실제 제출 → 비회원 신규 제보 1건(전체 칸), 회원 수정 제보 1건(전화번호 칸만) 저장, 공개 장소 수 변화 없음(5곳)
- 남은 것: 주소 검색·좌표 자동 입력은 지도 연결 시. 비회원 요청 제한은 Turnstile에 의존(IP별 제한 없음)

#### S4 관리자 페이지 — 완료

- 만든 것 (`/admin`, 일반 화면에 링크 없음)
  - `features/admin/AdminShell.tsx` — 왼쪽 메뉴 셸. 비로그인 → 로그인 안내, 비관리자 → 접근 권한 없음 (실제 차단은 DB)
  - `Dashboard.tsx` — 대기 제보(신규·수정)·공개 장소·확인됨·정보 오래됨·숨김 수, 먼저 처리할 제보
  - `SubmissionsReview.tsx` — 신규/정보 수정/처리 완료 탭, 상세 패널, 수정 제보는 현재값↔제안값 비교, 신규는 좌표(위도, 경도) 붙여넣기 후 승인, 반려 사유 필수
  - `PlacesTable.tsx` — 검색, 숨김 포함, 실제로 확인함(확인일 갱신), 숨기기·되살리기
  - `PlaceEditor.tsx` — 신규 등록·편집(기본정보·좌표·요일별 영업시간·태그), 확인일 갱신 버튼
  - 공용: `adminData.ts`(조회·RPC), `format.ts`, `submission/placeForm.ts`(제보 폼과 공유하는 폼 상태)
- 좌표: 지도 키가 없어 구글 지도 우클릭 좌표 복사 방법을 화면에 안내
- 검증: 타입 검사·린트·빌드 통과. 비로그인 `/admin` → 로그인 안내 화면. 비관리자 회원으로 가장해 승인 함수 호출 → "관리자만 할 수 있는 작업입니다" 거부(트랜잭션 롤백). 사용자 실제 승인 → 수정 제보는 전화번호 칸만 반영·검증 상태 유지, 신규 제보는 공개 장소로 생성(좌표·위치·7개 요일 저장, 미확인), 변경 이력 2건 기록
- 미검증: 실제로 확인함, 숨기기·되살리기, 장소 편집 저장, 반려 (S5에서 확인)
- 제외: 날짜별 예외 편집, 사진, 리뷰·카테고리·태그 관리 화면

#### S5 점검·배포 — 진행 중

- 기능 시험(사용자): 실제로 확인함·숨기기·반려 확인. 되살리기·편집 저장은 미검증 ("(테스트)" 장소는 숨김 상태로 남아 있음)
- 보안 시험: 방문자 11개·회원 10개 모두 막힘, 제보 API 거부 시험 통과 → `docs/TEST.md` (핸드북 9단계 산출물)
- Cloudflare 실행 확인: OpenNext 빌드 성공(12개 경로), wrangler 로컬 실행에서 페이지 5개 200·제보 API 정상 응답
- Cloudflare 설정 (Claude가 `wrangler login` 후 진행, 사용자 브라우저 승인)
  - 비밀값 `TURNSTILE_SECRET_KEY`·`SUPABASE_SECRET_KEY`를 Worker Secret으로 등록 (값은 화면·채팅에 출력하지 않음)
  - 공개값 3개는 `web/.env.production`에 넣어 저장소로 관리 (대시보드 Builds 변수에 의존하지 않음)
  - Turnstile 위젯 허용 주소 확인: `allnight.digitpublic12.workers.dev`, `localhost`
- 배포 주소: https://allnight.digitpublic12.workers.dev
