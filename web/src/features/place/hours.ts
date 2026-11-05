import type { DayStatus, Interval, PlaceDetail } from "./placeDetail";

export const WEEKDAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"] as const;

// "18:00:00" + 익일 → "18:00 ~ 익일 02:00"
export function formatInterval(interval: Interval): string {
  const start = interval.start_time.slice(0, 5);
  const end = interval.end_time.slice(0, 5);
  return `${start} ~ ${interval.end_day_offset === 1 ? "익일 " : ""}${end}`;
}

export function describeDay(status: DayStatus | undefined, intervals: Interval[]): string {
  switch (status) {
    case "open_24h":
      return "24시간 영업";
    case "closed":
      return "휴무";
    case "open":
      return [...intervals]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.start_time.localeCompare(b.start_time))
        .map(formatInterval)
        .join(", ");
    default:
      // 정보가 없으면 휴무로 추정하지 않는다
      return "영업정보 없음";
  }
}

// ISO 요일(1=월 … 7=일)
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function formatDateLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일(${WEEKDAY_NAMES[isoWeekday(date) - 1]})`;
}

// 오늘 실제로 적용되는 영업시간: 날짜별 예외가 있으면 예외, 없으면 정기 요일 (DB.md §3.6)
export function todaySummary(place: PlaceDetail, today: string): { text: string; isException: boolean } {
  const special = place.place_special_days.find((d) => d.local_date === today);
  if (special) {
    return { text: describeDay(special.status, special.place_special_intervals), isException: true };
  }
  const regular = place.place_regular_day_status.find((d) => d.weekday === isoWeekday(today));
  return { text: describeDay(regular?.status, regular?.place_regular_intervals ?? []), isException: false };
}
