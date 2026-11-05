// 제보 입력 검사 — 화면(미리 안내)과 서버(최종 판단)가 같은 규칙을 쓴다.
// 결과 형식은 supabase/migrations/..._auth_submissions_admin.sql 의 proposed_data 와 같다.

export type DayStatus = "unknown" | "closed" | "open" | "open_24h";
export type IntervalInput = { start: string; end: string; next_day: boolean };
export type DayInput = { status: DayStatus; intervals: IntervalInput[] };
/** 키 "1"(월) ~ "7"(일) */
export type HoursInput = Record<string, DayInput>;

export type ProposedData = {
  name?: string;
  category_id?: string;
  address_full?: string;
  address_detail?: string | null;
  province?: string;
  city_district?: string;
  neighborhood?: string | null;
  phone?: string | null;
  website_url?: string | null;
  tag_ids?: string[];
  hours?: HoursInput;
  memo?: string;
};

export type SubmissionType = "new_place" | "correction";

export const PROVINCES = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시",
  "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도",
  "전라남도", "경상북도", "경상남도", "제주특별자치도",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-() ]{4,30}$/;
const STATUSES: DayStatus[] = ["unknown", "closed", "open", "open_24h"];
const MAX_INTERVALS = 4;

export type FieldErrors = Partial<Record<keyof ProposedData | "guest_email" | "form", string>>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// 종료 시각이 시작 시각보다 이르거나 같으면 다음 날 끝나는 것으로 본다 (예: 18:00 ~ 02:00)
export function isNextDay(start: string, end: string): boolean {
  return end <= start;
}

function checkHours(value: unknown): { hours?: HoursInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "요일별 영업시간을 입력해주세요." };
  const hours: HoursInput = {};
  for (let wd = 1; wd <= 7; wd++) {
    const day = (value as Record<string, unknown>)[String(wd)] as Partial<DayInput> | undefined;
    const status = day?.status;
    if (!status || !STATUSES.includes(status)) return { error: "모든 요일의 영업 상태를 골라주세요. 모르면 '잘 모름'을 고르면 됩니다." };
    if (status !== "open") {
      hours[String(wd)] = { status, intervals: [] };
      continue;
    }
    const intervals = Array.isArray(day.intervals) ? day.intervals : [];
    if (intervals.length === 0 || intervals.length > MAX_INTERVALS) {
      return { error: `영업하는 요일에는 영업 구간을 1~${MAX_INTERVALS}개 입력해주세요.` };
    }
    const cleaned: IntervalInput[] = [];
    for (const it of intervals) {
      const start = text(it?.start);
      const end = text(it?.end);
      if (!TIME.test(start) || !TIME.test(end)) return { error: "영업 시작·종료 시각을 모두 입력해주세요." };
      if (start === end) return { error: "시작 시각과 종료 시각이 같습니다. 24시간 영업이면 '24시간'을 고르세요." };
      cleaned.push({ start, end, next_day: isNextDay(start, end) });
    }
    hours[String(wd)] = { status, intervals: cleaned };
  }
  return { hours };
}

/**
 * 입력을 검사하고, 허용된 칸만 남긴 깨끗한 데이터를 돌려준다.
 * 신규 제보는 필수 칸이 모두 있어야 하고, 수정 제보는 바꾸려는 칸만 들어 있으면 된다.
 */
export function validateProposed(
  type: SubmissionType,
  raw: unknown,
): { data: ProposedData; errors: FieldErrors } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const has = (key: string) => type === "new_place" || key in input;
  const data: ProposedData = {};
  const errors: FieldErrors = {};

  if (has("name")) {
    const name = text(input.name);
    if (!name) errors.name = "장소명을 입력해주세요.";
    else if (name.length > 80) errors.name = "장소명은 80자 이내로 입력해주세요.";
    else data.name = name;
  }
  if (has("category_id")) {
    const id = text(input.category_id);
    if (!UUID.test(id)) errors.category_id = "카테고리를 하나 골라주세요.";
    else data.category_id = id;
  }
  if (has("address_full")) {
    const address = text(input.address_full);
    if (!address) errors.address_full = "주소를 입력해주세요.";
    else if (address.length > 200) errors.address_full = "주소가 너무 깁니다.";
    else data.address_full = address;
  }
  if (has("province")) {
    const province = text(input.province);
    if (!(PROVINCES as readonly string[]).includes(province)) errors.province = "시·도를 골라주세요.";
    else data.province = province;
  }
  if (has("city_district")) {
    const city = text(input.city_district);
    if (!city) errors.city_district = "시·군·구를 입력해주세요. (예: 마포구)";
    else if (city.length > 40) errors.city_district = "시·군·구가 너무 깁니다.";
    else data.city_district = city;
  }
  if ("neighborhood" in input) {
    const v = text(input.neighborhood);
    if (v.length > 40) errors.neighborhood = "읍·면·동이 너무 깁니다.";
    else data.neighborhood = v || null;
  }
  if ("address_detail" in input) {
    const v = text(input.address_detail);
    if (v.length > 100) errors.address_detail = "상세 주소가 너무 깁니다.";
    else data.address_detail = v || null;
  }
  if ("phone" in input) {
    const v = text(input.phone);
    if (v && !PHONE.test(v)) errors.phone = "전화번호는 숫자와 - 로 입력해주세요.";
    else data.phone = v || null;
  }
  if ("website_url" in input) {
    const v = text(input.website_url);
    if (v && (!/^https?:\/\//i.test(v) || v.length > 300)) errors.website_url = "웹사이트는 https:// 로 시작하는 주소로 입력해주세요.";
    else data.website_url = v || null;
  }
  if ("tag_ids" in input) {
    const ids = Array.isArray(input.tag_ids) ? input.tag_ids : [];
    if (ids.length > 10 || !ids.every((id) => typeof id === "string" && UUID.test(id))) errors.tag_ids = "태그 선택이 올바르지 않습니다.";
    else data.tag_ids = [...new Set(ids as string[])];
  }
  if (has("hours")) {
    const { hours, error } = checkHours(input.hours);
    if (error) errors.hours = error;
    else data.hours = hours;
  }
  if ("memo" in input) {
    const memo = text(input.memo);
    if (memo.length > 1000) errors.memo = "메모는 1000자 이내로 입력해주세요.";
    else if (memo) data.memo = memo;
  }

  if (type === "correction" && Object.keys(data).filter((k) => k !== "memo").length === 0 && Object.keys(errors).length === 0) {
    errors.form = "바뀐 내용이 없습니다. 고칠 정보를 수정한 뒤 제출해주세요.";
  }
  return { data, errors };
}

export function validateGuestEmail(raw: unknown): { email: string | null; error?: string } {
  const email = text(raw);
  if (!email) return { email: null };
  if (email.length > 200 || !EMAIL.test(email)) return { email: null, error: "이메일 형식이 올바르지 않습니다." };
  return { email };
}
