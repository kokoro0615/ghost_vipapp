import {
  copyJson,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";
import {
  projectTicketOperationMutation,
  readTicketOperationCommand,
  requireVipTicketCapability,
  ticketOperationCommandBody,
  ticketOperationsContractFailure,
  ticketOperationsFetch,
  ticketOperationsJson,
  ticketOperationsUpstreamFailure,
} from "@/lib/server/ticketOperationsProxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminOperation(request, { ownerOnly: true });
  if (!auth.ok) return ticketOperationsJson({ ok: false, error: "owner_session_required" }, auth.response.status);
  const gate = requireVipTicketCapability("refund");
  if (!gate.ok) return gate.response;
  const parsed = await readTicketOperationCommand(request, "refund_resolve");
  if (!parsed.ok) return parsed.response;
  const body = ticketOperationCommandBody(parsed.command);
  const response = await ticketOperationsFetch(
    "/api/admin/v2/tickets/refund-reviews/resolve",
    {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": parsed.idempotencyKey },
      body: JSON.stringify(body),
    },
    auth.token,
  );
  const payload = await copyJson(response);
  if (!response.ok) return ticketOperationsUpstreamFailure(payload, response.status);
  try {
    return ticketOperationsJson(projectTicketOperationMutation(payload), response.status);
  } catch {
    return ticketOperationsContractFailure();
  }
}
