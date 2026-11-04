// 시간 슬라이더 모델 (docs/DESIGN.md §6.1, docs/DB.md §4.1).
// 슬라이더 값은 "시작 날짜 18:00부터 30분 단위로 몇 칸째인가"를 뜻한다.
// 0 = 18:00, 12 = 익일 00:00, 26 = 익일 07:00. 자정을 넘으면 날짜가 바뀌므로
// 시각만이 아니라 '익일' 여부를 함께 표시해야 한다.

export const SLOT_MINUTES = 30;
export const WINDOW_START_MINUTES = 18 * 60;
export const MAX_SLOT = 26;

export function slotToMinutes(slot: number): number {
  return WINDOW_START_MINUTES + slot * SLOT_MINUTES;
}

export function isNextDay(slot: number): boolean {
  return slotToMinutes(slot) >= 24 * 60;
}

export function formatSlot(slot: number): string {
  const minutes = slotToMinutes(slot) % (24 * 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function todayInSeoul(): string {
  // en-CA 형식이 YYYY-MM-DD라 <input type="date"> 값으로 그대로 쓸 수 있다
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}
