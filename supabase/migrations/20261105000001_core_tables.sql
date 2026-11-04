-- =============================================================
-- ALLNIGHT 1/3 · 핵심 테이블 (docs/DB.md §2, §3.2~3.6, §6)
-- 시연 범위: 카테고리·태그·장소·정기 영업시간·날짜별 예외.
-- 회원·제보·리뷰·사진·이력 테이블은 기능을 붙일 때 별도 마이그레이션으로 추가한다.
-- 실행: Supabase SQL Editor에 붙여넣고 Run (1 → 2 → 3 순서)
-- =============================================================

-- 위치 검색용 PostGIS. Supabase 권장대로 extensions 스키마에 설치한다.
create extension if not exists postgis with schema extensions;

-- 수정 시각(updated_at) 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- 카테고리: 장소당 정확히 하나 (§3.2)
-- -------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- -------------------------------------------------------------
-- 표준 태그: 관리자만 만든다 (§3.3)
-- -------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tag_type text not null check (tag_type in ('facility', 'atmosphere')),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- -------------------------------------------------------------
-- 장소 (§3.4). deleted_at이 있으면 공개하지 않는다(소프트 삭제).
-- -------------------------------------------------------------
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  category_id uuid not null references public.categories (id),
  address_full text not null,
  address_road text,
  address_detail text,
  province text not null,
  city_district text not null,
  neighborhood text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography (Point, 4326),
  naver_place_id text,
  phone text,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  verification_status text not null default 'unverified'
    check (verification_status in ('verified', 'needs_check', 'unverified')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- location은 위도·경도에서 자동으로 만든다. ST_MakePoint는 (경도, 위도) 순서임에 주의.
create or replace function public.sync_place_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.location := extensions.st_setsrid(
    extensions.st_makepoint(new.longitude, new.latitude), 4326
  )::extensions.geography;
  return new;
end;
$$;

create trigger places_sync_location
  before insert or update of latitude, longitude on public.places
  for each row execute function public.sync_place_location();

create trigger places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create table public.place_tags (
  place_id uuid not null references public.places (id) on delete cascade,
  tag_id uuid not null references public.tags (id),
  primary key (place_id, tag_id)
);

-- -------------------------------------------------------------
-- 정기 영업시간 (§3.5)
-- weekday: ISO 1(월)~7(일). 구간의 요일 = 영업이 "시작"되는 날.
-- status: unknown(미확인, 휴무 아님) / closed(확인된 휴무) / open(구간 1개 이상) / open_24h
-- 요일 행이 아예 없으면 검색에서는 unknown으로 취급한다.
-- -------------------------------------------------------------
create table public.place_regular_day_status (
  place_id uuid not null references public.places (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  status text not null check (status in ('unknown', 'closed', 'open', 'open_24h')),
  updated_at timestamptz not null default now(),
  primary key (place_id, weekday)
);

create trigger regular_day_status_updated_at
  before update on public.place_regular_day_status
  for each row execute function public.set_updated_at();

-- 구간 규칙: 당일 종료(end_day_offset=0)면 종료 > 시작,
-- 익일 종료(=1)면 종료 <= 시작 (그래야 24시간을 넘지 않는다). 24시간 영업은 open_24h로 표현.
create table public.place_regular_intervals (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  end_day_offset smallint not null default 0 check (end_day_offset in (0, 1)),
  sort_order smallint not null default 0,
  foreign key (place_id, weekday)
    references public.place_regular_day_status (place_id, weekday) on delete cascade,
  check (
    (end_day_offset = 0 and end_time > start_time)
    or (end_day_offset = 1 and end_time <= start_time)
  )
);

-- -------------------------------------------------------------
-- 날짜별 예외 (§3.6): 그 날짜의 정기 영업시간 "전체"를 대체한다.
-- 전날 시작해 이 날 새벽까지 이어지는 구간은 지우지 않는다.
-- -------------------------------------------------------------
create table public.place_special_days (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  local_date date not null,
  status text not null check (status in ('unknown', 'closed', 'open', 'open_24h')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, local_date)
);

create trigger special_days_updated_at
  before update on public.place_special_days
  for each row execute function public.set_updated_at();

create table public.place_special_intervals (
  id uuid primary key default gen_random_uuid(),
  special_day_id uuid not null references public.place_special_days (id) on delete cascade,
  start_time time not null,
  end_time time not null,
  end_day_offset smallint not null default 0 check (end_day_offset in (0, 1)),
  sort_order smallint not null default 0,
  check (
    (end_day_offset = 0 and end_time > start_time)
    or (end_day_offset = 1 and end_time <= start_time)
  )
);

-- -------------------------------------------------------------
-- 인덱스 (§6.1 중 시연 범위 테이블). FK 컬럼은 자동 인덱스가 없어 직접 만든다.
-- -------------------------------------------------------------
create index places_location_gix on public.places using gist (location) where deleted_at is null;
create index places_category_live_idx on public.places (category_id) where deleted_at is null;
create index places_region_live_idx on public.places (province, city_district) where deleted_at is null;
create index place_tags_tag_idx on public.place_tags (tag_id, place_id);
create index regular_intervals_lookup_idx on public.place_regular_intervals (place_id, weekday);
create index special_days_lookup_idx on public.place_special_days (place_id, local_date);
create index special_intervals_day_idx on public.place_special_intervals (special_day_id);
