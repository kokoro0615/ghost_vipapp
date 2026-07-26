# TableCheck VIP Floor UI-first end-to-end implementation plan

Date: 2026-07-23 JST  
Plan status: ready for exact Owner adoption; not authorized; implementation 0  
Research: `docs/research/tablecheck-vip-floor-ui-first-research-2026-07-23.md`  
Research SHA-256: `221f7046d315e8ae158389433994b1df1472966055f58993089230e196f71caf`

## 1. Outcome

Gate Cの進行を待たず、isolated UI-first lineageでVIP FloorのUI layerを完成させる。完成範囲は全responsive surface、全visual/data state、全command flowのfixture interaction、accessibility、local build、browser evidence、handoff manifestまでとする。

実API/auth/capability/feature flag/provider/database/deploy/production route cutoverは実施しない。UI-firstのterminalは次の一つだけである。

```text
UI_FIRST_IMPLEMENTATION_COMPLETE_AWAITING_GATE_C_INTEGRATION
```

このterminalはGate C PASS、Gate D START/PASS、integration complete、release readyのいずれも意味しない。

## 2. Immutable lineage and source seed

### Gate C sibling lineage

| Evidence | SHA-256 |
|---|---|
| V17 nonterminal checkpoint | `d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61` |
| V17 aggregate review | `b113a5a2df209ac1fd9113dcae71bc8840ec02fe067f69e379226b288047fa88` |
| V17 tooling manifest r2 | `359789d9bccb9ad956c890a91899f56396e70ab0679838102e4ac95b70a16894` |
| V17 runtime bundle | `302acb01bd0945b364024dbee282e1e88008afc926f356b63714a80132c51031` |
| V18 directive | `f2fa911fe59b74e0510b250cd9565324b46da2ebcf3592f22d19210d892c33ec` |
| V18 research | `688b74a6e4b045c0a630941e97ba75b812bd046e0af162a0efb8ebe6b6fb9a89` |
| V18 proposal | `2947616d3960dd51571f75b6bb49cfba60de3edf3393e48bb04fdd47370da400` |
| V18 prompt | `af49878dc48bbf0dcf50e3edf8fc0db614c74a53940cb57b2934184b2ba3d080` |

UI-firstはV18を採用・修正・supersedeしない。V17 checkpointを共通ancestorとして参照する別siblingである。UI-firstのcall/mutation/evidenceはGate C/V18 counterへ算入せず、Gate C evidenceとしても使用しない。

### Git seed

- website repository base commit: `5a3a99acf563c10af6bc68526773281d46f4d01a`
- proposed branch: `codex/vip-floor-ui-first-v1`
- proposed worktree: `/home/kokoro/projects/clients/ghost/.worktrees/vip-floor-ui-first-v1`
- current `website/` worktree: read-only during UI execution; root `docs/AI_CURRENT_STATUS.md` and `docs/AI_WORK_LOG.md` coordination write-backだけを除外

### Exact allowed seed reads

| File | SHA-256 | Use |
|---|---|---|
| `AGENTS.md` | `54027a103c80f6146d27ef391b4d23170da16bf002fbfc7659acedba49c00a0a` | repository UI rules |
| `docs/ui/UI_TOOLKIT.md` | `4873824cfd5f69ee26f5c736015722004e3f61129b2c4a57f27e4dca9551916f` | component/token constraints |
| `docs/design-references/vip-floor-tablecheck/source-manifest.md` | `c30aba1e87ca8dfc65b2757f8f9f5068e3bbac2047a0fed68cb337b530d874a5` | legal/reference boundary |
| `src/lib/vipFloorV2Contract.ts` | `70ee0cf8010b900c78407fbd3986c29199a76426722aaf27e8ba12931b08bef5` | exact UI data/command seed |
| `src/app/globals.css` | `d47bd68a6e6e5750b353868606216791635825e9e2c9b7e131afd0f2fa36c898` | existing GHOST tokens/font variables |
| `src/data/vipReservationConfig.ts` | `70a1b698e2a5a216c282e23b4b626d9582a4b2fd943df1d086d693c350bca12f` | map configuration |
| `src/data/vipSeats.ts` | `ab19ed5c0a55c27f370e3ec6c8f16eb89858529ab2193a7f178597e2a5bb882d` | GHOST table facts |
| `src/data/vipSeatHotspots.ts` | `fb1fe271ab27f3c5b5683a0c0fd647948c86d809d599f6748968d237ddabd13c` | real map geometry |
| `src/generated/media-manifest.ts` | `dfe8a38e66b3efbc5ad7865aa4712d88c1264ca8d891e94eba610e078fd5dac8` | asset metadata |
| `public/media/images/vipmapv3.9239fd2174.webp` | `9239fd2174a6e6cf942e40e5aaaeaf981c1d3db53b99b1d12b4fffcf12632319` | owned floor map |
| `src/components/admin/VipFloorDashboard.tsx` | `8ac3eae5c2247b9d9ad281e38492110561bec517b894ee8073a3e6cdc49967e6` | behavior inventory only |
| `src/components/admin/vip-floor/preview.ts` | `a5ae21bdbade0ef0504fa8c714cc59797d5898034ae360938f424bcf00701feb` | legacy fixture inventory only |
| `src/components/admin/vip-floor/types.ts` | `1a562aae790002de4cc934129ae4e0bb883c7df7a42c36afd02281de4e480da0` | legacy state comparison only |

Hash mismatch時は自動的に最新bytesを採用しない。current workspaceを変更せず、差分をcheckpointとして記録してOwner判断を待つ。

## 3. Authority boundary

### Future adoptionで許可すること

- exact base commitからlocal branch/worktreeを一つ作る。
- allowlisted seed filesをreadし、exact contract seedをisolated worktreeへcopyする。
- isolated worktree内だけでadditive UI source、fixture、verification script、local-only preview route、evidenceを作成・修正する。
- existing dependenciesだけを使う。
- local lint、typecheck、build、localhost preview、browser interaction、screenshotsを実行する。
- public Google font build assetsがcacheに無い場合だけ、認証なしGETを`fonts.googleapis.com`と`fonts.gstatic.com`へ限定して許可する。
- local UI branchへ小さなcheckpoint commitとfinal commitを作成する。

### 絶対禁止

- current `website/` source、migration、package、lock、Gate C tools/artifacts/evidenceの書換え。
- Gate C/V18 fileのrename、delete、rewrite、rehash、counter利用。
- API route、auth、feature flag、server command、database、Stripe、Vercel、Supabase、LINE、customer dataへの接続。
- production/preview/staging deploy、provider mutation、Git push、merge、PR、route cutover。
- package install、new dependency、package.json/package-lock mutation。
- real PII、credential、token、cookie、JWT、private URL/path/provider identifierのread/output。
- TableCheck asset、brand、CSS、font、DOM、copy、screenshotのrepository保存またはpixel copy。
- UI-first terminalからGate C/D/E PASSを推定すること。

Repository-wide rulesに従う最終write-backとして、rootの`docs/AI_CURRENT_STATUS.md`更新と`docs/AI_WORK_LOG.md`への1行appendだけは許可する。これはUI source/evidence lineageには含めない。

## 4. Completion definition

全項目がPASSして初めてUI-first completeとする。

### Surface completeness

- desktop floor view
- desktop timeline chart view
- desktop dense list view
- queue/exception rail
- reservation/table/block inspector
- command palette and dialogs
- mobile list-first view
- mobile floor grid/map view
- mobile chart view
- mobile bottom sheet
- mobile multi-step command wizard
- loading, empty, stale, reconnecting, error, read-only states

### Interaction completeness

- date/service/section/view switching
- selection sync across floor/chart/list/queue/inspector
- search, sort, filter, density, zoom
- status transition/check-in/no-show/service progression
- assign/add/remove/unassign table
- schedule change and seat extension
- reservation block create/edit/remove flow
- note create/edit/pin flow
- walk-in creation flow
- cancellation/refund decision flow
- customer edit/masked display flow
- success, validation, permission, version conflict, time conflict, block conflict, capacity override flows
- pointer, touch, keyboard alternatives

### Quality completeness

- no forbidden AI visual patterns
- GHOST first-viewport identity
- no page horizontal overflow at 320px+
- important mobile targets 44px+
- visible focus and non-color status cues
- reduced-motion behavior
- targeted lint and typecheck pass
- production build pass
- network-forbidden static scan pass
- responsive screenshots and interaction evidence pass
- final manifest contains every changed file hash

## 5. Proposed file ownership map

Only the following paths may be added/modified in the UI worktree.

```text
src/app/admin/vip-floor/ui-first/
  page.tsx
  loading.tsx
  error.tsx
  not-found.tsx                       # only if required

src/components/admin/vip-floor-v2/
  VipFloorWorkspace.tsx
  VipFloorWorkspace.module.css
  contract/
    uiTypes.ts
    viewModel.ts
    statusModel.ts
  data/
    fixtures.ts
    fixtureScenarios.ts
    FixtureCommandGateway.ts
  state/
    reducer.ts
    selectors.ts
    useVipFloorWorkspace.ts
  shell/
    OperationsShell.tsx
    NavRail.tsx
    ServiceRibbon.tsx
    ExceptionRail.tsx
    ViewSwitcher.tsx
  floor/
    FloorView.tsx
    FloorCanvas.tsx
    TableNode.tsx
    FloorLegend.tsx
  timeline/
    TimelineView.tsx
    TimelineGrid.tsx
    ReservationBar.tsx
    UnassignedTray.tsx
  list/
    ReservationListView.tsx
    ReservationRow.tsx
    ListToolbar.tsx
  inspector/
    Inspector.tsx
    OverviewTab.tsx
    GuestTab.tsx
    ServiceTab.tsx
    PaymentTab.tsx
    NotesTab.tsx
    HistoryTab.tsx
  commands/
    CommandCenter.tsx
    StatusCommand.tsx
    AssignmentCommand.tsx
    ScheduleCommand.tsx
    BlockCommand.tsx
    NoteCommand.tsx
    WalkInCommand.tsx
    CancelCommand.tsx
    CustomerCommand.tsx
  mobile/
    MobileWorkspace.tsx
    MobileActionDock.tsx
    MobileInspectorSheet.tsx
    MobileCommandWizard.tsx
  shared/
    OperationalBadge.tsx
    EmptyState.tsx
    ErrorState.tsx
    Skeleton.tsx
    LiveMessage.tsx

scripts/
  verify-vip-floor-ui-first.mjs

docs/evidence/vip-floor-ui-first/
  ...generated screenshots and JSON/Markdown evidence...
```

`src/lib/vipFloorV2Contract.ts`はexact seedとしてworktreeへ追加できるが、UI implementation commitとは分離する。post-Gate C integrationではcanonical contractをsource of truthとし、seed commitをそのままproductionへmergeしない。

既存`src/app/admin/vip-floor/page.tsx`、`src/components/admin/VipFloorDashboard.tsx`、`src/app/globals.css`はUI-first中に変更しない。これによりv1 fallbackとcurrent routeを保持する。

## 6. Execution waves

### U0 — Authority and isolation preflight

Entry:

- Ownerがrole codeとproposal SHAをexact 2行で返信済み。
- current Gate C statusがHOLDまたは未PASSであってよい。

Actions:

1. authority message、proposal、directive、research、planのSHAを検証する。
2. V17/V18 sibling hashesを再検証する。
3. current `website/` statusをsnapshotし、既存dirty filesを記録する。
4. base commit、branch名、worktree pathの衝突をread-only確認する。
5. isolated branch/worktreeを作成する。
6. current workspaceとworktreeが別path/inodeであることを確認する。
7. exact seed hashesを検証し、contract seedだけをcopyする。
8. original node_modulesをread-only共有する場合はuntracked symlinkとし、commit対象外にする。
9. preflight evidenceを保存する。

Exit:

- current workspace changed file count = 0
- Gate C/V17/V18 hash drift = 0
- seed mismatch = 0
- network/private/provider call = 0

Fail closed:

- seed mismatch、existing branch ownership不明、worktree collision、current workspace writeがあれば停止。

### U1 — Design contract and static shell

Actions:

1. `GHOST Operational Lacquer`のcomponent tokenをCSS Module rootへ定義する。
2. 56px nav rail、service ribbon、left exception rail、elastic workspace、right inspectorを作る。
3. visual density、typography、separator、focus、status primitiveを先に完成させる。
4. local-only preview routeをServer Componentで作る。
5. `NODE_ENV=production`ではpreview routeを`notFound()`へ閉じる。
6. workspaceのClient boundaryを最小化する。

Exit:

- 1440 desktop shellと390 mobile shellでfirst viewport gate PASS。
- white/blue SaaS、glass、orb、generic card gridが0。
- current route/source変更0。

### U2 — Contract fixture and state engine

Actions:

1. `VipFloorBoardV2`からUI view modelへのpure mapperを作る。
2. exhaustive status metadataとnon-color cuesを作る。
3. deterministic scenario registryを作る。
4. reducer/selectorsでview、selection、filter、pane、command draft、resultを管理する。
5. `FixtureCommandGateway`をmemory-onlyで実装する。
6. forbidden `fetch`/XHR/WebSocket/EventSource/server action/provider import scanを作る。
7. success/error/conflict/delayをseeded deterministicに再現する。

Exit:

- required scenario全部がroute queryまたはlocal selectorから再現可能。
- canonical contract fieldの無断拡張0。
- network-capable code 0。

### U3 — Floor, chart, list

#### Floor

- real `vipmapv3`、hotspot geometry、section filter、zoom、selection、lock/block、connected tableを実装。
- table nodeにcode/capacity/status/timeを表示。
- pointerとkeyboardで同じselection/actionへ到達。

#### Timeline

- business window、15分grid、now line、reservation bar、turnover、block、conflict、unassigned trayを実装。
- 15/30/60分zoom、section filter、horizontal inner scroll、keyboard selectionを実装。
- dynamic importする。

#### List

- sticky header、sortable dense columns、filter/search、status/public code/time固定優先を実装。
- dense 50+ stress scenario、`content-visibility`またはwindowingを実装。
- dynamic importする。

Cross-view exit:

- 一つのselectionが全view/queue/inspectorへ同じpublic reservationを伝播。
- view切替でdate/filter/selectionが失われない。
- URLへUUID、PII、provider IDを書かない。

### U4 — Inspector and command flows

Actions:

1. Inspector tabsを実装する。
2. read-only/capability-disabled affordanceを実装する。
3. 全command flowをtyped draft → validation → confirmation → fixture gateway → resultの同じpipelineに載せる。
4. destructive commandへreason/impact/confirmationを必須化する。
5. version/time/block/capacity conflictの解決UIを実装する。
6. optimistic simulationはrollback可能なmemory stateに限定する。
7. resultをlive regionとhistory fixtureへ反映する。

Exit:

- completion definitionに列挙した全commandがdesktop/mobileで完走。
- commandごとにsuccess + minimum one rejection/conflictを再現。
- HTTP request 0、server action 0、provider SDK call 0。

### U5 — Mobile task architecture

Actions:

1. 390×844を基準にlist-first layoutを作る。
2. 320、375、390、430幅でlong labelを検証する。
3. selection detailをbottom sheetへ移す。
4. primary action dockをfirst viewportに残す。
5. 複雑commandをstep wizardへ再構成する。
6. floorはgrid/map、chartはinner scroll + snap/controlを用意する。
7. keyboard open時のsheet/footer overlapを避ける。

Exit:

- page水平overflow 0。
- important targets 44px+。
- fixed UIによるfocus obstruction 0。
- desktop componentの単純stack 0。

### U6 — Accessibility, motion, performance

Actions:

- tab/tabpanel、dialog、grid/table、toolbar、status semanticsを監査。
- focus order、Escape、return focus、screen-reader labelsを確認。
- non-color status、contrast、reduced motionを確認。
- heavy viewsをdynamic importし、urgent inputをtransition/deferred valueで保護。
- floor asset dimensions、layout containment、content visibilityを確認。
- unnecessary memoizationは避け、実測または明確なrender boundaryに限定する。

Exit:

- keyboard-only core journey PASS。
- reduced-motion journey PASS。
- screen-reader accessible namesの欠落0。
- LCP/INP/CLS targetをlocal evidenceで満たすか、測定不能理由を明記して未達扱いにする。

### U7 — Validation and visual QA

Validation ladder:

1. formatter/parse check for new JSON/Markdown evidence
2. targeted ESLint for UI-first paths
3. `tsc --noEmit`
4. `verify-vip-floor-ui-first.mjs`
5. production build
6. localhost browser smoke
7. responsive screenshot matrix
8. keyboard/touch/reduced-motion/conflict journey matrix
9. final privacy and forbidden-pattern scan
10. changed-file hash manifest

Screenshot matrix:

| Viewport | Required captures |
|---|---|
| 1440×900 | floor, chart, list, inspector, command, empty/error |
| 1280×800 | floor, chart, collapsed pane |
| 768×1024 | floor, list, drawer, command |
| 390×844 | list-first, floor grid/map, chart, sheet, wizard, error |
| 320×800 | long label, action dock, no overflow |

Every screenshot is inspected at readable size, not only generated. Screenshot names must include viewport, scenario, view, and timestamp.

Visual reject list:

- AI glass/blur/orb/bokeh/floating card stack
- generic SaaS blue/white
- excessive radius/nested cards
- marketing copy/KPI card pile
- floor map visually secondary
- selection not linked across views
- low contrast or color-only state
- long label overlap or mobile page overflow
- TableCheck branded/pixel-copied content

### U8 — Freeze and handoff

Actions:

1. changed file listとSHA-256 manifestを作る。
2. validation results、screenshot inventory、known non-UI integration gapsを記録する。
3. current website workspaceとV17/V18 hashesを再検証する。
4. local branch commit SHAを記録する。
5. UI-first terminal evidenceをatomicに発行する。
6. shared AI status/logにはUI complete / Gate C HOLD / integration pendingを正確に書く。

Terminal issue conditions:

- U0–U7が全PASS。
- forbidden boundary breach 0。
- current `website/` source/evidence mutation 0。root coordination docsの規定write-backだけを除く。
- provider/private/customer interaction 0。
- Gate C/V18 drift 0。
- final manifest self-verification PASS。

Terminal output:

```text
UI_FIRST_IMPLEMENTATION_COMPLETE_AWAITING_GATE_C_INTEGRATION
```

## 7. Detailed UI acceptance matrix

| Area | Happy path | Required edge states | Keyboard/touch |
|---|---|---|---|
| Service ribbon | date/service/view switch | stale, reconnecting, read-only | tab/arrow/44px |
| Queue | select arrival/exception | empty, dense, long label | up/down/enter |
| Floor | select/assign table | locked, blocked, connected, no reservation | arrow/enter + non-DnD alternative |
| Chart | select/reschedule | overlap, now boundary, block, dense bars | arrow/enter + zoom controls |
| List | search/filter/sort/select | 50+, empty result, long label | table navigation |
| Inspector | tab/read fields | masked/no capability/no selection | tablist/escape |
| Status | progress state | invalid transition/version conflict | confirm/cancel |
| Assignment | add/remove/replace | capacity/time/block conflict | list selection alternative |
| Schedule | change time/extend | out of window/conflict | direct input + buttons |
| Block | create/edit/remove | venue/section/table scope | labeled controls |
| Note | create/edit/pin | validation/version conflict | textarea/submit |
| Walk-in | create | capacity override/required fields | step wizard |
| Cancel | decision/reason | refund review/amount validation | explicit confirmation |
| Customer | masked/edit | no capability/validation | field labels/errors |
| Mobile sheet | inspect/action | keyboard open/focus return | swipe optional, button required |

## 8. Evidence contract

Create under `docs/evidence/vip-floor-ui-first/`:

- `00-authority-preflight.json`
- `01-isolation-and-seed-manifest.json`
- `02-design-contract.md`
- `03-fixture-scenario-manifest.json`
- `04-network-ineligibility-scan.json`
- `05-static-validation.json`
- `06-production-build.json`
- `07-browser-journey-matrix.json`
- `08-accessibility-review.md`
- `09-performance-observations.json`
- `10-visual-review.md`
- `screenshots/*`
- `11-final-file-manifest.json`
- `12-ui-first-terminal.json`

Every JSON includes `schemaVersion`, `capturedAt`, `decision/result`, relevant input hashes, and no secret/private data. A terminal file may not be created in advance or overwritten after failure; remediation evidence is additive.

## 9. Static safety verifier requirements

`scripts/verify-vip-floor-ui-first.mjs` must fail if:

- UI-first source contains `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, server action, Stripe/Vercel/Supabase SDK import, or direct API path.
- current production route or legacy dashboard was modified.
- package/package-lock changed.
- preview route lacks production `notFound()` guard.
- fixture contains email/phone domains or values not explicitly reserved dummy data.
- URL state includes UUID/private/provider identifiers.
- TableCheck brand/assets appear in shipped source.
- forbidden visual tokens such as blur/glass/orb or large repeated radius appear without allowlisted explanation.
- required scenario, view, command, breakpoint, or screenshot is missing.
- a status lacks text label and icon/shape metadata.
- current Gate C/V17/V18 immutable hash checks fail.

## 10. Commit strategy

Local-only; push/merge 0.

1. `chore(vip-floor-ui): seed exact public v2 contract for isolated worktree`
2. `feat(vip-floor-ui): build operational lacquer shell and fixtures`
3. `feat(vip-floor-ui): complete floor timeline list and commands`
4. `feat(vip-floor-ui): complete mobile accessibility and quality gates`
5. `docs(vip-floor-ui): freeze validation and handoff evidence`

Maximum local commits: 6. Rejected or incomplete commits remain in the isolated branch; no history rewrite, force push, squash, or rebase is required during UI-first execution.

## 11. Failure and pause rules

Stop without terminal if:

- exact Owner adoption is absent or mismatched;
- any immutable input hash differs;
- current `website/` workspace receives an unintended write, or root receives a write other than the two required coordination docs;
- real API/provider/private/customer access becomes necessary;
- package/dependency change becomes necessary;
- production build requires source-level font migration or Gate C private artifact access;
- full UI acceptance cannot be met within the allowed paths;
- legal/reuse boundary is ambiguous;
- validation identifies a non-UI contract defect requiring backend changes.

The stop artifact must name what passed, what failed, exact branch/worktree/commit state, and the smallest new authority needed. It must not call the work complete.

## 12. Post-Gate C integration plan

Only after a signed Gate C PASS and separate integration authority:

1. Freeze post-Gate-C canonical `VipFloorBoardV2` and command hashes.
2. Diff canonical contract against UI seed.
3. Replace `FixtureCommandGateway` with authenticated read/command adapters behind the same interface.
4. Move auth/feature flag checks to Server Component boundary.
5. Preserve public-code-only URL state and masked PII defaults.
6. Run real capability/read-only/mutation/error mapping tests.
7. Add route flag and keep v1 fallback.
8. Re-run all UI screenshots and journeys against sanitized staging data.
9. Obtain operational owner/floor-manager signoff.
10. Perform separately authorized route cutover and rollback rehearsal.

The UI-first branch is a prepared UI product, not proof that backend semantics are safe. Integration must validate that every real command result and error code maps to the already-completed UI without silently degrading behavior.

## 13. Critical path

```text
Owner adoption
  → isolation/hash preflight
  → design shell + fixture contract
  → floor/chart/list selection core
  → inspector + all command flows
  → mobile task architecture
  → accessibility/performance
  → build/browser/visual evidence
  → UI-first terminal
  → wait for signed Gate C PASS
  → separately authorized integration/cutover
```

No wave may skip forward by replacing required UI with static placeholder. Visual polish is not a final coat; component hierarchy, density, focus, and mobile behavior are built into U1–U5 and verified again at U7.
