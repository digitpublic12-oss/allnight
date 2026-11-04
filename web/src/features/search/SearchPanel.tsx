"use client";

import { useState, useSyncExternalStore } from "react";
import { CATEGORIES, type Category } from "./categories";
import { MAX_SLOT, formatSlot, isNextDay, todayInSeoul } from "./time";
import styles from "./SearchPanel.module.css";

type TimeMode = "point" | "range";

const noSubscribe = () => () => {};

function SlotLabel({ slot }: { slot: number }) {
  return (
    <span className={styles.slotLabel}>
      {formatSlot(slot)}
      {isNextDay(slot) && <span className={styles.nextDay}>익일</span>}
    </span>
  );
}

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  // 오늘 날짜는 브라우저에서만 읽는다. 빌드(사전 렌더링) 시점의 날짜가 굳어지지 않게 하기 위함.
  const today = useSyncExternalStore(noSubscribe, todayInSeoul, () => "");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [mode, setMode] = useState<TimeMode>("point");
  // '현재 시각'을 기본값으로 쓰는 규칙은 30분 격자 처리 방식이 미확정이라(DESIGN.md §6.1) 우선 18:00에서 시작한다.
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(8);
  const [selected, setSelected] = useState<Category[]>([]);

  function toggleCategory(category: Category) {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }

  function changeStart(value: number) {
    setStart(value);
    if (mode === "range" && end <= value) setEnd(Math.min(value + 1, MAX_SLOT));
  }

  function changeEnd(value: number) {
    setEnd(Math.max(value, start + 1));
  }

  return (
    <aside className={styles.panel} aria-label="장소 검색">
      <div className={styles.fixed}>
        <h1 className={styles.logo}>
          <span aria-hidden="true">🌙</span> ALLNIGHT
        </h1>

        <form className={styles.search} role="search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="q" className="visually-hidden">
            장소명이나 주소로 검색
          </label>
          <input
            id="q"
            className="input"
            type="search"
            placeholder="장소명, 주소로 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <section className={styles.section} aria-labelledby="time-title">
          <div className={styles.sectionHead}>
            <h2 id="time-title" className={styles.sectionTitle}>
              시간
            </h2>
            <div className={styles.modeToggle} role="group" aria-label="시간 선택 방식">
              <button
                type="button"
                aria-pressed={mode === "point"}
                onClick={() => setMode("point")}
              >
                특정 시각
              </button>
              <button
                type="button"
                aria-pressed={mode === "range"}
                onClick={() => {
                  setMode("range");
                  if (end <= start) setEnd(Math.min(start + 1, MAX_SLOT));
                }}
              >
                시간 구간
              </button>
            </div>
          </div>

          <label className={styles.dateRow}>
            <span>날짜</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setPickedDate(e.target.value)}
            />
          </label>

          <p className={styles.timeSummary} aria-live="polite">
            <SlotLabel slot={start} />
            {mode === "range" && (
              <>
                {" ~ "}
                <SlotLabel slot={end} />
              </>
            )}
          </p>

          <label className={styles.sliderRow}>
            <span className="visually-hidden">{mode === "range" ? "시작 시각" : "시각"}</span>
            <input
              type="range"
              min={0}
              max={mode === "range" ? MAX_SLOT - 1 : MAX_SLOT}
              step={1}
              value={start}
              aria-valuetext={`${isNextDay(start) ? "익일 " : ""}${formatSlot(start)}`}
              onChange={(e) => changeStart(Number(e.target.value))}
            />
          </label>
          {mode === "range" && (
            <label className={styles.sliderRow}>
              <span className="visually-hidden">종료 시각</span>
              <input
                type="range"
                min={1}
                max={MAX_SLOT}
                step={1}
                value={end}
                aria-valuetext={`${isNextDay(end) ? "익일 " : ""}${formatSlot(end)}`}
                onChange={(e) => changeEnd(Number(e.target.value))}
              />
            </label>
          )}
          <div className={styles.ticks} aria-hidden="true">
            <span>18:00</span>
            <span>00:00</span>
            <span>07:00</span>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="cat-title">
          <h2 id="cat-title" className={styles.sectionTitle}>
            카테고리
          </h2>
          <div className={styles.chips}>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className="chip"
                aria-pressed={selected.includes(category)}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.results}>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>아직 표시할 장소가 없습니다</p>
          <p className={styles.emptyText}>장소 데이터가 연결되면 이곳에 검색 결과가 표시됩니다.</p>
        </div>
      </div>
    </aside>
  );
}
