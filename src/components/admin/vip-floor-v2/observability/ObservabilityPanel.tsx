"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, RefreshCw, TriangleAlert, X } from "lucide-react";

import { DemoCue, useDemoMode } from "../demo/DemoMode";
import styles from "../VipFloorWorkspace.module.css";

export type SloPayload = {
  generatedAt: string;
  windowMinutes: number;
  metrics: Record<string, number>;
  targets: Record<string, number>;
  alerts: Record<string, "warning" | "critical">;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onLoad: () => Promise<SloPayload | null>;
};

const METRIC_LABELS: Array<[string, string, string]> = [
  ["commandCount", "Command", "件"],
  ["commandErrorRate", "Error rate", "%"],
  ["commandP95Ms", "Command p95", "ms"],
  ["boardReadP95Ms", "Board p95", "ms"],
  ["outboxDeadCount", "Outbox dead", "件"],
  ["realtimeGapCount", "Revision gap", "件"],
  ["realtimeUnavailableCount", "Realtime停止", "件"],
];

export function ObservabilityPanel({ open, onClose, onLoad }: Props) {
  const { enabled: isDemo } = useDemoMode();
  const [payload, setPayload] = useState<SloPayload | null>(null);
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    const data = await onLoad();
    if (!data) {
      setMessage("SLOを取得できませんでした。");
      return;
    }
    setPayload(data);
    setMessage("");
  }, [onLoad]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
      void load();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [load, open]);

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [])].filter((element) => element.getClientRects().length > 0);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;
  const alerts = Object.entries(payload?.alerts ?? {});

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        ref={panelRef}
        className={styles.observabilityDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slo-panel-title"
        onKeyDown={trapFocus}
      >
        <header className={styles.commandHeader}>
          <div>
            <span>{isDemo ? "DEMO · LOCAL LEDGER" : "GHOST MANAGER · LAST 60 MIN"}</span>
            <h2 id="slo-panel-title">運用SLO / Alert</h2>
          </div>
          <DemoCue compact />
          <button type="button" onClick={onClose} aria-label="SLOを閉じる"><X size={19} /></button>
        </header>
        <div className={styles.observabilityBody}>
          <section className={styles.sloStatus} data-alert={alerts.length > 0 || undefined}>
            {alerts.length ? <TriangleAlert size={20} /> : <Activity size={20} />}
            <div>
              <strong>{alerts.length ? `${alerts.length}件の閾値超過` : "すべてのSLOが範囲内"}</strong>
              <span>{payload ? new Intl.DateTimeFormat("ja-JP", {
                dateStyle: "short",
                timeStyle: "medium",
                timeZone: "Asia/Tokyo",
              }).format(new Date(payload.generatedAt)) : "集計中"}</span>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={() => void load()}>
              <RefreshCw size={15} />更新
            </button>
          </section>
          <dl className={styles.sloGrid}>
            {METRIC_LABELS.map(([key, label, unit]) => {
              const rawValue = payload?.metrics[key] ?? 0;
              const value = key === "commandErrorRate"
                ? (rawValue * 100).toFixed(2)
                : String(rawValue);
              return <div key={key}><dt>{label}</dt><dd>{value}<small>{unit}</small></dd></div>;
            })}
          </dl>
          <section className={styles.alertRail}>
            <h3>Alert判定</h3>
            {alerts.length ? alerts.map(([key, severity]) => (
              <p key={key} data-severity={severity}>
                <TriangleAlert size={14} />{key}<strong>{severity}</strong>
              </p>
            )) : <p>閾値超過はありません。</p>}
          </section>
          <p role="status" className={styles.wizardHint}>{message}</p>
        </div>
      </div>
    </div>
  );
}
