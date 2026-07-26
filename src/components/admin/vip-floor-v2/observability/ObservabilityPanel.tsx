"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, RefreshCw, TriangleAlert, X } from "lucide-react";

import styles from "../VipFloorWorkspace.module.css";

type SloPayload = {
  generatedAt: string;
  windowMinutes: number;
  metrics: Record<string, number>;
  targets: Record<string, number>;
  alerts: Record<string, "warning" | "critical">;
};

type Props = {
  open: boolean;
  onClose: () => void;
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

export function ObservabilityPanel({ open, onClose }: Props) {
  const [payload, setPayload] = useState<SloPayload | null>(null);
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    const response = await fetch("/api/admin/vip-floor/observability?windowMinutes=60", {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || data.ok !== true || !data.metrics || !data.alerts) {
      setMessage("SLOを取得できませんでした。");
      return;
    }
    setPayload(data as unknown as SloPayload);
    setMessage("");
  }

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
      void load();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

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
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header className={styles.commandHeader}>
          <div>
            <span>GHOST MANAGER · LAST 60 MIN</span>
            <h2 id="slo-panel-title">運用SLO / Alert</h2>
          </div>
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
