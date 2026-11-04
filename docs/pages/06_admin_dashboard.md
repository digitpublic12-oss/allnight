# 페이지 명세: 관리자 대시보드 (`/admin`)

> 경로: `/admin`  
> 상태: [MVP] 1차 구현 대상  
> 대상 플랫폼: 데스크톱 웹 (데스크톱 최적화)  
> 레이아웃: 별도 관리자 셸 (왼쪽 사이드바 메뉴 + 우측 컨텐츠 영역, 지도 중심 아님)

---

## 1. 페이지 목적 및 접근 권한

### 1.1 페이지 목적
- Allnight 플랫폼의 전체 등록 장소 수, 승인 대기 제보, 오류 제보, 검증 필요 장소 등 운영 지표를 한눈에 파악한다.
- 긴급한 검토가 필요한 제보 및 최근 활동을 신속히 확인하고 세부 관리 화면으로 이동하는 운영 관제탑 역할을 수행한다.

### 1.2 접근 권한
- **관리자 전용 (`profiles.role = 'admin'`)**
- **일반 사용자 화면 비노출**: 일반 사용자 UI(플로팅 메뉴 등)에는 관리자 링크가 일체 노출되지 않으며, `/admin` URL 직접 입력을 통해서만 접근한다.
- **권한 검증 절차**:
  1. 비로그인 접근 시: 관리자 로그인 모달/화면으로 유도.
  2. 로그인 완료 후: Supabase Auth 세션의 `profiles.role` 검증 (서버 측 및 DB RLS).
  3. `role !== 'admin'`인 일반 회원이 접근 시: **접근 권한 없음 (403 Forbidden)** 화면 표시 및 메인 지도로 돌아가기 버튼 제공.

---

## 2. UI 구성과 사용자 동작

### 2.1 관리자 공통 셸 레이아웃 (SITEMAP.md §9, DESIGN.md §11)
- **왼쪽 사이드바 내비게이션**:
  - 로고: `Allnight Admin`
  - 메뉴 목록:
    1. **운영 현황 (대시보드)** (`/admin`) — [현재 활성]
    2. **장소 관리** (`/admin/places`)
    3. **제보 승인** (`/admin/submissions`)
    4. **리뷰 관리** (`/admin/reviews`)
    5. **카테고리·태그 관리** (`/admin/taxonomy`)
    - *주의: 일반 회원 관리 메뉴는 범위에서 제외됨.*
  - 하단: 관리자 프로필, [서비스 메인으로 나가기] 링크, [로그아웃] 버튼.
- **우측 컨텐츠 헤더**:
  - 현재 페이지 타이틀: `"운영 현황 대시보드"`
  - 현재 기준 일시 (Asia/Seoul)

### 2.2 핵심 운영 통계 카드 (Metrics Cards)
- 4~6개의 컴팩트한 통계 요약 카드:
  1. **총 등록 장소**: 전체 활성 장소 수 (`deleted_at IS NULL`).
  2. **신규 장소 승인 대기**: 신규 제보 미처리 건수 (클릭 시 제보 승인 > 신규 탭으로 이동).
  3. **정보 수정 승인 대기**: 수정 제보 미처리 건수 (클릭 시 제보 승인 > 정보수정 탭으로 이동).
  4. **영업 불일치 제보 미해결**: '문 닫음' 제보 미확인 건수.
  5. **30일 초과 정보 오래됨 장소**: 마지막 실확인일로부터 30일 초과된 장소 수.
  6. **누적 등록 리뷰**: 전체 활성 리뷰 수.

### 2.3 빠른 작업 바로가기 (Quick Actions)
- 대시보드 우측 상단 액션 버튼 그룹:
  - **[+ 신규 장소 직접 등록]**: 장소 신규 등록 화면(`/admin/places/new`)으로 이동.
  - **[CSV 일괄 등록]**: CSV 대량 임포트 화면/모달 오픈.

### 2.4 최근 접수된 제보 대기열 (Pending Submissions Queue)
- 대시보드 하단에 최근 접수된 승인 대기 제보 5~10건 목록 표시:
  - 컬럼: 제보 유형(신규/수정), 대상 장소명, 제보자(회원/비회원), 접수 일시, 액션([검토하기]).
  - [검토하기] 클릭 시 해당 제보 승인 상세 화면으로 즉시 이동.
  - 대기 중인 제보가 없을 때: `"현재 대기 중인 제보가 없습니다."` 표시.

---

## 3. DB 연동 및 API

### 3.1 호출 API
- `GET /api/admin/metrics` (관리자 전용)
  - 통계 데이터 집계 쿼리:
    - `places_count`: `COUNT(*) FROM places WHERE deleted_at IS NULL`
    - `pending_new_submissions`: `COUNT(*) FROM submissions WHERE type = 'new_place' AND status = 'received'`
    - `pending_corrections`: `COUNT(*) FROM submissions WHERE type = 'correction' AND status = 'received'`
    - `unresolved_opening_reports`: `COUNT(*) FROM opening_reports WHERE resolution IS NULL`
    - `stale_places_count`: `COUNT(*) FROM places WHERE deleted_at IS NULL AND (last_verified_at IS NULL OR last_verified_at < now() - interval '30 days')`
- `GET /api/admin/submissions?status=received&limit=5`
  - 최근 대기 제보 목록 조회.

### 3.2 보안 및 RLS 검증
- 모든 관리자 API는 서버에서 `auth.uid()`의 `profiles.role = 'admin'` 여부를 신뢰할 수 있는 방식으로 검증.
- JWT 클라이언트 클레임만을 신뢰하지 않고 DB의 `is_admin()` 함수를 실행.

---

## 4. 예외 상태 (Error States)

### 4.1 비로그인 또는 비관리자 접근 시도 (403 Forbidden)
- 로그인하지 않은 사용자가 `/admin` 진입 시: 관리자 로그인 페이지로 리다이렉트.
- `role = 'member'`인 일반 사용자가 `/admin` 진입 시:
  - 안내 문구: `"접근 권한이 없습니다. 관리자 계정으로 로그인해주세요."`
  - 액션: **[메인 서비스로 돌아가기]** 버튼 제공.

### 4.2 통계 집계 실패
- DB 쿼리 오류 발생 시 통계 카드에 로딩 스켈레톤 대신 `"-"` 및 인라인 재시도 버튼 노출.

---

## 5. 완료 조건 (Acceptance Criteria)

1. [ ] `/admin` 접근 시 관리자 권한(`profiles.role = 'admin'`) 검증이 정상 수행된다.
2. [ ] 권한이 없는 사용자는 403 권한 없음 화면으로 차단되고 일반 메뉴에는 관리자 링크가 일체 노출되지 않는다.
3. [ ] 관리자 전용 셸 레이아웃(좌측 사이드바)과 대시보드 통계 카드가 실제 DB 집계값을 반영해 정상 표시된다.
4. [ ] 신규/수정 승인 대기 건수와 30일 초과 정보 오래됨 장소 수가 정확히 계산된다.
5. [ ] 최근 접수 대기 목록에서 [검토하기] 클릭 시 해당 제보 승인 화면으로 정상 이동한다.
