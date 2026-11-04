-- =============================================================
-- ALLNIGHT 3/3 · 심야 시간 검색 (docs/DB.md §4, §9)
-- 시간 판정은 브라우저가 아니라 DB에서 한다. 화면은 결과를 표시만 한다.
-- =============================================================

-- -------------------------------------------------------------
-- place_coverage: 장소 하나가 검색 구간 [p_start, p_end) 동안 어떤 상태인지 판정
--   full    : 구간의 모든 순간이 "확인된 영업 구간"으로 덮임
--   partial : 확인된 영업이 일부만 겹침
--   unknown : 확인된 영업은 겹치지 않지만, 구간 안에 미확인(unknown) 날이 있음
--   closed  : 확인된 비영업
-- overlap_minutes: 검색 구간과 실제 영업 구간이 겹치는 총 분 (partial 정렬용)
-- -------------------------------------------------------------
create or replace function public.place_coverage(
  p_place_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (coverage_status text, overlap_minutes integer)
language sql
stable
set search_path = ''
as $$
  with
  -- 1) 검색 구간에 닿을 수 있는 현지 날짜: 시작일 "전날"부터 종료일까지.
  --    전날 시작해 자정을 넘긴 영업을 놓치지 않기 위해 전날을 반드시 포함한다 (§4.1).
  days as (
    select (p_start at time zone 'Asia/Seoul')::date - 1 + i as local_date
    from generate_series(
      0,
      (p_end at time zone 'Asia/Seoul')::date - (p_start at time zone 'Asia/Seoul')::date + 1
    ) as i
  ),
  -- 2) 날짜마다 실제로 적용할 상태: 날짜별 예외가 있으면 예외, 없으면 정기 요일 상태.
  --    정기 요일 행이 없으면 unknown(미확인)으로 본다. 휴무로 추정하지 않는다.
  effective as (
    select
      dd.local_date,
      sd.id as special_day_id,
      coalesce(sd.status, rs.status, 'unknown') as status
    from days dd
    left join public.place_special_days sd
      on sd.place_id = p_place_id and sd.local_date = dd.local_date
    left join public.place_regular_day_status rs
      on sd.id is null
      and rs.place_id = p_place_id
      and rs.weekday = extract(isodow from dd.local_date)
  ),
  -- 3) 상태를 절대 시각 구간으로 펼친다. 시각은 모두 한국 시간 기준.
  spans as (
    -- 날짜별 예외의 영업 구간
    select 'open' as kind,
      tstzrange(
        (e.local_date + si.start_time) at time zone 'Asia/Seoul',
        ((e.local_date + si.end_day_offset) + si.end_time) at time zone 'Asia/Seoul'
      ) as span
    from effective e
    join public.place_special_intervals si on si.special_day_id = e.special_day_id
    where e.status = 'open'

    union all
    -- 정기 영업 구간 (예외가 없는 날만)
    select 'open',
      tstzrange(
        (e.local_date + ri.start_time) at time zone 'Asia/Seoul',
        ((e.local_date + ri.end_day_offset) + ri.end_time) at time zone 'Asia/Seoul'
      )
    from effective e
    join public.place_regular_intervals ri
      on e.special_day_id is null
      and ri.place_id = p_place_id
      and ri.weekday = extract(isodow from e.local_date)
    where e.status = 'open'

    union all
    -- 24시간 영업: 그날 00:00 ~ 다음 날 00:00
    -- 미확인: 그날 하루 전체를 "모름"으로 표시
    select case e.status when 'open_24h' then 'open' else 'unknown' end,
      tstzrange(
        e.local_date::timestamp at time zone 'Asia/Seoul',
        (e.local_date + 1)::timestamp at time zone 'Asia/Seoul'
      )
    from effective e
    where e.status in ('open_24h', 'unknown')
  ),
  -- 4) 영업 구간을 하나로 합친다(겹치거나 맞닿은 구간은 자동 병합) → 검색 구간과 교집합
  merged as (
    select
      tstzmultirange(tstzrange(p_start, p_end)) as wanted,
      coalesce(range_agg(span) filter (where kind = 'open'), '{}'::tstzmultirange)
        * tstzmultirange(tstzrange(p_start, p_end)) as covered,
      coalesce(bool_or(kind = 'unknown' and span && tstzrange(p_start, p_end)), false) as has_unknown
    from spans
  )
  -- 5) 판정
  select
    case
      when m.covered = m.wanted then 'full'
      when not isempty(m.covered) then 'partial'
      when m.has_unknown then 'unknown'
      else 'closed'
    end,
    coalesce((
      select sum(extract(epoch from upper(r) - lower(r)))::integer / 60
      from unnest(m.covered) as r
    ), 0)
  from merged m;
$$;

-- -------------------------------------------------------------
-- search_places: 지도·목록용 검색 (§4.3 정렬, §9 계약)
-- 그룹 순서 full → partial → unknown → closed.
--   full: 거리순 / partial: 겹치는 분 많은 순 → 거리순 / unknown·closed: 거리순 / 같으면 id 순
-- 지도 영역(bounds)과 중심점(center)은 선택값. 중심점이 없으면 거리 정렬 대신 id 순.
-- -------------------------------------------------------------
create or replace function public.search_places(
  p_start timestamptz,
  p_end timestamptz,
  p_category_ids uuid[] default null,
  p_query text default null,
  p_center_lat double precision default null,
  p_center_lng double precision default null,
  p_west double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_north double precision default null,
  p_limit integer default 200
)
returns table (
  id uuid,
  name text,
  category_id uuid,
  category_name text,
  address_full text,
  city_district text,
  neighborhood text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  coverage_status text,
  overlap_minutes integer,
  verification_status text,
  last_verified_at timestamptz,
  is_older_than_30_days boolean
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_start is null or p_end is null or p_end <= p_start then
    raise exception '검색 종료 시각은 시작 시각보다 늦어야 합니다.';
  end if;
  -- 계산량 제한 (§4.3 구현 제안)
  if p_end - p_start > interval '48 hours' then
    raise exception '검색 구간은 48시간을 넘을 수 없습니다.';
  end if;

  return query
  select
    p.id,
    p.name,
    p.category_id,
    c.name,
    p.address_full,
    p.city_district,
    p.neighborhood,
    p.latitude,
    p.longitude,
    case
      when p_center_lat is null or p_center_lng is null then null
      else extensions.st_distance(
        p.location,
        extensions.st_setsrid(extensions.st_makepoint(p_center_lng, p_center_lat), 4326)::extensions.geography
      )
    end as distance_meters,
    cov.coverage_status,
    cov.overlap_minutes,
    p.verification_status,
    p.last_verified_at,
    (p.last_verified_at is null or p.last_verified_at < now() - interval '30 days')
  from public.places p
  join public.categories c on c.id = p.category_id
  cross join lateral public.place_coverage(p.id, p_start, p_end) cov
  where p.deleted_at is null
    and (p_category_ids is null or cardinality(p_category_ids) = 0 or p.category_id = any (p_category_ids))
    and (p_query is null or btrim(p_query) = ''
         or p.name ilike '%' || btrim(p_query) || '%'
         or p.address_full ilike '%' || btrim(p_query) || '%')
    and (p_west is null or p.longitude between p_west and p_east)
    and (p_south is null or p.latitude between p_south and p_north)
  order by
    case cov.coverage_status when 'full' then 1 when 'partial' then 2 when 'unknown' then 3 else 4 end,
    case when cov.coverage_status = 'partial' then cov.overlap_minutes end desc nulls last,
    10 nulls last, -- 10번째 결과 열 = distance_meters
    p.id
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

-- 방문자도 검색할 수 있게 실행 권한을 준다. 함수는 호출자 권한으로 실행되므로 RLS(읽기 전용)가 그대로 적용된다.
grant execute on function public.place_coverage(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.search_places(
  timestamptz, timestamptz, uuid[], text,
  double precision, double precision, double precision, double precision, double precision, double precision,
  integer
) to anon, authenticated;
