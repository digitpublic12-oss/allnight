"use client";

import { useEffect, useState } from "react";
import { setMapFocus } from "@/features/map/mapStore";
import type { CoverageStatus, TimeWindow } from "@/features/search/searchPlaces";
import { WEEKDAY_NAMES, describeDay, formatDateLabel, todaySummary } from "./hours";
import { fetchCoverage, fetchPlaceDetail, type PlaceDetail } from "./placeDetail";
import styles from "./PlaceDetailPanel.module.css";

// 02_place_detail.md §2.2 문구
const COVERAGE: Record<CoverageStatus, { badge: string; text: string }> = {
  full: { badge: "영업 중", text: "선택한 시간에 영업합니다" },
  partial: { badge: "일부 영업", text: "선택한 시간 중 일부만 영업합니다" },
  unknown: { badge: "⚠ 미확인", text: "영업정보 미확인 · 방문 전 확인을 권장합니다" },
  closed: { badge: "영업 안 함", text: "선택한 시간에는 영업하지 않습니다" },
};

const VERIFICATION = {
  verified: "관리자 확인됨",
  needs_check: "확인 필요",
  unverified: "미확인",
} as const;

type LoadState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "notFound" }
  | { state: "done"; place: PlaceDetail; coverage: CoverageStatus };

type Props = {
  placeId: string;
  timeWindow: TimeWindow;
  today: string;
  onBack: () => void;
  onCorrect: () => void;
};

function formatVerifiedDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

function isOlderThan30Days(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > 30 * 24 * 60 * 60 * 1000;
}

export default function PlaceDetailPanel({ placeId, timeWindow, today, onBack, onCorrect }: Props) {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [retryCount, setRetryCount] = useState(0);
  const [weekOpen, setWeekOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { date, mode, start, end } = timeWindow;

  useEffect(() => {
    if (!today || !date) return;
    let cancelled = false;
    Promise.all([
      fetchPlaceDetail(placeId, today),
      fetchCoverage(placeId, { date, mode, start, end }).catch(() => null),
    ])
      .then(([place, coverage]) => {
        if (cancelled) return;
        if (!place || !coverage) setLoad({ state: "notFound" });
        else setLoad({ state: "done", place, coverage });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [placeId, today, date, mode, start, end, retryCount]);

  // 열린 장소를 지도에 알려 핀을 강조한다. 검색 결과에 없는 장소(상세 주소로 바로 들어온 경우)도 표시된다.
  const loadedPlace = load.state === "done" ? load.place : null;
  useEffect(() => {
    if (!loadedPlace) return;
    const { id, name, latitude, longitude } = loadedPlace;
    setMapFocus({ id, name, latitude, longitude });
    return () => setMapFocus(null);
  }, [loadedPlace]);

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드를 쓸 수 없는 환경이면 조용히 넘어간다 (주소는 화면에 그대로 보임)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <button type="button" className={`btn ${styles.back}`} onClick={onBack}>
          ← 뒤로
        </button>
      </div>

      {load.state === "loading" && (
        <div className={styles.body} aria-busy="true">
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} />
        </div>
      )}

      {load.state === "error" && (
        <div className={styles.message} role="alert">
          <p className={styles.messageTitle}>장소 정보를 불러오지 못했습니다</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setLoad({ state: "loading" });
              setRetryCount((n) => n + 1);
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {load.state === "notFound" && (
        <div className={styles.message}>
          <p className={styles.messageTitle}>장소를 찾을 수 없습니다</p>
          <p className={styles.messageText}>요청하신 장소 정보가 존재하지 않거나 삭제되었습니다.</p>
          <button type="button" className="btn" onClick={onBack}>
            지도 검색으로 돌아가기
          </button>
        </div>
      )}

      {load.state === "done" && (
        <DetailBody
          {...load}
          today={today}
          copied={copied}
          weekOpen={weekOpen}
          onToggleWeek={() => setWeekOpen((v) => !v)}
          onCopy={copyAddress}
          onCorrect={onCorrect}
        />
      )}
    </div>
  );
}

type BodyProps = {
  place: PlaceDetail;
  coverage: CoverageStatus;
  today: string;
  copied: boolean;
  weekOpen: boolean;
  onToggleWeek: () => void;
  onCopy: (address: string) => void;
  onCorrect: () => void;
};

function DetailBody({ place, coverage, today, copied, weekOpen, onToggleWeek, onCopy, onCorrect }: BodyProps) {
  const status = COVERAGE[coverage];
  const todayHours = todaySummary(place, today);
  const upcoming = place.place_special_days
    .filter((d) => d.local_date >= today)
    .sort((a, b) => a.local_date.localeCompare(b.local_date))
    .slice(0, 5);
  const tags = place.place_tags.map((t) => t.tags?.name).filter((n): n is string => Boolean(n));
  const address = [place.address_road ?? place.address_full, place.address_detail].filter(Boolean).join(" ");
  const stale = isOlderThan30Days(place.last_verified_at);

  return (
    <div className={styles.body}>
      <header className={styles.header}>
        <span className={styles.category}>{place.categories?.name}</span>
        <h2 className={styles.name}>{place.name}</h2>
      </header>

      {/* 선택 시간의 영업 판정과 신뢰도가 가장 먼저 (02_place_detail.md §2.2) */}
      <section className={styles.status} aria-label="영업 상태">
        <p className={styles.statusRow}>
          <span className={`${styles.badge} ${styles[coverage]}`}>{status.badge}</span>
          <span>{status.text}</span>
        </p>
        <p className={styles.verify}>
          {VERIFICATION[place.verification_status]}
          {place.last_verified_at && ` · ${formatVerifiedDate(place.last_verified_at)} 확인`}
        </p>
        {stale && (
          <p className={styles.warningBox} role="note">
            확인된 지 30일 이상 지난 정보입니다. 실제 영업 여부를 확인해주세요.
          </p>
        )}
      </section>

      <div className={styles.actions}>
        <a
          className="btn"
          href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          카카오맵에서 보기
        </a>
        <button type="button" className="btn" onClick={onCorrect}>
          정보 수정 제보
        </button>
      </div>

      <section className={styles.section} aria-labelledby="hours-title">
        <h3 id="hours-title" className={styles.sectionTitle}>
          영업시간
        </h3>
        {upcoming.length > 0 && (
          <ul className={styles.exceptions}>
            {upcoming.map((day) => (
              <li key={day.local_date}>
                <strong>{formatDateLabel(day.local_date)}</strong>{" "}
                {describeDay(day.status, day.place_special_intervals)}
                {day.note && ` · ${day.note}`}
              </li>
            ))}
          </ul>
        )}
        <p className={styles.today}>
          <span className={styles.todayLabel}>오늘{todayHours.isException && " (특별 일정)"}</span>
          {todayHours.text}
        </p>
        <button
          type="button"
          className={styles.weekToggle}
          aria-expanded={weekOpen}
          onClick={onToggleWeek}
        >
          주간 영업시간 전체보기 {weekOpen ? "▴" : "▾"}
        </button>
        {weekOpen && (
          <dl className={styles.week}>
            {WEEKDAY_NAMES.map((label, i) => {
              const day = place.place_regular_day_status.find((d) => d.weekday === i + 1);
              return (
                <div key={label} className={styles.weekRow}>
                  <dt>{label}</dt>
                  <dd>{describeDay(day?.status, day?.place_regular_intervals ?? [])}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      <section className={styles.section} aria-labelledby="info-title">
        <h3 id="info-title" className={styles.sectionTitle}>
          기본 정보
        </h3>
        <div className={styles.infoRow}>
          <span>{address}</span>
          <button type="button" className={styles.textButton} onClick={() => onCopy(address)}>
            {copied ? "복사됨" : "주소 복사"}
          </button>
        </div>
        {place.phone && (
          <a className={styles.link} href={`tel:${place.phone}`}>
            {place.phone}
          </a>
        )}
        {place.website_url && (
          <a className={styles.link} href={place.website_url} target="_blank" rel="noopener noreferrer">
            웹사이트
          </a>
        )}
        {tags.length > 0 && (
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
