import {
  copyJson,
  requireAdminOperation,
} from "@/lib/server/ghostAdminProxy";
import {
  projectTicketOperationsCapabilities,
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

  const response = await ticketOperationsFetch(
    "/api/admin/v2/tickets/capabilities",
    { method: "GET", cache: "no-store" },
    auth.token,
  );
  const payload = await copyJson(response);
  if (!response.ok) return ticketOperationsUpstreamFailure(payload, response.status);
  try {
    return ticketOperationsJson(
      projectTicketOperationsCapabilities(payload, gate.capabilities),
      response.status,
    );
  } catch {
    return ticketOperationsContractFailure();
  }
}
