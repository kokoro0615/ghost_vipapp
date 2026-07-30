import type {
  OperationDraft,
  StaffAction,
  WaitlistAction,
} from "@/components/admin/vip-floor-v2/contract/uiTypes";

import {
  DEMO_FIRST_BUSINESS_DATE,
  DEMO_LAST_BUSINESS_DATE,
  type DemoCustomerPatch,
} from "./contract";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const SYNTHETIC_CUE_PATTERN = /(?:DEMO|デモ)/iu;
const SYNTHETIC_EMAIL_SUFFIX = "@example.invalid";
const PHONE_LIKE_PATTERN = /(?:\+?81|0\d)[\d\s().-]{6,}\d|(?<!\d)\d(?:[\d\s().-]*\d){7,}(?!\d)/u;
const EMAIL_LIKE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/u;
const SECRET_LIKE_PATTERN =
  /(?:authorization|bearer|secret|token|api[_\s-]?key|password|passwd|sk_(?:live|test)|pk_live|ghp_[a-z0-9])/iu;
const CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const VALIDATION_WINDOW = ["2026-07-27", "2026-08-27"] as const;

export type SyntheticTextIssue =
  | "required"
  | "too_long"
  | "control_character"
  | "phone_like"
  | "email_like"
  | "secret_like"
  | "missing_synthetic_cue";

export class DemoValidationError extends Error {
  readonly code = "INVALID_SYNTHETIC_INPUT" as const;
  readonly field: string;

  constructor(field: string) {
    super("デモ専用の合成値を入力してください。個人情報・連絡先・秘密情報は保存できません。");
    this.name = "DemoValidationError";
    this.field = field;
  }
}

export function isDemoBusinessDate(value: string) {
  return BUSINESS_DATE_PATTERN.test(value)
    && DEMO_FIRST_BUSINESS_DATE === VALIDATION_WINDOW[0]
    && DEMO_LAST_BUSINESS_DATE === VALIDATION_WINDOW[1]
    && value >= DEMO_FIRST_BUSINESS_DATE
    && value <= DEMO_LAST_BUSINESS_DATE;
}

export function assertDemoBusinessDate(value: string) {
  if (!isDemoBusinessDate(value)) {
    throw new DemoValidationError("businessDate");
  }
  return value;
}

export function assertSyntheticLabel(
  value: string | null | undefined,
  field: string,
  options: { required?: boolean; maximum?: number } = {},
) {
  const normalized = value?.trim() ?? "";
  if (getSyntheticTextIssue(normalized, options)) {
    throw new DemoValidationError(field);
  }
  return normalized || null;
}

export function getSyntheticTextIssue(
  value: string | null | undefined,
  options: { required?: boolean; maximum?: number } = {},
): SyntheticTextIssue | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return options.required ? "required" : null;
  if (normalized.length > (options.maximum ?? 160)) return "too_long";
  if (CONTROL_PATTERN.test(normalized)) return "control_character";
  if (PHONE_LIKE_PATTERN.test(normalized)) return "phone_like";
  if (EMAIL_LIKE_PATTERN.test(normalized)) return "email_like";
  if (SECRET_LIKE_PATTERN.test(normalized)) return "secret_like";
  if (!SYNTHETIC_CUE_PATTERN.test(normalized)) return "missing_synthetic_cue";
  return null;
}

export function assertSyntheticNote(
  value: string | null | undefined,
  field = "note",
) {
  return assertSyntheticLabel(value, field, { maximum: 500 });
}

export function assertSyntheticEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (
    !normalized.endsWith(SYNTHETIC_EMAIL_SUFFIX)
    || normalized.indexOf("@") !== normalized.lastIndexOf("@")
    || /\s/u.test(normalized)
    || SECRET_LIKE_PATTERN.test(normalized)
  ) {
    throw new DemoValidationError("email");
  }
  return normalized;
}

export function assertNoPhone(value: string | null | undefined) {
  if (value?.trim()) {
    throw new DemoValidationError("phone");
  }
  return null;
}

export function assertNoSecretLikeValue(value: string | null | undefined, field: string) {
  if (value && SECRET_LIKE_PATTERN.test(value)) {
    throw new DemoValidationError(field);
  }
  return value ?? null;
}

export function validateOperationDraft(draft: OperationDraft) {
  switch (draft.kind) {
    case "walk_in":
      assertSyntheticLabel(draft.payload.guestLabel, "guestLabel", { required: true });
      assertSyntheticNote(draft.payload.operatorNote, "operatorNote");
      return;
    case "reservation_create":
      assertSyntheticLabel(
        draft.payload.displayName ?? draft.payload.guestLabel,
        "displayName",
        { required: true },
      );
      assertNoPhone(draft.payload.phone);
      assertSyntheticEmail(draft.payload.email);
      assertSyntheticNote(draft.payload.operatorNote, "operatorNote");
      if (draft.payload.notificationPreference !== "none") {
        throw new DemoValidationError("notificationPreference");
      }
      return;
    case "reservation_update":
      assertSyntheticLabel(draft.payload.guestLabel, "guestLabel", { required: true });
      assertSyntheticNote(draft.payload.operatorNote, "operatorNote");
      if (draft.payload.notificationPreference !== "none") {
        throw new DemoValidationError("notificationPreference");
      }
      return;
    case "block_create":
    case "block_update":
      assertSyntheticNote(draft.payload.memo, "memo");
      return;
    case "block_cancel":
      return;
  }
}

export function validateWaitlistAction(action: WaitlistAction) {
  if (action.action !== "create") return;
  assertSyntheticLabel(action.payload.guestLabel, "guestLabel", { required: true });
  assertSyntheticEmail(action.payload.email);
}

export function validateStaffAction(action: StaffAction) {
  if (action.action === "create" || action.action === "update") {
    assertSyntheticLabel(action.payload.displayName, "displayName", { required: true });
  }
}

export function validateCustomerPatch(patch: DemoCustomerPatch) {
  assertNoSecretLikeValue(patch.nationalityCode, "nationalityCode");
  if (patch.birthDate?.trim()) throw new DemoValidationError("birthDate");
  if (patch.anniversaryDate?.trim()) throw new DemoValidationError("anniversaryDate");
  if (patch.vipRank) {
    assertSyntheticLabel(patch.vipRank, "vipRank", { required: true, maximum: 32 });
  }
}

export function hasPhoneLikeSequence(value: string) {
  return PHONE_LIKE_PATTERN.test(value);
}

export function hasSecretLikeSequence(value: string) {
  return SECRET_LIKE_PATTERN.test(value);
}
