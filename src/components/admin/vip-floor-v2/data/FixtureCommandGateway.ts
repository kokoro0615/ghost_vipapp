import type { ReservationBlockV2, ReservationNoteSummaryV2, VipFloorBoardV2, VipFloorReservationV2 } from "@/lib/vipFloorV2Contract";

import type { FixtureCommandDraft, FixtureCommandOutcome, FixtureResultMode } from "../contract/uiTypes";
import { calculateTotals } from "./fixtures";

const FAILURE_BY_MODE: Record<Exclude<FixtureResultMode, "success">, { message: string; recovery: string }> = {
  validation: { message: "入力内容を確認してください。", recovery: "表示された項目を修正して、もう一度確認へ進んでください。" },
  permission: { message: "この端末には更新権限がありません。", recovery: "閲覧を続けるか、フロア責任者へ引き継いでください。" },
  version_conflict: { message: "別の端末で予約が更新されました。", recovery: "最新の版を確認し、変更内容を作り直してください。" },
  time_conflict: { message: "選択した時間は別予約と重なります。", recovery: "timelineで空き時間を選ぶか、別の席を指定してください。" },
  block_conflict: { message: "予約ブロックと競合しています。", recovery: "blockの対象と時間を確認してから再実行してください。" },
  capacity_override: { message: "席の推奨定員を超えています。", recovery: "責任者理由を入力してoverrideを明示するか、席を追加してください。" },
};

const CODE_BY_MODE = {
  validation: "INVALID_COMMAND",
  permission: "FORBIDDEN",
  version_conflict: "VERSION_CONFLICT",
  time_conflict: "TABLE_TIME_CONFLICT",
  block_conflict: "BLOCK_CONFLICT",
  capacity_override: "CAPACITY_WARNING_REQUIRES_OVERRIDE",
} as const;

function fixtureId(namespace: number, revision: number) {
  return `${String(namespace).padStart(8, "0")}-0000-4000-8000-${String(revision).padStart(12, "0")}`;
}

function resultLabel(kind: FixtureCommandDraft["kind"]) {
  return {
    service_status: "接客状態を更新",
    check_in: "チェックインを記録",
    assignment: "席割当を更新",
    schedule: "予約時間を更新",
    seat_extension: "利用時間を延長",
    block: "予約ブロックを更新",
    note: "フロアメモを保存",
    walk_in: "店頭VIPを登録",
    cancel_refund: "取消・返金判断を記録",
    customer: "顧客情報を更新",
  }[kind];
}

export class FixtureCommandGateway {
  async execute(board: VipFloorBoardV2, draft: FixtureCommandDraft, mode: FixtureResultMode): Promise<FixtureCommandOutcome> {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 180));

    if (mode !== "success") {
      const failure = FAILURE_BY_MODE[mode];
      return { ok: false, code: CODE_BY_MODE[mode], message: failure.message, recovery: failure.recovery };
    }

    const next = structuredClone(board);
    next.boardRevision += 1;
    next.generatedAt = new Date(new Date(next.generatedAt).getTime() + 60_000).toISOString();
    const reservation = draft.reservationId ? next.reservations.find((item) => item.id === draft.reservationId) : null;

    if (draft.kind !== "block" && draft.kind !== "walk_in" && !reservation) {
      return { ok: false, code: "NOT_FOUND", message: "対象の予約を確認できません。", recovery: "予約を選び直してください。" };
    }

    switch (draft.kind) {
      case "service_status":
      case "check_in": {
        if (!reservation) break;
        reservation.serviceStatus = draft.payload.toStatus;
        reservation.version += 1;
        if (draft.payload.toStatus === "seated") reservation.actualSeatedAt = draft.payload.occurredAt;
        break;
      }
      case "assignment": {
        if (!reservation) break;
        const tableIds = draft.payload.operation === "unassign"
          ? []
          : draft.payload.operation === "add"
            ? [...new Set([...reservation.tableIds, ...draft.payload.tableIds])]
            : draft.payload.operation === "remove"
              ? reservation.tableIds.filter((id) => !draft.payload.tableIds.includes(id))
              : [...draft.payload.tableIds];
        reservation.tableIds = tableIds;
        reservation.version += 1;
        next.assignments = next.assignments.filter((item) => item.reservationId !== reservation.id);
        reservation.assignmentIds = tableIds.map((tableId, index) => {
          const assignmentId = fixtureId(61, next.boardRevision * 10 + index);
          next.assignments.push({
            id: assignmentId,
            version: 1,
            reservationId: reservation.id,
            tableId,
            lockStatus: "confirmed",
            assignmentRole: index === 0 ? "primary" : "connected",
            startAt: reservation.scheduledStartAt,
            endAt: reservation.scheduledEndAt,
            updatedAt: next.generatedAt,
          });
          return assignmentId;
        });
        break;
      }
      case "schedule": {
        if (!reservation) break;
        reservation.scheduledStartAt = draft.payload.scheduledStartAt;
        reservation.scheduledEndAt = draft.payload.scheduledEndAt;
        reservation.expectedReleaseAt = draft.payload.scheduledEndAt;
        reservation.version += 1;
        next.assignments.filter((item) => item.reservationId === reservation.id).forEach((item) => {
          item.startAt = draft.payload.scheduledStartAt;
          item.endAt = draft.payload.scheduledEndAt;
          item.version += 1;
        });
        break;
      }
      case "seat_extension": {
        if (!reservation) break;
        const end = new Date(new Date(reservation.scheduledEndAt).getTime() + draft.payload.extendMinutes * 60_000).toISOString();
        reservation.scheduledEndAt = end;
        reservation.expectedReleaseAt = end;
        reservation.version += 1;
        break;
      }
      case "block": {
        const payload = draft.payload;
        const existing = draft.blockId ? next.blocks.find((block) => block.id === draft.blockId) : null;
        if (draft.operation === "remove" && existing) {
          next.blocks = next.blocks.filter((block) => block.id !== existing.id);
          break;
        }
        const block: ReservationBlockV2 = existing ?? {
          id: fixtureId(62, next.boardRevision),
          version: 1,
          scope: payload.scope,
          kind: payload.kind,
          startAt: payload.startAt,
          endAt: payload.endAt,
          memo: payload.memo,
          targets: { venueWide: payload.venueWide, sectionIds: payload.floorSectionIds, tableIds: payload.seatResourceIds },
          updatedAt: next.generatedAt,
        };
        Object.assign(block, {
          version: existing ? existing.version + 1 : 1,
          scope: payload.scope,
          kind: payload.kind,
          startAt: payload.startAt,
          endAt: payload.endAt,
          memo: payload.memo,
          targets: { venueWide: payload.venueWide, sectionIds: payload.floorSectionIds, tableIds: payload.seatResourceIds },
          updatedAt: next.generatedAt,
        });
        if (!existing) next.blocks.push(block);
        break;
      }
      case "note": {
        if (!reservation) break;
        const existing = draft.payload.noteId ? next.notes.find((note) => note.id === draft.payload.noteId) : null;
        if (existing) {
          existing.body = draft.payload.body;
          existing.kind = draft.payload.kind;
          existing.pinned = draft.payload.pinned;
          existing.version += 1;
          existing.updatedAt = next.generatedAt;
        } else {
          next.notes.push({
            id: fixtureId(63, next.boardRevision),
            reservationId: reservation.id,
            kind: draft.payload.kind,
            body: draft.payload.body,
            pinned: draft.payload.pinned,
            version: 1,
            updatedAt: next.generatedAt,
          } satisfies ReservationNoteSummaryV2);
        }
        break;
      }
      case "walk_in": {
        const payload = draft.payload;
        const id = fixtureId(64, next.boardRevision);
        const reservationItem: VipFloorReservationV2 = {
          id,
          version: 1,
          publicCode: `W${String(next.boardRevision).padStart(5, "0")}`,
          businessDate: next.businessDay.businessDate,
          lifecycleStatus: "confirmed",
          serviceStatus: "arrived",
          sourceChannel: "walk_in",
          scheduledStartAt: payload.scheduledStartAt,
          scheduledEndAt: payload.scheduledEndAt,
          expectedReleaseAt: payload.scheduledEndAt,
          actualSeatedAt: null,
          completedAt: null,
          guestCount: { total: payload.guestCount, adults: payload.guestCount, children: 0 },
          assignmentIds: [],
          tableIds: payload.tableIds,
          customer: { displayNameMasked: payload.guestLabel ?? "店頭ゲスト", masked: true },
          payment: { status: "counter_review", amountYen: 0 },
          notes: [],
          flags: payload.capacityOverride ? ["capacity_override"] : [],
          updatedAt: next.generatedAt,
        };
        next.reservations.push(reservationItem);
        break;
      }
      case "cancel_refund": {
        if (!reservation) break;
        reservation.lifecycleStatus = "cancelled";
        reservation.serviceStatus = "completed";
        reservation.flags = draft.payload.refundDecision === "review" ? ["payment_review"] : [];
        reservation.version += 1;
        break;
      }
      case "customer": {
        if (!reservation) break;
        reservation.customer = {
          displayNameMasked: draft.payload.displayName || "マスク済みゲスト",
          nameKanaMasked: draft.payload.nameKana,
          languageCode: draft.payload.languageCode,
          allergies: draft.payload.allergies,
          preferences: draft.payload.preferences,
          masked: true,
        };
        reservation.version += 1;
        break;
      }
    }

    next.unassignedReservationIds = next.reservations.filter((item) => item.tableIds.length === 0).map((item) => item.id);
    next.tables.forEach((table) => {
      table.reservationIds = next.reservations.filter((item) => item.tableIds.includes(table.id)).map((item) => item.id);
      table.blockIds = next.blocks.filter((item) => item.targets.tableIds.includes(table.id)).map((item) => item.id);
    });
    next.totals = calculateTotals(next);

    return {
      ok: true,
      board: next,
      message: `${resultLabel(draft.kind)}しました。fixture stateへ反映済みです。`,
      auditLabel: `${draft.kind} / revision ${next.boardRevision}`,
    };
  }
}
