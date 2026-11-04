-- =============================================================
-- ALLNIGHT 2/3 · 접근 규칙 (RLS) — docs/DB.md §7
-- 시연 범위: 사이트(방문자)는 "읽기만" 가능하다. 쓰기 정책을 하나도 만들지 않으므로
-- 사이트에서는 누구도 장소를 추가·수정·삭제할 수 없다.
-- 장소 입력은 Supabase 대시보드(Table Editor·SQL Editor)에서만 한다. 대시보드는 운영자 권한이라 RLS와 무관하다.
-- =============================================================

-- 1) 모든 테이블에 문지기(RLS)를 켠다. 켜는 순간 정책이 허락한 것 외에는 아무것도 안 된다.
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.places enable row level security;
alter table public.place_tags enable row level security;
alter table public.place_regular_day_status enable row level security;
alter table public.place_regular_intervals enable row level security;
alter table public.place_special_days enable row level security;
alter table public.place_special_intervals enable row level security;

-- 2) 방문자(anon)·로그인 사용자(authenticated)에게는 읽기 권한만 준다. 쓰기 권한은 명시적으로 뺀다.
revoke insert, update, delete, truncate on
  public.categories, public.tags, public.places, public.place_tags,
  public.place_regular_day_status, public.place_regular_intervals,
  public.place_special_days, public.place_special_intervals
from anon, authenticated;

grant select on
  public.categories, public.tags, public.places, public.place_tags,
  public.place_regular_day_status, public.place_regular_intervals,
  public.place_special_days, public.place_special_intervals
to anon, authenticated;

-- 3) 누구나 사용 중인 카테고리·태그를 본다
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (is_active);

create policy tags_public_read on public.tags
  for select to anon, authenticated
  using (is_active);

-- 4) 누구나 삭제되지 않은 장소를 본다
create policy places_public_read on public.places
  for select to anon, authenticated
  using (deleted_at is null);

-- 5) 장소에 딸린 태그·영업시간·예외는 "연결된 장소가 공개 상태일 때만" 본다 (§7.3)
create policy place_tags_public_read on public.place_tags
  for select to anon, authenticated
  using (exists (
    select 1 from public.places p where p.id = place_id and p.deleted_at is null
  ));

create policy regular_day_status_public_read on public.place_regular_day_status
  for select to anon, authenticated
  using (exists (
    select 1 from public.places p where p.id = place_id and p.deleted_at is null
  ));

create policy regular_intervals_public_read on public.place_regular_intervals
  for select to anon, authenticated
  using (exists (
    select 1 from public.places p where p.id = place_id and p.deleted_at is null
  ));

create policy special_days_public_read on public.place_special_days
  for select to anon, authenticated
  using (exists (
    select 1 from public.places p where p.id = place_id and p.deleted_at is null
  ));

create policy special_intervals_public_read on public.place_special_intervals
  for select to anon, authenticated
  using (exists (
    select 1
    from public.place_special_days d
    join public.places p on p.id = d.place_id
    where d.id = special_day_id and p.deleted_at is null
  ));
