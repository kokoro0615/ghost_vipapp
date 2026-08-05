import type { AdminSessionActor } from "./ghostAdminProxy";

type SessionResult =
  | { ok: true; status: number; actor: AdminSessionActor }
  | { ok: false; status: number };

export type AdminOperationAccessDependencies = {
  readToken(request: Request): string | null;
  readSession(token: string): Promise<SessionResult>;
};

export type AdminOperationAccess =
  | { ok: true; token: string; actor: AdminSessionActor }
  | { ok: false; status: number; error: "missing_admin_session" | "invalid_admin_session" | "insufficient_role" };

export async function resolveAdminOperationAccess(
  request: Request,
  dependencies: AdminOperationAccessDependencies,
  options: { ownerOnly?: boolean } = {},
): Promise<AdminOperationAccess> {
  const token = dependencies.readToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "missing_admin_session" };
  }

  const session = await dependencies.readSession(token);
  if (!session.ok) {
    return {
      ok: false,
      status: session.status || 401,
      error: "invalid_admin_session",
    };
  }

  if (options.ownerOnly && session.actor.role !== "owner") {
    return { ok: false, status: 403, error: "insufficient_role" };
  }

  return { ok: true, token, actor: session.actor };
}
