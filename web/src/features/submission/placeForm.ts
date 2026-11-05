import type { PlaceDetail } from "@/features/place/placeDetail";
import { emptyHours } from "./HoursEditor";
import type { HoursInput } from "./validate";

// 장소 정보 입력 폼의 상태 — 제보 폼과 관리자 장소 편집이 함께 쓴다

export type FormState = {
  name: string;
  category_id: string;
  address_full: string;
  address_detail: string;
  province: string;
  city_district: string;
  neighborhood: string;
  phone: string;
  website_url: string;
  tag_ids: string[];
  hours: HoursInput;
  memo: string;
};

export const EMPTY_FORM: FormState = {
  name: "",
  category_id: "",
  address_full: "",
  address_detail: "",
  province: "서울특별시",
  city_district: "",
  neighborhood: "",
  phone: "",
  website_url: "",
  tag_ids: [],
  hours: emptyHours(),
  memo: "",
};

// 현재 장소 정보로 폼을 채운다 (04 정보 수정 제보: 프리필)
export function formFromPlace(place: PlaceDetail): FormState {
  const hours = emptyHours();
  for (const day of place.place_regular_day_status) {
    hours[String(day.weekday)] = {
      status: day.status,
      intervals: [...day.place_regular_intervals]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((it) => ({ start: it.start_time.slice(0, 5), end: it.end_time.slice(0, 5), next_day: it.end_day_offset === 1 })),
    };
  }
  return {
    name: place.name,
    category_id: place.category_id,
    address_full: place.address_full,
    address_detail: place.address_detail ?? "",
    province: place.province,
    city_district: place.city_district,
    neighborhood: place.neighborhood ?? "",
    phone: place.phone ?? "",
    website_url: place.website_url ?? "",
    tag_ids: place.place_tags.map((t) => t.tag_id),
    hours,
    memo: "",
  };
}
