-- =============================================================
-- ALLNIGHT 4 · 회원·제보·관리자 (docs/DB.md §3.1, §3.7, §3.11, §3.12, §7, §8.1~8.3)
-- 원칙
--  - 장소·영업시간 테이블은 지금처럼 사이트에서 "읽기 전용". 관리자 변경은 아래 관리자 함수로만 한다
--    (함수가 먼저 관리자인지 확인하고, 변경 전후 기록을 남긴다).
--  - 제보(submissions)는 사이트에서 직접 넣을 수 없다. Turnstile을 통과한 서버(API)만 넣는다 (§7.3).
--  - 회원은 자기 역할(role)을 바꿀 수 없다. 관리자 지정은 대시보드/SQL로만 한다.
-- =============================================================

-- 외부(사이트)에 노출되지 않는 내부 함수용 스키마
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -------------------------------------------------------------
-- 1) 회원 프로필 (§3.1) — 가입하면 자동 생성, 닉네임은 랜덤
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname varchar(40) not null unique,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 랜덤 닉네임 예: 새벽고양이482. 겹치면 다시 뽑는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text;
  v_try int := 0;
begin
  loop
    v_nickname :=
      (array['새벽','심야','한밤','별빛','달빛','야행','불빛','은하'])[1 + floor(random() * 8)::int]
      || (array['고양이','부엉이','여우','너구리','고래','토끼','늑대','다람쥐'])[1 + floor(random() * 8)::int]
      || (100 + floor(random() * 900))::int;
    exit when not exists (select 1 from public.profiles where nickname = v_nickname);
    v_try := v_try + 1;
    if v_try > 20 then
      v_nickname := v_nickname || substr(md5(random()::text), 1, 4);
      exit;
    end if;
  end loop;

  -- 역할은 항상 member로 시작한다 (§8.1)
  insert into public.profiles (id, nickname) values (new.id, v_nickname);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거 전용이라 사이트에서 직접 부를 수 없게 한다
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 관리자 여부. 프로필 표의 RLS를 거치지 않도록 정의자 권한으로 확인한다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- 회원이 바꿀 수 있는 칸은 닉네임뿐이다 (role 칸에는 수정 권한 자체가 없음)
grant update (nickname) on public.profiles to authenticated;

-- 회원은 자기 프로필을 본다. 관리자는 모두 본다.
create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- 회원은 자기 닉네임만 바꾼다
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -------------------------------------------------------------
-- 2) 제보 (§3.7)
-- proposed_data(JSON) 형식 — 신규 제보는 전체, 수정 제보는 "바꾸자고 한 칸만" 담는다:
--   name, category_id, address_full, address_road, address_detail, province, city_district,
--   neighborhood, phone, website_url, latitude, longitude,
--   hours: {"1": {"status": "open", "intervals": [{"start":"18:00","end":"02:00","next_day":true}]}, … "7": …}
--   tag_ids: ["uuid", …], memo: "제보자가 남긴 설명"
-- -------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_place', 'correction')),
  place_id uuid references public.places (id),
  proposed_data jsonb not null check (jsonb_typeof(proposed_data) = 'object'),
  status text not null default 'received'
    check (status in ('received', 'in_review', 'approved', 'rejected')),
  submitted_by uuid references public.profiles (id) on delete set null,
  guest_email text,
  previous_submission_id uuid references public.submissions (id),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  result_place_id uuid references public.places (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type = 'new_place' and place_id is null) or (type = 'correction' and place_id is not null)),
  check (status <> 'rejected' or btrim(coalesce(rejection_reason, '')) <> ''),
  check (status not in ('approved', 'rejected') or reviewed_at is not null)
);

create trigger submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

create index submissions_queue_idx on public.submissions (status, created_at desc);
create index submissions_place_idx on public.submissions (place_id, status);
create index submissions_author_idx on public.submissions (submitted_by, created_at desc);

alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
grant select on public.submissions to authenticated;

-- 회원은 자기 제보(처리 상태·반려 사유)만 본다. 관리자는 모두 본다. 넣기·고치기 정책은 없다.
create policy submissions_read_own on public.submissions
  for select to authenticated
  using (submitted_by = (select auth.uid()) or public.is_admin());

-- -------------------------------------------------------------
-- 3) 확인 이력 (§3.11)·변경 이력 (§3.12) — 관리자만 읽는다, 기록은 관리자 함수가 남긴다
-- -------------------------------------------------------------
create table public.verification_history (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id),
  previous_status text,
  new_status text not null,
  verified_by uuid references public.profiles (id) on delete set null,
  verification_method text,
  note text,
  created_at timestamptz not null default now()
);

create table public.place_change_history (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id),
  changed_by uuid references public.profiles (id) on delete set null,
  change_type text not null check (change_type in ('create', 'update', 'delete', 'restore')),
  before_data jsonb,
  after_data jsonb,
  source_submission_id uuid references public.submissions (id),
  created_at timestamptz not null default now()
);

create index verification_place_idx on public.verification_history (place_id, created_at desc);
create index changes_place_idx on public.place_change_history (place_id, created_at desc);

alter table public.verification_history enable row level security;
alter table public.place_change_history enable row level security;
revoke all on public.verification_history, public.place_change_history from anon, authenticated;
grant select on public.verification_history, public.place_change_history to authenticated;

create policy verification_history_admin_read on public.verification_history
  for select to authenticated using (public.is_admin());
create policy place_change_history_admin_read on public.place_change_history
  for select to authenticated using (public.is_admin());

-- -------------------------------------------------------------
-- 4) 관리자는 숨긴(삭제된) 장소와 그 영업시간도 본다 — 기존 공개 읽기 정책에 더해진다
-- -------------------------------------------------------------
create policy places_admin_read on public.places
  for select to authenticated using (public.is_admin());
create policy place_tags_admin_read on public.place_tags
  for select to authenticated using (public.is_admin());
create policy regular_day_status_admin_read on public.place_regular_day_status
  for select to authenticated using (public.is_admin());
create policy regular_intervals_admin_read on public.place_regular_intervals
  for select to authenticated using (public.is_admin());
create policy special_days_admin_read on public.place_special_days
  for select to authenticated using (public.is_admin());
create policy special_intervals_admin_read on public.place_special_intervals
  for select to authenticated using (public.is_admin());

-- -------------------------------------------------------------
-- 5) 내부 도우미 (사이트에서 직접 부를 수 없음)
-- -------------------------------------------------------------

-- 장소 하나의 현재 모습(기본 정보·요일별 영업시간·태그)을 JSON으로. 변경 이력용.
create or replace function private.place_snapshot(p_place_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'place', to_jsonb(pl) - 'location',
    'hours', coalesce((
      select jsonb_object_agg(d.weekday::text, jsonb_build_object(
        'status', d.status,
        'intervals', coalesce((
          select jsonb_agg(jsonb_build_object(
            'start', to_char(i.start_time, 'HH24:MI'),
            'end', to_char(i.end_time, 'HH24:MI'),
            'next_day', i.end_day_offset = 1
          ) order by i.sort_order, i.start_time)
          from public.place_regular_intervals i
          where i.place_id = d.place_id and i.weekday = d.weekday
        ), '[]'::jsonb)
      ))
      from public.place_regular_day_status d
      where d.place_id = pl.id
    ), '{}'::jsonb),
    'tag_ids', coalesce((
      select jsonb_agg(t.tag_id order by t.tag_id) from public.place_tags t where t.place_id = pl.id
    ), '[]'::jsonb)
  )
  from public.places pl
  where pl.id = p_place_id;
$$;

-- 요일별 영업시간을 통째로 바꾼다. 빠진 요일은 '미확인'으로 둔다(휴무로 추정하지 않음).
create or replace function private.replace_hours(p_place_id uuid, p_hours jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_day jsonb;
  v_status text;
  v_interval jsonb;
  v_order int;
begin
  if jsonb_typeof(p_hours) is distinct from 'object' then
    raise exception '영업시간 형식이 올바르지 않습니다.';
  end if;

  delete from public.place_regular_day_status where place_id = p_place_id; -- 구간도 함께 지워짐

  for wd in 1..7 loop
    v_day := p_hours -> wd::text;
    v_status := coalesce(v_day ->> 'status', 'unknown');
    if v_status not in ('unknown', 'closed', 'open', 'open_24h') then
      raise exception '영업 상태 값이 올바르지 않습니다: %', v_status;
    end if;

    insert into public.place_regular_day_status (place_id, weekday, status)
    values (p_place_id, wd, v_status);

    if v_status = 'open' then
      if jsonb_typeof(v_day -> 'intervals') is distinct from 'array'
         or jsonb_array_length(v_day -> 'intervals') = 0 then
        raise exception '영업하는 요일에는 영업 구간이 1개 이상 필요합니다.';
      end if;
      v_order := 0;
      for v_interval in select * from jsonb_array_elements(v_day -> 'intervals') loop
        -- 시각 형식·24시간 초과 여부는 테이블의 CHECK 제약이 다시 확인한다
        insert into public.place_regular_intervals
          (place_id, weekday, start_time, end_time, end_day_offset, sort_order)
        values (
          p_place_id, wd,
          (v_interval ->> 'start')::time,
          (v_interval ->> 'end')::time,
          case when coalesce((v_interval ->> 'next_day')::boolean, false) then 1 else 0 end,
          v_order
        );
        v_order := v_order + 1;
      end loop;
    end if;
  end loop;
end;
$$;

create or replace function private.replace_tags(p_place_id uuid, p_tag_ids jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.place_tags where place_id = p_place_id;
  insert into public.place_tags (place_id, tag_id)
  select p_place_id, value::uuid
  from jsonb_array_elements_text(coalesce(p_tag_ids, '[]'::jsonb))
  on conflict do nothing;
end;
$$;

-- 새 장소 만들기 (필수 칸이 빠지면 테이블 제약이 오류를 낸다)
create or replace function private.create_place(p_data jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.places (
    name, category_id, address_full, address_road, address_detail,
    province, city_district, neighborhood, latitude, longitude, phone, website_url
  ) values (
    p_data ->> 'name',
    (p_data ->> 'category_id')::uuid,
    p_data ->> 'address_full',
    p_data ->> 'address_road',
    p_data ->> 'address_detail',
    p_data ->> 'province',
    p_data ->> 'city_district',
    p_data ->> 'neighborhood',
    (p_data ->> 'latitude')::double precision,
    (p_data ->> 'longitude')::double precision,
    p_data ->> 'phone',
    p_data ->> 'website_url'
  )
  returning id into v_id;

  if p_data ? 'hours' then
    perform private.replace_hours(v_id, p_data -> 'hours');
  end if;
  if p_data ? 'tag_ids' then
    perform private.replace_tags(v_id, p_data -> 'tag_ids');
  end if;
  return v_id;
end;
$$;

-- 기존 장소에 "들어 있는 칸만" 반영한다 (§8.3: 제안한 필드만 바꾸고 나머지는 유지).
-- 칸이 있고 값이 null이면 비운다. 영업정보를 고쳐도 자동으로 '확인됨' 처리하지 않는다.
create or replace function private.apply_place_data(p_place_id uuid, p_data jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.places set
    name           = case when p_data ? 'name' then p_data ->> 'name' else name end,
    category_id    = case when p_data ? 'category_id' then (p_data ->> 'category_id')::uuid else category_id end,
    address_full   = case when p_data ? 'address_full' then p_data ->> 'address_full' else address_full end,
    address_road   = case when p_data ? 'address_road' then p_data ->> 'address_road' else address_road end,
    address_detail = case when p_data ? 'address_detail' then p_data ->> 'address_detail' else address_detail end,
    province       = case when p_data ? 'province' then p_data ->> 'province' else province end,
    city_district  = case when p_data ? 'city_district' then p_data ->> 'city_district' else city_district end,
    neighborhood   = case when p_data ? 'neighborhood' then p_data ->> 'neighborhood' else neighborhood end,
    latitude       = case when p_data ? 'latitude' then (p_data ->> 'latitude')::double precision else latitude end,
    longitude      = case when p_data ? 'longitude' then (p_data ->> 'longitude')::double precision else longitude end,
    phone          = case when p_data ? 'phone' then p_data ->> 'phone' else phone end,
    website_url    = case when p_data ? 'website_url' then p_data ->> 'website_url' else website_url end
  where id = p_place_id;

  if p_data ? 'hours' then
    perform private.replace_hours(p_place_id, p_data -> 'hours');
  end if;
  if p_data ? 'tag_ids' then
    perform private.replace_tags(p_place_id, p_data -> 'tag_ids');
  end if;
end;
$$;

create or replace function private.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 할 수 있는 작업입니다.' using errcode = '42501';
  end if;
end;
$$;

-- -------------------------------------------------------------
-- 6) 관리자 함수 — 사이트의 관리자 페이지가 부른다. 모두 맨 처음에 관리자 여부를 확인한다.
--    하나의 함수 = 하나의 트랜잭션이라 중간에 실패하면 전부 취소된다 (§8.2, §8.3).
-- -------------------------------------------------------------

-- 제보 승인: 신규면 장소를 만들고, 수정이면 제안한 칸만 반영한다.
-- 신규 제보는 지도 연결 전이라 좌표를 관리자가 승인할 때 넣는다.
create or replace function public.approve_submission(
  p_submission_id uuid,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.submissions;
  v_data jsonb;
  v_place_id uuid;
  v_before jsonb;
begin
  perform private.require_admin();

  -- 같은 제보를 두 관리자가 동시에 승인하지 못하게 잠근다
  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception '제보를 찾을 수 없습니다.';
  end if;
  if v_sub.status not in ('received', 'in_review') then
    raise exception '이미 처리된 제보입니다.';
  end if;

  v_data := v_sub.proposed_data - 'memo';
  if p_latitude is not null or p_longitude is not null then
    if p_latitude is null or p_longitude is null then
      raise exception '위도와 경도를 모두 입력해주세요.';
    end if;
    v_data := v_data || jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude);
  end if;

  if v_sub.type = 'new_place' then
    if not (v_data ? 'latitude' and v_data ? 'longitude') then
      raise exception '신규 장소는 위도·경도를 입력해야 승인할 수 있습니다.';
    end if;
    v_place_id := private.create_place(v_data);
    insert into public.place_change_history (place_id, changed_by, change_type, after_data, source_submission_id)
    values (v_place_id, auth.uid(), 'create', private.place_snapshot(v_place_id), v_sub.id);
  else
    v_place_id := v_sub.place_id;
    perform 1 from public.places where id = v_place_id and deleted_at is null for update;
    if not found then
      raise exception '대상 장소가 없거나 숨김 처리되었습니다.';
    end if;
    v_before := private.place_snapshot(v_place_id);
    perform private.apply_place_data(v_place_id, v_data);
    insert into public.place_change_history (place_id, changed_by, change_type, before_data, after_data, source_submission_id)
    values (v_place_id, auth.uid(), 'update', v_before, private.place_snapshot(v_place_id), v_sub.id);
  end if;

  update public.submissions
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), result_place_id = v_place_id
  where id = v_sub.id;

  return v_place_id;
end;
$$;

-- 제보 반려: 사유 필수
create or replace function public.reject_submission(p_submission_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception '반려 사유를 입력해주세요.';
  end if;

  update public.submissions
  set status = 'rejected', rejection_reason = btrim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id and status in ('received', 'in_review');
  if not found then
    raise exception '제보가 없거나 이미 처리되었습니다.';
  end if;
end;
$$;

-- 관리자가 장소를 직접 만들거나(p_place_id = null) 고친다
create or replace function public.admin_save_place(p_place_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_place_id uuid;
  v_before jsonb;
begin
  perform private.require_admin();

  if p_place_id is null then
    v_place_id := private.create_place(p_data);
    insert into public.place_change_history (place_id, changed_by, change_type, after_data)
    values (v_place_id, auth.uid(), 'create', private.place_snapshot(v_place_id));
  else
    perform 1 from public.places where id = p_place_id for update;
    if not found then
      raise exception '장소를 찾을 수 없습니다.';
    end if;
    v_place_id := p_place_id;
    v_before := private.place_snapshot(v_place_id);
    perform private.apply_place_data(v_place_id, p_data);
    insert into public.place_change_history (place_id, changed_by, change_type, before_data, after_data)
    values (v_place_id, auth.uid(), 'update', v_before, private.place_snapshot(v_place_id));
  end if;
  return v_place_id;
end;
$$;

-- "실제로 확인함": 관리자가 영업정보를 직접 확인했을 때만 확인일을 갱신한다 (§3.11)
create or replace function public.admin_mark_verified(
  p_place_id uuid,
  p_method text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev text;
begin
  perform private.require_admin();
  select verification_status into v_prev from public.places where id = p_place_id for update;
  if not found then
    raise exception '장소를 찾을 수 없습니다.';
  end if;

  update public.places set verification_status = 'verified', last_verified_at = now() where id = p_place_id;
  insert into public.verification_history (place_id, previous_status, new_status, verified_by, verification_method, note)
  values (p_place_id, v_prev, 'verified', auth.uid(), p_method, p_note);
end;
$$;

-- 장소 숨기기(소프트 삭제)·되살리기
create or replace function public.admin_set_place_hidden(p_place_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
begin
  perform private.require_admin();
  v_before := private.place_snapshot(p_place_id);
  if v_before is null then
    raise exception '장소를 찾을 수 없습니다.';
  end if;

  update public.places
  set deleted_at = case when p_hidden then now() else null end
  where id = p_place_id;
  insert into public.place_change_history (place_id, changed_by, change_type, before_data, after_data)
  values (p_place_id, auth.uid(), case when p_hidden then 'delete' else 'restore' end,
          v_before, private.place_snapshot(p_place_id));
end;
$$;

-- 관리자 함수는 로그인한 사용자만 부를 수 있고(그 안에서 다시 관리자 확인), 방문자는 부를 수 없다
revoke execute on function
  public.approve_submission(uuid, double precision, double precision),
  public.reject_submission(uuid, text),
  public.admin_save_place(uuid, jsonb),
  public.admin_mark_verified(uuid, text, text),
  public.admin_set_place_hidden(uuid, boolean)
from public, anon;

grant execute on function
  public.approve_submission(uuid, double precision, double precision),
  public.reject_submission(uuid, text),
  public.admin_save_place(uuid, jsonb),
  public.admin_mark_verified(uuid, text, text),
  public.admin_set_place_hidden(uuid, boolean)
to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
