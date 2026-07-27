"use client";

import { createContext, type ReactNode, useContext } from "react";
import { Clock3, FlaskConical } from "lucide-react";

export type DemoLeaseState =
  | "inactive"
  | "checking"
  | "active"
  | "read_only"
  | "expired";

export type DemoModeValue = {
  enabled: boolean;
  expiresAt: string | null;
  leaseState: DemoLeaseState;
};

const OWNER_MODE: DemoModeValue = {
  enabled: false,
  expiresAt: null,
  leaseState: "inactive",
};

const DemoModeContext = createContext<DemoModeValue>(OWNER_MODE);
const DEMO_NEAR_EXPIRY_MS = 72 * 60 * 60 * 1000;

export function demoExpiryPhase(
  expiresAt: string | null,
  now = Date.now(),
): "inactive" | "active" | "near" | "expired" {
  if (!expiresAt) return "inactive";
  const remainingMs = Date.parse(expiresAt) - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "expired";
  return remainingMs <= DEMO_NEAR_EXPIRY_MS ? "near" : "active";
}

export function DemoModeProvider({
  value,
  children,
}: {
  value: DemoModeValue;
  children: ReactNode;
}) {
  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}

export function DemoCue({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const demo = useDemoMode();
  if (!demo.enabled) return null;
  const expiryPhase = demoExpiryPhase(demo.expiresAt);

  return (
    <p
      className={className}
      role="note"
      data-lease-state={demo.leaseState}
      data-expiry-phase={expiryPhase}
      aria-live={expiryPhase === "near" ? "polite" : undefined}
    >
      <FlaskConical size={14} aria-hidden />
      <strong>DEMO · 合成データ専用</strong>
      {!compact ? <span>実在する個人・連絡先・決済情報は保存できません。</span> : null}
      {demo.expiresAt ? (
        <span>
          <Clock3 size={13} aria-hidden />
          {expiryPhase === "near"
            ? "まもなく失効 · 2026-08-27 23:59:59 JST"
            : "2026-08-27 23:59:59 JST 失効"}
        </span>
      ) : null}
    </p>
  );
}
