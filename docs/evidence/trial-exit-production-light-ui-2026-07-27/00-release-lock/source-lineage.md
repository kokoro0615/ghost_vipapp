# Source lineage

Frozen: 2026-07-27 02:17 JST

## VIP App

- The ordinary `/home/kokoro/projects/clients/ghost_vipapp` worktree is based on
  `08ecb1f` and contains large pre-existing dirty/untracked candidate work. It is
  preserved and is not a build source.
- The isolated release worktree is
  `/home/kokoro/projects/clients/ghost/.worktrees/vip-manager-production-light-ui`.
- Its starting commit is `4112cbe5d8dd1b377f61d26b2835f514c11f28d1`.
- Compared with deployed Trial code `2e41ebde4926b7faac96c8de2a5c09dcc66e0f1d`,
  the only path delta is the Trial release evidence document. The deployed code
  tree remains exactly `90ba4fd0dbd96722108e8c7b37b94db9f8f35a74`.

## Website backend

- The ordinary `website` worktree contains unrelated existing changes and is not
  a build or migration source.
- The isolated backend worktree is
  `/home/kokoro/projects/clients/ghost/.worktrees/vip-manager-production-backend`.
- It starts from the remote Trial backend source
  `41dd0f9956127256239d9f364978dc9fd56db331`, tree
  `a52c0970afc1cfc3bae5c1b298c831ad9689e637`.

## External lineage

| Surface | Frozen deployment | State |
|---|---|---|
| VIP fixed URL | `dpl_3kwpgwP3H3wQ7CnEwoHU7ZbdYxBR` | READY / Production target / Trial data plane |
| Website staging | `dpl_CowRobEHY49Aye2xyc9geWGNh5J9` | READY / `staging` target |
| Website production | `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP` | READY / unchanged |
| VIP rollback | `dpl_EaWM11t7saE1CLYgpvgBkQt7jPEi` | READY / Trial-era authentication |

The VIP rollback artifact must be rebuilt or re-proven with permanent
credentials before it can be the final production rollback anchor.

## Missing prescribed references

`.Codex/docs/DESIGN.md` does not exist in the workspace. The execution used the
root and repository `AGENTS.md`, `website/docs/ui/UI_TOOLKIT.md`, the canonical
VIP specification/plan, installed Next.js 16.2.11 documentation, and the
TableCheck public-reference manifest instead. No missing file was inferred.
