"use client";

import { vipScheduleLabels } from "@/lib/vipBusinessTime";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { VipFloorBoardV2 } from "@/lib/vipFloorV2Contract";
import { VIP_FLOOR_SCHEMA_VERSION } from "@/lib/vipFloorV2Contract";
import { fetchJsonWithDeadline } from "@/lib/fetchJsonWithDeadline";
import { readVipFloorDayStateEvent } from "@/lib/vipFloorDayState";
import { toUiReservations } from "../contract/viewModel";
import { useTrialMode } from "../TrialMode";
import { alertBusinessDate, reservationAlerts } from "./reservationAlerts";
import styles from "./ReservationAlerts.module.css";

const STORAGE_PREFIX = "ghost-vip-time-alerts-v1:";

type Props = { board: VipFloorBoardV2; healthy: boolean; demo: boolean };

export function ReservationAlerts({ board, healthy, demo }: Props) {
  const trial = useTrialMode();
  const [clock, setClock] = useState({ now: 0, visible: false, epoch: 0 });
  const [remote, setRemote] = useState<{ date: string; board: VipFloorBoardV2 | null; failed: boolean; at: number; epoch: number } | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = clock.now ? alertBusinessDate(clock.now) : "";
  const storageKey = `${STORAGE_PREFIX}${demo || trial ? "synthetic" : "live"}:${today}`;
  const sameDay = board.businessDay.businessDate === today;
  const needRemote = Boolean(today) && !demo && !trial;

  useEffect(() => {
    let timer = 0;
    function sync() {
      window.clearInterval(timer);
      setClock((previous) => ({ now: Date.now(), visible: !document.hidden, epoch: previous.epoch + 1 }));
      if (!document.hidden) timer = window.setInterval(() => setClock((previous) => ({ ...previous, now: Date.now(), visible: true })), 1_000);
    }
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, []);

  useEffect(() => {
    if (!today) return;
    const frame = window.requestAnimationFrame(() => {
      let keys: string[] = [];
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
        if (Array.isArray(stored)) keys = stored.filter((key): key is string =>
          typeof key === "string" && key.startsWith(`${today}:`) && key.length < 240).slice(-1000);
        // Retain one business day per lane; no guest data is ever persisted.
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith(STORAGE_PREFIX) && key !== storageKey) sessionStorage.removeItem(key);
        }
      } catch { /* Restricted storage still supports in-memory acknowledgement. */ }
      setAcknowledged(new Set(keys));
      setStorageReady(storageKey);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey, today]);

  useEffect(() => {
    if (!needRemote || !clock.visible) return;
    let disposed = false;
    let timer = 0;
    async function refresh() {
      try {
        const { response, payload } = await fetchJsonWithDeadline(`/api/admin/vip-floor?date=${encodeURIComponent(today)}&purpose=alerts`, {
          cache: "no-store", deadlineMs: 15_000,
        });
        if (disposed) return;
        const dayState = readVipFloorDayStateEvent(payload.dayState);
        if (dayState?.businessDate === today) {
          setRemote({ date: today, board: null, failed: false, at: Date.now(), epoch: clock.epoch });
        } else {
          const candidate = payload as unknown as VipFloorBoardV2;
          if (!response.ok || candidate.schemaVersion !== VIP_FLOOR_SCHEMA_VERSION
            || candidate.businessDay?.businessDate !== today
            || !Array.isArray(candidate.reservations) || !Array.isArray(candidate.tables)) throw new Error("alert_board_unavailable");
          setRemote({ date: today, board: candidate, failed: false, at: Date.now(), epoch: clock.epoch });
        }
      } catch {
        if (!disposed) setRemote({ date: today, board: null, failed: true, at: Date.now(), epoch: clock.epoch });
      } finally {
        if (!disposed) timer = window.setTimeout(() => void refresh(), 15_000);
      }
    }
    void refresh();
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [needRemote, today, clock.visible, clock.epoch]);

  const remoteBoard = remote?.date === today && remote.epoch === clock.epoch && !remote.failed && clock.now - remote.at < 45_000 ? remote.board : null;
  // Realtime mutations on the visible night can resolve a popup immediately;
  // background monitoring still supplies a fresh independent baseline.
  const activeBoard = needRemote
    ? remoteBoard && sameDay && healthy && board.boardRevision >= remoteBoard.boardRevision ? board : remoteBoard
    : sameDay && healthy ? board : null;
  const alerts = useMemo(() => activeBoard && clock.visible && storageReady === storageKey
    ? reservationAlerts(activeBoard, clock.now).filter((alert) => !acknowledged.has(alert.key)) : [],
  [activeBoard, clock, acknowledged, storageReady, storageKey]);
  const reservations = useMemo(() => activeBoard ? toUiReservations(activeBoard) : [], [activeBoard]);
  const open = alerts.length > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  function acknowledge() {
    const next = new Set(acknowledged);
    for (const alert of alerts) next.add(alert.key);
    setAcknowledged(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify([...next].slice(-1000))); } catch { /* Memory remains authoritative. */ }
  }

  if (!clock.now) return null;
  const failed = needRemote && remote?.date === today && remote.failed;
  return <>
    {failed ? <p role="status" className={styles.monitorFailure}>当日の時刻通知を更新できません。接続を確認してください。</p> : null}
    {open ? createPortal(
      <dialog ref={dialogRef} className={styles.popup} aria-labelledby="reservation-alert-title" aria-describedby="reservation-alert-description"
        onCancel={(event) => { event.preventDefault(); acknowledge(); }}>
        <header>
          <h2 id="reservation-alert-title">予約時刻のお知らせ</h2>
          <p id="reservation-alert-description">来店・延長の確認をお願いします。</p>
        </header>
        <ul tabIndex={0} aria-label="時刻確認が必要な予約">
          {alerts.map((alert) => {
            const reservation = reservations.find((item) => item.id === alert.reservationId);
            const schedule = vipScheduleLabels(alert.businessDate, alert.targetAt, null);
            return <li key={alert.key}>
              <strong className={styles.kind}>{alert.kind === "arrival" ? "来店前確認" : "延長確認"}</strong>
              <h3>{reservation?.guestLabel ?? "予約名未設定"}</h3>
              <p className="tabular-nums">{reservation?.tableCodes.join("・") || "卓未定"} / {reservation?.guestCount ?? "—"}名</p>
              <p className="tabular-nums">{alert.kind === "arrival" ? "来店予定" : "終了予定"} {schedule.timeLabel}</p>
              {schedule.actualLabel ? <p className="tabular-nums">{schedule.actualLabel}</p> : null}
            </li>;
          })}
        </ul>
        <footer><button type="button" onClick={acknowledge}>確認しました{alerts.length > 1 ? `（${alerts.length}件）` : ""}</button></footer>
      </dialog>, document.body,
    ) : null}
  </>;
}
