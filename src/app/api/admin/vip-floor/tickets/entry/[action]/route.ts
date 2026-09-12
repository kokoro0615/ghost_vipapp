import { copyJson, requireAdminOperation } from "@/lib/server/ghostAdminProxy";
import { projectTicketOperationMutation, readTicketOperationCommand, requireVipTicketCapability, ticketOperationCommandBody, ticketOperationsContractFailure, ticketOperationsFetch, ticketOperationsJson, ticketOperationsUpstreamFailure } from "@/lib/server/ticketOperationsProxy";
import type { TicketEntryRecoveryAction } from "@/lib/ticketOperationsContract";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const auth = await requireAdminOperation(request, { ownerOnly: true });
  if (!auth.ok) return ticketOperationsJson({ ok: false, error: "owner_session_required" }, auth.response.status);
  const part = (await context.params).action;
  if (!["rotate", "revoke", "resend", "exception"].includes(part)) return ticketOperationsJson({ ok: false, error: "invalid_request" }, 404);
  const gate = requireVipTicketCapability("manager");
  if (!gate.ok) return gate.response;
  const parsed = await readTicketOperationCommand(request, `entry_${part}` as TicketEntryRecoveryAction);
  if (!parsed.ok) return parsed.response;
  const response = await ticketOperationsFetch(`/api/admin/v2/tickets/entry/${part}`, {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": parsed.idempotencyKey }, body: JSON.stringify(ticketOperationCommandBody(parsed.command)),
  }, auth.token);
  const payload = await copyJson(response);
  if (!response.ok) return ticketOperationsUpstreamFailure(payload, response.status);
  try { return ticketOperationsJson(projectTicketOperationMutation(payload), response.status); } catch { return ticketOperationsContractFailure(); }
}
