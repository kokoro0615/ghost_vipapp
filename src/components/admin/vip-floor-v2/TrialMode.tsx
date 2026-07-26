"use client";

import { createContext, type ReactNode, useContext } from "react";

type TrialModeProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

const TrialModeContext = createContext(false);

export function TrialModeProvider({ enabled, children }: TrialModeProviderProps) {
  return <TrialModeContext.Provider value={enabled}>{children}</TrialModeContext.Provider>;
}

export function useTrialMode() {
  return useContext(TrialModeContext);
}

type TrialModeCueProps = {
  className?: string;
  compact?: boolean;
};

export function TrialModeCue({ className, compact = false }: TrialModeCueProps) {
  const enabled = useTrialMode();
  if (!enabled) return null;

  return (
    <p className={className} role="note">
      <strong>TRIAL / 仮データ専用</strong>
      {!compact ? <span>実在する顧客・スタッフ・電話・メール・決済情報を入力しないでください。</span> : null}
    </p>
  );
}
