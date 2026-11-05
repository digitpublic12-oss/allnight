import { db } from "@/lib/supabase";
import { slotToIso } from "./time";

export type CoverageStatus = "full" | "partial" | "unknown" | "closed";

// supabase/migrations/..._search_places.sql 의 search_places 반환 열과 같다
export type PlaceResult = {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  address_full: string;
  city_district: string;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
  coverage_status: CoverageStatus;
  overlap_minutes: number;
  verification_status: "verified" | "needs_check" | "unverified";
  last_verified_at: string | null;
  is_older_than_30_days: boolean;
};

export type CategoryRow = { id: string; name: string };

export type SearchInput = {
  date: string;
  mode: "point" | "range";
  start: number;
  end: number;
  categoryIds: string[];
  query: string;
};

export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await db
    .from("categories")
    .select("id, name")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function searchPlaces(input: SearchInput): Promise<PlaceResult[]> {
  const startAt = slotToIso(input.date, input.start);
  // '특정 시각'은 그 시각부터 1분 구간으로 묻는다. DB는 [시작, 종료) 구간만 받기 때문.
  const endAt =
    input.mode === "range"
      ? slotToIso(input.date, input.end)
      : new Date(new Date(startAt).getTime() + 60_000).toISOString();

  const { data, error } = await db.rpc("search_places", {
    p_start: startAt,
    p_end: endAt,
    p_category_ids: input.categoryIds.length > 0 ? input.categoryIds : null,
    p_query: input.query.trim() || null,
  });
  if (error) throw error;
  return data as PlaceResult[];
}
