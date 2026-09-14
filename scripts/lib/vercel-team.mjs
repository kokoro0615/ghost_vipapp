// Changing this selector prepares tooling; it never transfers a Vercel project.
// Ownership moved on 2026-09-14. Source is retained for explicit recovery reads.
export const GHOST_VERCEL_TEAMS = Object.freeze({
  source: Object.freeze({
    profile: "source",
    teamId: "team_VHoP9car1gK30q4ideCMW0g5",
    scope: "projects-b6224582",
  }),
  destination: Object.freeze({
    profile: "destination",
    teamId: "team_jigv2yIrWezsBSkwtlQS1e9F",
    scope: "kokoro06152002-7861s-projects",
  }),
});

export function getGhostVercelTeam(environment = process.env) {
  const profile = environment.GHOST_VERCEL_TEAM_PROFILE ?? "destination";
  if (!Object.hasOwn(GHOST_VERCEL_TEAMS, profile)) {
    throw new Error("ghost_vercel_team_profile_invalid");
  }
  const team = GHOST_VERCEL_TEAMS[profile];
  // A stale CLI override must fail rather than silently select another team.
  for (const key of ["VERCEL_TEAM_ID", "VERCEL_ORG_ID"]) {
    if (environment[key] && environment[key] !== team.teamId) {
      throw new Error(`ghost_vercel_team_override_mismatch:${key}`);
    }
  }
  return team;
}
