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

// 슬라이더 칸을 한국 시간 기준 절대 시각(ISO)으로 바꾼다. 자정을 넘긴 칸은 날짜를 하루 더한다.
// 한국은 서머타임이 없어 +09:00 고정으로 충분하다.
export function slotToIso(date: string, slot: number): string {
  const total = slotToMinutes(slot);
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d + Math.floor(total / (24 * 60))));
  const ymd = day.toISOString().slice(0, 10);
  return `${ymd}T${formatSlot(slot)}:00+09:00`;
}

export function todayInSeoul(): string {
  // en-CA 형식이 YYYY-MM-DD라 <input type="date"> 값으로 그대로 쓸 수 있다
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}
