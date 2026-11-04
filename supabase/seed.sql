-- =============================================================
-- ALLNIGHT 기초 데이터 (docs/DB.md §10: 카테고리·기본 태그는 seed로 관리)
-- + 개발 DB 전용 테스트 장소 5곳. 이름에 [테스트]가 붙은 가짜 장소이며 운영 DB에는 넣지 않는다.
-- 실행: 마이그레이션 1~3 실행 후 SQL Editor에서 Run
-- =============================================================

-- 표준 카테고리 8개 (PRD §5.4)
insert into public.categories (slug, name, sort_order) values
  ('food-cafe',      '음식·카페', 1),
  ('shopping-life',  '쇼핑·생활', 2),
  ('study-work',     '학습·업무', 3),
  ('medical',        '의료·응급', 4),
  ('leisure',        '여가·문화', 5),
  ('fitness',        '운동·건강', 6),
  ('transport',      '교통·이동', 7),
  ('etc',            '기타',      8);

-- 기본 태그 (관리자 정의 표준 태그 예시)
insert into public.tags (slug, name, tag_type, sort_order) values
  ('outlet',     '콘센트',        'facility',   1),
  ('wifi',       '와이파이',      'facility',   2),
  ('parking',    '주차 가능',     'facility',   3),
  ('laptop',     '노트북 작업',   'atmosphere', 4),
  ('quiet',      '조용한',        'atmosphere', 5);

-- 테스트 장소 5곳 (서울 마포구 홍대입구역 주변 좌표)
do $$
declare
  p uuid;
  wd smallint;
begin
  -- 1) 매일 18:00 ~ 익일 02:00 (자정 넘김), 확인됨
  insert into public.places (name, category_id, address_full, province, city_district, neighborhood,
                             latitude, longitude, verification_status, last_verified_at)
  values ('[테스트] 심야 카페', (select id from public.categories where slug = 'food-cafe'),
          '서울 마포구 양화로 160', '서울특별시', '마포구', '동교동',
          37.5573, 126.9245, 'verified', now() - interval '3 days')
  returning id into p;
  for wd in 1..7 loop
    insert into public.place_regular_day_status (place_id, weekday, status) values (p, wd, 'open');
    insert into public.place_regular_intervals (place_id, weekday, start_time, end_time, end_day_offset)
    values (p, wd, '18:00', '02:00', 1);
  end loop;
  insert into public.place_tags (place_id, tag_id)
  select p, id from public.tags where slug in ('outlet', 'wifi', 'laptop');

  -- 2) 연중무휴 24시간, 확인됨
  insert into public.places (name, category_id, address_full, province, city_district, neighborhood,
                             latitude, longitude, verification_status, last_verified_at)
  values ('[테스트] 24시 편의점', (select id from public.categories where slug = 'shopping-life'),
          '서울 마포구 와우산로 94', '서울특별시', '마포구', '서교동',
          37.5521, 126.9237, 'verified', now() - interval '10 days')
  returning id into p;
  for wd in 1..7 loop
    insert into public.place_regular_day_status (place_id, weekday, status) values (p, wd, 'open_24h');
  end loop;

  -- 3) 브레이크타임: 매일 11:00~15:00, 17:00~23:00, 확인 필요
  insert into public.places (name, category_id, address_full, province, city_district, neighborhood,
                             latitude, longitude, verification_status, last_verified_at)
  values ('[테스트] 브레이크타임 식당', (select id from public.categories where slug = 'food-cafe'),
          '서울 마포구 어울마당로 65', '서울특별시', '마포구', '서교동',
          37.5545, 126.9209, 'needs_check', now() - interval '20 days')
  returning id into p;
  for wd in 1..7 loop
    insert into public.place_regular_day_status (place_id, weekday, status) values (p, wd, 'open');
    insert into public.place_regular_intervals (place_id, weekday, start_time, end_time, sort_order)
    values (p, wd, '11:00', '15:00', 0), (p, wd, '17:00', '23:00', 1);
  end loop;

  -- 4) 영업정보 미확인: 요일 정보가 아예 없음 → 검색에서 unknown
  insert into public.places (name, category_id, address_full, province, city_district, neighborhood,
                             latitude, longitude, verification_status)
  values ('[테스트] 미확인 약국', (select id from public.categories where slug = 'medical'),
          '서울 마포구 홍익로 10', '서울특별시', '마포구', '서교동',
          37.5532, 126.9227, 'unverified');

  -- 5) 평일 09:00 ~ 익일 01:00, 주말 휴무, 2026-11-06(금) 임시 휴무.
  --    마지막 확인이 30일보다 오래됨 → '정보 오래됨' 표시 대상
  insert into public.places (name, category_id, address_full, province, city_district, neighborhood,
                             latitude, longitude, verification_status, last_verified_at)
  values ('[테스트] 스터디카페', (select id from public.categories where slug = 'study-work'),
          '서울 마포구 독막로 9', '서울특별시', '마포구', '합정동',
          37.5496, 126.9139, 'verified', '2026-09-01 12:00+09')
  returning id into p;
  for wd in 1..7 loop
    insert into public.place_regular_day_status (place_id, weekday, status)
    values (p, wd, case when wd <= 5 then 'open' else 'closed' end);
    if wd <= 5 then
      insert into public.place_regular_intervals (place_id, weekday, start_time, end_time, end_day_offset)
      values (p, wd, '09:00', '01:00', 1);
    end if;
  end loop;
  insert into public.place_special_days (place_id, local_date, status, note)
  values (p, '2026-11-06', 'closed', '내부 공사로 임시 휴무');
  insert into public.place_tags (place_id, tag_id)
  select p, id from public.tags where slug in ('outlet', 'quiet', 'laptop');
end $$;
