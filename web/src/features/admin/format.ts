import type { DayInput, HoursInput } from "@/features/submission/validate";

export const WEEKDAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];

export const VERIFICATION_LABEL = {
  verified: "확인됨",
  needs_check: "확인 필요",
  unverified: "미확인",
} as const;

export const SUBMISSION_STATUS_LABEL = {
  received: "접수됨",
  in_review: "검토 중",
  approved: "승인",
  rejected: "반려",
} as const;

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatDay(day: DayInput | undefined): string {
  if (!day) return "잘 모름";
  switch (day.status) {
    case "open_24h":
      return "24시간";
    case "closed":
      return "휴무";
    case "open":
      return day.intervals.map((it) => `${it.start}~${it.next_day ? "익일 " : ""}${it.end}`).join(", ");
    default:
      return "잘 모름";
  }
}

/** "월 18:00~익일 02:00 / 화 …" 형태 한 줄 요약 */
export function formatHours(hours: HoursInput | undefined): string[] {
  if (!hours) return [];
  return WEEKDAY_NAMES.map((name, i) => `${name} ${formatDay(hours[String(i + 1)])}`);
}

export function isOlderThan30Days(iso: string | null): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > 30 * 24 * 60 * 60 * 1000;
}
