type ErrorRecord = Record<string, unknown>;

export type VipOperationFailure = {
  code: string;
  message: string;
  recovery: string;
};

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorCode(payload: ErrorRecord, status: number) {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  if (
    isRecord(payload.error)
    && typeof payload.error.code === "string"
    && payload.error.code.trim()
  ) {
    return payload.error.code.trim();
  }
  if (typeof payload.code === "string" && payload.code.trim()) {
    return payload.code.trim();
  }
  return `HTTP_${status}`;
}

function readErrorDetails(payload: ErrorRecord) {
  if (isRecord(payload.details)) return payload.details;
  if (isRecord(payload.error) && isRecord(payload.error.details)) {
    return payload.error.details;
  }
  return {};
}

export function readVipOperationFailure(
  status: number,
  payload: ErrorRecord,
): VipOperationFailure {
  const code = readErrorCode(payload, status);
  const details = readErrorDetails(payload);
  const field = typeof details.field === "string" ? details.field : null;

  if (status === 401 || code === "UNAUTHENTICATED" || code === "invalid_admin_session") {
    return {
      code,
      message: "管理セッションが終了したため保存していません。",
      recovery: "ページを再読込し、Ownerのユーザー名とパスワードで開き直してください。",
    };
  }

  if (
    status === 403
    || code === "FORBIDDEN"
    || code === "ADMIN_MUTATION_DISABLED"
    || code === "admin_mutation_disabled"
  ) {
    return {
      code,
      message: "現在の権限または更新設定では保存できません。",
      recovery: "Owner権限と更新スイッチを確認してから再試行してください。",
    };
  }

  if (code === "VERSION_CONFLICT" || field === "expectedTableVersions") {
    return {
      code,
      message: "別の端末で卓情報が更新されたため、古い台帳からの保存を止めました。",
      recovery: "最新台帳を読み込みました。空き状況を確認し、卓を選び直してください。",
    };
  }

  if (code === "TABLE_TIME_CONFLICT") {
    return {
      code,
      message: "指定した時間帯は別の予約と重なっているため保存していません。",
      recovery: "最新台帳で卓と利用時間を選び直してください。",
    };
  }

  if (code === "BLOCK_CONFLICT") {
    return {
      code,
      message: "指定した卓または時間帯に受付ブロックがあるため保存していません。",
      recovery: "有効ブロックを確認し、別の卓・時間を選ぶかブロックを先に解除してください。",
    };
  }

  if (code === "TABLE_LOCKED") {
    return {
      code,
      message: "選択した卓は現在ロック中のため保存していません。",
      recovery: "最新台帳で利用可能な卓を選び直してください。",
    };
  }

  if (code === "CAPACITY_WARNING_REQUIRES_OVERRIDE" || field === "guestCount") {
    return {
      code,
      message: "人数が選択したプランまたは卓の受付範囲と一致していません。",
      recovery: "プランの人数範囲と卓の定員を確認して修正してください。",
    };
  }

  if (
    field === "eventDayId"
    || field === "scheduledStartAt"
    || field === "scheduledEndAt"
  ) {
    return {
      code,
      message: "指定した日時が現在の営業枠と一致していないため保存していません。",
      recovery: "営業日と開始・終了時刻を確認して修正してください。",
    };
  }

  if (code === "SLOT_COMPATIBILITY_MISSING") {
    return {
      code,
      message: "この営業日にはWalk-inを登録できる営業枠がありません。",
      recovery: "営業日設定を確認するか、別の営業日を選択してください。",
    };
  }

  if (status === 409) {
    return {
      code,
      message: "別の端末で台帳が更新されたため、競合する保存を止めました。",
      recovery: "最新台帳を読み込みました。内容と空き卓を確認して再試行してください。",
    };
  }

  if (status === 400 || code === "INVALID_COMMAND") {
    return {
      code,
      message: "入力内容を受け付けられなかったため保存していません。",
      recovery: "営業日、時刻、人数、プラン、卓を確認して再試行してください。",
    };
  }

  if (status === 429) {
    return {
      code,
      message: "短時間の操作回数が上限に達したため保存していません。",
      recovery: "少し待ってから再試行してください。",
    };
  }

  if (status >= 500) {
    return {
      code,
      message: "サーバー側で保存処理を完了できませんでした。",
      recovery: "台帳を再読込し、保存されていないことを確認してから再試行してください。",
    };
  }

  return {
    code,
    message: "保存処理を完了できませんでした。",
    recovery: "最新台帳を読み込み、入力内容を確認して再試行してください。",
  };
}
