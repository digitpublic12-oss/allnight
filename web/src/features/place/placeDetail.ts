import { db } from "@/lib/supabase";
import { toSearchWindow, type CoverageStatus, type TimeWindow } from "@/features/search/searchPlaces";

export type DayStatus = "unknown" | "closed" | "open" | "open_24h";

export type Interval = {
  start_time: string; // "HH:MM:SS"
  end_time: string;
  end_day_offset: 0 | 1;
  sort_order?: number;
};

export type PlaceDetail = {
  id: string;
  name: string;
  address_full: string;
  address_road: string | null;
  address_detail: string | null;
  province: string;
  city_district: string;
  neighborhood: string | null;
  category_id: string;
  phone: string | null;
  website_url: string | null;
  latitude: number;
  longitude: number;
  verification_status: "verified" | "needs_check" | "unverified";
  last_verified_at: string | null;
  categories: { name: string } | null;
  place_tags: { tag_id: string; tags: { name: string } | null }[];
  place_regular_day_status: { weekday: number; status: DayStatus; place_regular_intervals: Interval[] }[];
  place_special_days: { local_date: string; status: DayStatus; note: string | null; place_special_intervals: Interval[] }[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DETAIL_COLUMNS = `
  id, name, address_full, address_road, address_detail, province, city_district, neighborhood,
  category_id, phone, website_url, latitude, longitude, verification_status, last_verified_at,
  categories(name),
  place_tags(tag_id, tags(name)),
  place_regular_day_status(weekday, status, place_regular_intervals(start_time, end_time, end_day_offset, sort_order)),
  place_special_days(local_date, status, note, place_special_intervals(start_time, end_time, end_day_offset, sort_order))
`;

// 장소 하나를 영업시간·태그·오늘 이후 예외일과 함께 불러온다. 없거나 삭제된 장소면 null.
export async function fetchPlaceDetail(placeId: string, today: string): Promise<PlaceDetail | null> {
  // 형식이 틀린 ID는 DB 오류 대신 '장소 없음'으로 처리한다
  if (!UUID_PATTERN.test(placeId)) return null;

  const { data, error } = await db
    .from("places")
    .select(DETAIL_COLUMNS)
    .eq("id", placeId)
    .gte("place_special_days.local_date", today)
    .maybeSingle();
  if (error) throw error;
  return data as PlaceDetail | null;
}

// 선택한 시간에 이 장소가 어떤 상태인지는 목록과 같은 DB 함수로 판정한다 (화면에서 재계산하지 않음)
export async function fetchCoverage(placeId: string, window: TimeWindow): Promise<CoverageStatus> {
  const { startAt, endAt } = toSearchWindow(window);
  const { data, error } = await db.rpc("place_coverage", {
    p_place_id: placeId,
    p_start: startAt,
    p_end: endAt,
  });
  if (error) throw error;
  return (data as { coverage_status: CoverageStatus }[])[0].coverage_status;
}

export type TagRow = { id: string; name: string };

export async function fetchTags(): Promise<TagRow[]> {
  const { data, error } = await db.from("tags").select("id, name").order("sort_order");
  if (error) throw error;
  return data;
}
