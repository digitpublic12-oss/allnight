"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import PlaceDetailPanel from "@/features/place/PlaceDetailPanel";
import { fetchCategories, searchPlaces, type CategoryRow, type PlaceResult } from "./searchPlaces";
import SearchResults from "./SearchResults";
import { MAX_SLOT, formatSlot, isNextDay, todayInSeoul } from "./time";
import styles from "./SearchPanel.module.css";

type TimeMode = "point" | "range";
type ResultState = { state: "loading" } | { state: "error" } | { state: "done"; places: PlaceResult[] };

const noSubscribe = () => () => {};
const DEFAULT_START = 0;
const DEFAULT_END = 8;
// 슬라이더를 끄는 동안 요청이 몰리지 않도록, 마지막 조작 후 잠시 기다렸다가 검색한다 (DESIGN.md §6.1)
const SEARCH_DELAY_MS = 250;

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
  const [submittedQuery, setSubmittedQuery] = useState("");
  // 오늘 날짜는 브라우저에서만 읽는다. 빌드(사전 렌더링) 시점의 날짜가 굳어지지 않게 하기 위함.
  const today = useSyncExternalStore(noSubscribe, todayInSeoul, () => "");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [mode, setMode] = useState<TimeMode>("point");
  // '현재 시각'을 기본값으로 쓰는 규칙은 30분 격자 처리 방식이 미확정이라(DESIGN.md §6.1) 우선 18:00에서 시작한다.
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<ResultState>({ state: "loading" });
  const [retryCount, setRetryCount] = useState(0);
  const latestRequest = useRef(0);
  // 장소 상세는 별도 페이지 이동 없이 같은 패널에서 전환하고, 주소(/place/ID)만 바꾼다 (SITEMAP.md §1).
  // 주소에서 선택 장소를 읽으므로 브라우저 뒤로/앞으로 가기와 새로고침이 그대로 동작한다.
  const pathname = usePathname();
  const selectedId = pathname.startsWith("/place/") ? decodeURIComponent(pathname.slice("/place/".length)) : null;
  const openedFromList = useRef(false);

  function openPlace(id: string) {
    openedFromList.current = true;
    window.history.pushState(null, "", `/place/${id}`);
  }

  function closePlace() {
    if (openedFromList.current) {
      openedFromList.current = false;
      window.history.back();
    } else {
      // 상세 주소로 바로 들어온 경우엔 돌아갈 목록 기록이 없으므로 주소만 바꾼다
      window.history.replaceState(null, "", "/");
    }
  }

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!date) return;
    const timer = setTimeout(async () => {
      // 늦게 도착한 이전 응답이 최신 결과를 덮어쓰지 않게 요청 번호로 구분한다
      const requestId = ++latestRequest.current;
      setResult({ state: "loading" });
      try {
        const places = await searchPlaces({
          date,
          mode,
          start,
          end,
          categoryIds: selectedIds,
          query: submittedQuery,
        });
        if (requestId === latestRequest.current) setResult({ state: "done", places });
      } catch {
        if (requestId === latestRequest.current) setResult({ state: "error" });
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [date, mode, start, end, selectedIds, submittedQuery, retryCount]);

  function toggleCategory(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function changeStart(value: number) {
    setStart(value);
    if (mode === "range" && end <= value) setEnd(Math.min(value + 1, MAX_SLOT));
  }

  function changeEnd(value: number) {
    setEnd(Math.max(value, start + 1));
  }

  function resetFilters() {
    setQuery("");
    setSubmittedQuery("");
    setPickedDate(null);
    setMode("point");
    setStart(DEFAULT_START);
    setEnd(DEFAULT_END);
    setSelectedIds([]);
  }

  return (
    <aside className={styles.panel} aria-label="장소 검색">
      {selectedId && (
        <PlaceDetailPanel
          key={selectedId}
          placeId={selectedId}
          timeWindow={{ date, mode, start, end }}
          today={today}
          onBack={closePlace}
        />
      )}
      {/* 상세를 보는 동안에도 검색 화면을 지우지 않고 숨겨 둔다 → 돌아오면 조건·스크롤이 그대로 */}
      <div className={styles.searchView} hidden={selectedId !== null}>
      <div className={styles.fixed}>
        <h1 className={styles.logo}>
          <span aria-hidden="true">🌙</span> ALLNIGHT
        </h1>

        <form
          className={styles.search}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedQuery(query);
          }}
        >
          <label htmlFor="q" className="visually-hidden">
            장소명이나 주소로 검색
          </label>
          <input
            id="q"
            className="input"
            type="search"
            placeholder="장소명, 주소로 검색 (Enter)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // 검색어를 모두 지우면 바로 전체 결과로 돌아간다
              if (e.target.value === "") setSubmittedQuery("");
            }}
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
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="chip"
                aria-pressed={selectedIds.includes(category.id)}
                onClick={() => toggleCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.results}>
        {result.state === "done" ? (
          <SearchResults state="done" places={result.places} onReset={resetFilters} onSelect={openPlace} />
        ) : result.state === "error" ? (
          <SearchResults state="error" onRetry={() => setRetryCount((n) => n + 1)} />
        ) : (
          <SearchResults state="loading" />
        )}
      </div>
      </div>
    </aside>
  );
}
