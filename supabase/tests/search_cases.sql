-- =============================================================
-- 심야 시간 판정 필수 테스트 (docs/DB.md §4.4)
-- 실행: 마이그레이션 1~3과 seed.sql 실행 후 SQL Editor에서 Run.
-- 결과표의 pass 열이 모두 true면 통과. 테스트용 장소는 실행 중 만들었다가 끝에 지운다.
-- 날짜 기준: 2026-11-06 금, 11-07 토, 11-08 일, 11-09 월, 11-10 화, 11-11 수
-- =============================================================

drop table if exists pg_temp.case_results;
create temp table case_results (no int, case_name text, expected text, actual text, minutes int);

-- 테스트 장소 하나 만들기: 7개 요일을 모두 '확인된 휴무'로 시작한다
-- (DB.md 표의 "다른 구간 없을 때" 조건을 맞추기 위함)
create or replace function pg_temp.new_place() returns uuid
language plpgsql as $$
declare p uuid;
begin
  insert into public.places (name, category_id, address_full, province, city_district, latitude, longitude)
  values ('[자동 테스트]', (select id from public.categories where slug = 'etc'),
          '테스트', '테스트', '테스트', 37.55, 126.92)
  returning id into p;
  insert into public.place_regular_day_status (place_id, weekday, status)
  select p, wd, 'closed' from generate_series(1, 7) wd;
  return p;
end $$;

create or replace function pg_temp.set_day(p uuid, wd int, st text) returns void
language sql as $$
  update public.place_regular_day_status set status = st where place_id = p and weekday = wd;
$$;

create or replace function pg_temp.add_interval(p uuid, wd int, s time, e time, off int) returns void
language sql as $$
  insert into public.place_regular_intervals (place_id, weekday, start_time, end_time, end_day_offset)
  values (p, wd, s, e, off);
$$;

create or replace function pg_temp.check_case(n int, label text, p uuid, s timestamptz, e timestamptz, expected text)
returns void
language sql as $$
  insert into case_results
  select n, label, expected, c.coverage_status, c.overlap_minutes
  from public.place_coverage(p, s, e) c;
$$;

do $$
declare p uuid;
begin
  -- 1. 익일 종료: 금 18:00~토 02:00, 검색 토 00:30~01:30 → full
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 5, 'open');
  perform pg_temp.add_interval(p, 5, '18:00', '02:00', 1);
  perform pg_temp.check_case(1, '익일 종료', p, '2026-11-07 00:30+09', '2026-11-07 01:30+09', 'full');
  -- 2. 일부 겹침: 같은 장소, 검색 금 23:00~토 03:00 → partial (겹치는 시간 180분)
  perform pg_temp.check_case(2, '일부 겹침', p, '2026-11-06 23:00+09', '2026-11-07 03:00+09', 'partial');
  -- 3. 접점만 일치: 같은 장소, 검색 토 02:00~03:00 → closed
  perform pg_temp.check_case(3, '접점만 일치', p, '2026-11-07 02:00+09', '2026-11-07 03:00+09', 'closed');

  -- 4. 브레이크타임: 토 11~15, 17~23, 검색 토 14~18 → partial
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 6, 'open');
  perform pg_temp.add_interval(p, 6, '11:00', '15:00', 0);
  perform pg_temp.add_interval(p, 6, '17:00', '23:00', 0);
  perform pg_temp.check_case(4, '브레이크타임', p, '2026-11-07 14:00+09', '2026-11-07 18:00+09', 'partial');

  -- 5. 연중무휴: 매일 24시간, 검색 수 23:00~목 03:00 → full (날짜 경계에서 끊기지 않아야 함)
  p := pg_temp.new_place();
  update public.place_regular_day_status set status = 'open_24h' where place_id = p;
  perform pg_temp.check_case(5, '연중무휴', p, '2026-11-11 23:00+09', '2026-11-12 03:00+09', 'full');

  -- 6. 날짜별 휴무: 평소 월 24시간, 2026-11-09(월) 휴무, 검색 그 월 12~13 → closed
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 1, 'open_24h');
  insert into public.place_special_days (place_id, local_date, status) values (p, '2026-11-09', 'closed');
  perform pg_temp.check_case(6, '날짜별 휴무', p, '2026-11-09 12:00+09', '2026-11-09 13:00+09', 'closed');

  -- 7. 일부 정보 없음: 월 미확인, 검색 월 22~23 → unknown
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 1, 'unknown');
  perform pg_temp.check_case(7, '일부 정보 없음', p, '2026-11-09 22:00+09', '2026-11-09 23:00+09', 'unknown');

  -- 8. 전날 이어짐: 일 22:00~월 03:00, 월 휴무, 검색 월 01~02 → full
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 7, 'open');
  perform pg_temp.add_interval(p, 7, '22:00', '03:00', 1);
  perform pg_temp.check_case(8, '전날 이어짐', p, '2026-11-09 01:00+09', '2026-11-09 02:00+09', 'full');

  -- 9. 예외 우선: 화 18:00~익일 02:00, 2026-11-10(화)만 20~23, 검색 화 23:30~수 00:30 → closed
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 2, 'open');
  perform pg_temp.add_interval(p, 2, '18:00', '02:00', 1);
  with d as (
    insert into public.place_special_days (place_id, local_date, status)
    values (p, '2026-11-10', 'open') returning id
  )
  insert into public.place_special_intervals (special_day_id, start_time, end_time)
  select id, '20:00', '23:00' from d;
  perform pg_temp.check_case(9, '예외 우선', p, '2026-11-10 23:30+09', '2026-11-11 00:30+09', 'closed');

  -- 10. 복수 구간 병합: 월 18~22, 22~익일 02, 검색 월 21~화 01 → full (맞닿은 구간이 합쳐져야 함)
  p := pg_temp.new_place();
  perform pg_temp.set_day(p, 1, 'open');
  perform pg_temp.add_interval(p, 1, '18:00', '22:00', 0);
  perform pg_temp.add_interval(p, 1, '22:00', '02:00', 1);
  perform pg_temp.check_case(10, '복수 구간 병합', p, '2026-11-09 21:00+09', '2026-11-10 01:00+09', 'full');

  -- 테스트 장소 정리 (영업시간·예외는 연쇄 삭제됨)
  delete from public.places where name = '[자동 테스트]';
end $$;

-- 결과: pass가 모두 true여야 한다. 2번은 minutes = 180이어야 한다.
select
  no,
  case_name,
  expected,
  actual,
  minutes,
  (actual = expected and (no <> 2 or minutes = 180)) as pass
from case_results
order by no;
