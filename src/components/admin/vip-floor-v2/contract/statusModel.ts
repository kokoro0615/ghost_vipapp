import {
  AlertTriangle,
  Ban,
  Check,
  CircleDashed,
  Clock3,
  CreditCard,
  DoorOpen,
  GlassWater,
  RotateCcw,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { VipServiceStatus } from "@/lib/vipFloorV2Contract";

export type StatusMeta = {
  label: string;
  shortLabel: string;
  tone: "neutral" | "warning" | "danger" | "active" | "success";
  cue: "line" | "stripe" | "double" | "solid" | "dash";
  icon: LucideIcon;
};

export const STATUS_META: Record<VipServiceStatus, StatusMeta> = {
  expected: { label: "来店予定", shortLabel: "予定", tone: "neutral", cue: "line", icon: Clock3 },
  late: { label: "遅延", shortLabel: "遅延", tone: "danger", cue: "stripe", icon: AlertTriangle },
  no_contact: { label: "連絡未達", shortLabel: "未達", tone: "danger", cue: "double", icon: ShieldAlert },
  arrived: { label: "到着済み", shortLabel: "到着", tone: "active", cue: "solid", icon: DoorOpen },
  partial_arrival: { label: "一部到着", shortLabel: "一部", tone: "warning", cue: "stripe", icon: UsersRound },
  seated: { label: "着席中", shortLabel: "着席", tone: "active", cue: "solid", icon: UserRoundCheck },
  bottle_pending: { label: "ボトル待ち", shortLabel: "待ち", tone: "warning", cue: "dash", icon: GlassWater },
  bottle_served: { label: "提供済み", shortLabel: "提供", tone: "active", cue: "double", icon: GlassWater },
  bill_requested: { label: "会計依頼", shortLabel: "会計", tone: "warning", cue: "double", icon: CreditCard },
  paid: { label: "支払済み", shortLabel: "支払", tone: "success", cue: "solid", icon: Check },
  resetting: { label: "リセット中", shortLabel: "整備", tone: "neutral", cue: "dash", icon: RotateCcw },
  completed: { label: "完了", shortLabel: "完了", tone: "success", cue: "line", icon: Check },
  no_show: { label: "無断不来店", shortLabel: "不来", tone: "danger", cue: "double", icon: Ban },
};

export const FALLBACK_STATUS_META: StatusMeta = {
  label: "状態未設定",
  shortLabel: "未設定",
  tone: "neutral",
  cue: "dash",
  icon: CircleDashed,
};

export function getStatusMeta(status: string | null | undefined) {
  if (!status || !(status in STATUS_META)) return FALLBACK_STATUS_META;
  return STATUS_META[status as VipServiceStatus];
}
