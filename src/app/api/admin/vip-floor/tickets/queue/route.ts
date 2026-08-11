import {
  copyJson,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";
import {
  projectTicketOperationsQueue,
  requireVipTicketCapability,
  ticketOperationsContractFailure,
  ticketOperationsFetch,
  ticketOperationsJson,
  ticketOperationsUpstreamFailure,
} from "@/lib/server/ticketOperationsProxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminOperation(request, { ownerOnly: true });
  if (!auth.ok) {
    return ticketOperationsJson({ ok: false, error: "owner_session_required" }, auth.response.status);
  }
  const gate = requireVipTicketCapability("any");
  if (!gate.ok) return gate.response;

  const requestedScope = new URL(request.url).searchParams.get("scope");
  const scope = requestedScope === "refund" ? "refund" : requestedScope === "all" ? "all" : null;
  if (!scope) {
    return ticketOperationsJson({ ok: false, error: "invalid_scope" }, 400);
  }
  if (scope === "all" && !gate.capabilities.managerOperationsEnabled) {
    return ticketOperationsJson({ ok: false, error: "ticket_operation_capability_disabled" }, 404);
  }
  if (scope === "refund" && !gate.capabilities.refundReviewEnabled) {
    return ticketOperationsJson({ ok: false, error: "ticket_operation_capability_disabled" }, 404);
  }

  const response = await ticketOperationsFetch(
    `/api/admin/v2/tickets/queue?scope=${scope}`,
    { method: "GET", cache: "no-store" },
    auth.token,
  );
  const payload = await copyJson(response);
  if (!response.ok) return ticketOperationsUpstreamFailure(payload, response.status);
  try {
    return ticketOperationsJson(projectTicketOperationsQueue(payload), response.status);
  } catch {
    return ticketOperationsContractFailure();
  }
}
