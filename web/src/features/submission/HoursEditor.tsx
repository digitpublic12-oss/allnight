"use client";

import { isNextDay, type DayInput, type DayStatus, type HoursInput } from "./validate";
import styles from "./HoursEditor.module.css";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const STATUS_LABEL: Record<DayStatus, string> = {
  open: "영업",
  open_24h: "24시간",
  closed: "휴무",
  unknown: "잘 모름",
};
const MAX_INTERVALS = 4;

export function emptyHours(): HoursInput {
  const hours: HoursInput = {};
  for (let wd = 1; wd <= 7; wd++) hours[String(wd)] = { status: "unknown", intervals: [] };
  return hours;
}

type Props = {
  value: HoursInput;
  onChange: (next: HoursInput) => void;
  error?: string;
};

// 요일별 영업시간 입력 (03_place_submission.md §2.2-4). 관리자 장소 편집에서도 같이 쓴다.
export default function HoursEditor({ value, onChange, error }: Props) {
  function setDay(wd: number, day: DayInput) {
    onChange({ ...value, [String(wd)]: day });
  }

  function setStatus(wd: number, status: DayStatus) {
    const current = value[String(wd)];
    setDay(wd, {
      status,
      // '영업'으로 바꾸면 입력할 구간 하나를 미리 만들어 둔다
      intervals: status === "open" ? (current.intervals.length ? current.intervals : [{ start: "18:00", end: "02:00", next_day: true }]) : [],
    });
  }

  function setInterval(wd: number, index: number, field: "start" | "end", time: string) {
    const day = value[String(wd)];
    const intervals = day.intervals.map((it, i) => {
      if (i !== index) return it;
      const next = { ...it, [field]: time };
      return { ...next, next_day: isNextDay(next.start, next.end) };
    });
    setDay(wd, { ...day, intervals });
  }

  function addInterval(wd: number) {
    const day = value[String(wd)];
    if (day.intervals.length >= MAX_INTERVALS) return;
    setDay(wd, { ...day, intervals: [...day.intervals, { start: "17:00", end: "23:00", next_day: false }] });
  }

  function removeInterval(wd: number, index: number) {
    const day = value[String(wd)];
    const intervals = day.intervals.filter((_, i) => i !== index);
    setDay(wd, intervals.length ? { ...day, intervals } : { status: "unknown", intervals: [] });
  }

  function setAll24h() {
    const next: HoursInput = {};
    for (let wd = 1; wd <= 7; wd++) next[String(wd)] = { status: "open_24h", intervals: [] };
    onChange(next);
  }

  // 월요일 입력을 모든 요일에 복사
  function copyMondayToAll() {
    const monday = value["1"];
    const next: HoursInput = {};
    for (let wd = 1; wd <= 7; wd++) next[String(wd)] = { status: monday.status, intervals: monday.intervals.map((it) => ({ ...it })) };
    onChange(next);
  }

  return (
    <div className={styles.editor}>
      <div className={styles.quick}>
        <button type="button" className="btn" onClick={setAll24h}>
          24시간·연중무휴
        </button>
        <button type="button" className="btn" onClick={copyMondayToAll}>
          월요일 시간을 매일 적용
        </button>
      </div>

      <ul className={styles.days}>
        {WEEKDAYS.map((label, i) => {
          const wd = i + 1;
          const day = value[String(wd)];
          return (
            <li key={label} className={styles.day}>
              <div className={styles.dayHead}>
                <span className={styles.dayName}>{label}</span>
                <select
                  className={`input ${styles.status}`}
                  aria-label={`${label}요일 영업 상태`}
                  value={day.status}
                  onChange={(e) => setStatus(wd, e.target.value as DayStatus)}
                >
                  {(Object.keys(STATUS_LABEL) as DayStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              {day.status === "open" && (
                <div className={styles.intervals}>
                  {day.intervals.map((it, index) => (
                    <div key={index} className={styles.interval}>
                      <input
                        className="input"
                        type="time"
                        aria-label={`${label}요일 ${index + 1}번째 시작`}
                        value={it.start}
                        onChange={(e) => setInterval(wd, index, "start", e.target.value)}
                      />
                      <span>~</span>
                      {it.next_day && <span className={styles.nextDay}>익일</span>}
                      <input
                        className="input"
                        type="time"
                        aria-label={`${label}요일 ${index + 1}번째 종료`}
                        value={it.end}
                        onChange={(e) => setInterval(wd, index, "end", e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`${label}요일 ${index + 1}번째 구간 삭제`}
                        onClick={() => removeInterval(wd, index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {day.intervals.length < MAX_INTERVALS && (
                    <button type="button" className={styles.add} onClick={() => addInterval(wd)}>
                      + 영업 구간 추가 (브레이크타임)
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.help}>종료가 시작보다 이르면 자동으로 다음 날 종료(익일)로 처리됩니다.</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
