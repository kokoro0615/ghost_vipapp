# TableCheck VIP Floor UI-first one-shot implementation prompt

このpromptは、次のproposalへOwner本人がexact 2行でdirect adoptionした後だけ実行する。

- Proposal: `docs/evidence/vip-floor-v2/ui-first-one-shot-implementation-authorization-proposal-v1-20260723.json`
- Proposal SHA-256: `6b5bd503fa2d72f6f5f8a12624dad26899700f2ce81a37a3484f3791c915b552`
- Required line 1: `OWNER_VIP_FLOOR_UI_FIRST_ONE_SHOT_IMPLEMENTATION_AUTHORIZATION_V1`
- Required line 2: `6b5bd503fa2d72f6f5f8a12624dad26899700f2ce81a37a3484f3791c915b552`

上の2行が、proposal作成後のOwner direct replyとして完全一致しない限り、worktree作成もUI実装も開始してはならない。このprompt自体、現在の計画作成依頼、過去の一般的な「進めてよい」はexecution authorizationではない。

---

## Your role

あなたはGHOST Osaka VIP FloorのUI-first executorである。Gate CをHOLDのまま保ち、現行Gate C/V18 workspaceを一切変更せず、専用branch/worktree内でTableCheckの運用文法をGHOST固有の`GHOST Operational Lacquer`へ再構成し、fixture-driven UI layerを最後まで完成させる。

途中の静的mockやdesktop一画面で止めない。floor、timeline、list、queue、inspector、全command flow、mobile、全状態、a11y、build、browser evidenceまでを一気通貫で完了する。実API/auth/provider/database/deploy/cutoverは絶対に行わない。

最終的に発行できる唯一の成功terminalは次である。

```text
UI_FIRST_IMPLEMENTATION_COMPLETE_AWAITING_GATE_C_INTEGRATION
```

Gate C PASS、Gate D/E START/PASS、integration complete、release ready、real mutation verifiedとは書かない。

## Mandatory inputs

最初に以下を完全に読む。省略、要約だけでの代替、subagentへの読解委譲は禁止。

1. `/home/kokoro/projects/clients/ghost/AGENTS.md`
2. `/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md`
3. `/home/kokoro/projects/clients/ghost/docs/AI_AGENT_SYNC.md`
4. `/home/kokoro/projects/clients/ghost/docs/AI_WORK_LOG.md`の最新行
5. `/home/kokoro/projects/clients/ghost/website/AGENTS.md`
6. `/home/kokoro/projects/clients/ghost/website/CLAUDE.md`
7. `/home/kokoro/projects/.Codex/docs/DESIGN.md`
8. `/home/kokoro/projects/clients/ghost/website/docs/ui/UI_TOOLKIT.md`
9. `docs/research/tablecheck-vip-floor-ui-first-research-2026-07-23.md`
10. `docs/research/tablecheck-vip-floor-ui-first-end-to-end-implementation-plan-2026-07-23.md`
11. `docs/evidence/vip-floor-v2/ui-first-one-shot-implementation-authorization-proposal-v1-20260723.json`
12. `docs/design-references/vip-floor-tablecheck/source-manifest.md`

利用可能なら次のskillsをこの順序で読み、適用をcommentaryで明示する。

1. `ui-ux-pro-max`: dense operational UI、responsive、a11yの検証。
2. `design-taste-frontend`: anti-AI-slop auditだけに使用。dashboardのprimary design systemにはしない。
3. `vercel-react-best-practices`: Server/Client boundary、bundle、render、transition。

`design-taste-frontend`のdashboard対象外条件を尊重し、primary sourceはGHOST rules、TableCheck operational grammar、local contractとする。subagent dispatchは0。

## Exact frozen inputs

以下を再計算し、1 byteでも違えば実装前にfail closedする。

```text
directive  8dba8f141970c8e4de9e0695372f0535c4689ca84feb47ce0af2ed3184e07649
research   221f7046d315e8ae158389433994b1df1472966055f58993089230e196f71caf
plan       79d39ac1c12a3da61a03af886fe68afd768f643d75a27433068db011213edc84
proposal   6b5bd503fa2d72f6f5f8a12624dad26899700f2ce81a37a3484f3791c915b552

V17 checkpoint  d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61
V17 review      b113a5a2df209ac1fd9113dcae71bc8840ec02fe067f69e379226b288047fa88
V17 manifest    359789d9bccb9ad956c890a91899f56396e70ab0679838102e4ac95b70a16894
V17 bundle      302acb01bd0945b364024dbee282e1e88008afc926f356b63714a80132c51031
V18 directive   f2fa911fe59b74e0510b250cd9565324b46da2ebcf3592f22d19210d892c33ec
V18 research    688b74a6e4b045c0a630941e97ba75b812bd046e0af162a0efb8ebe6b6fb9a89
V18 proposal    2947616d3960dd51571f75b6bb49cfba60de3edf3393e48bb04fdd47370da400
V18 prompt      af49878dc48bbf0dcf50e3edf8fc0db614c74a53940cb57b2934184b2ba3d080
```

Website base commit must be:

```text
5a3a99acf563c10af6bc68526773281d46f4d01a
```

Exact seed hashesはproposalの`exactSourceSeed.files`をmachine-readして検証する。手入力したshort hashで代替しない。

## Non-negotiable boundary

### Allowed

- branch `codex/vip-floor-ui-first-v1`を1つ作る。
- worktree `/home/kokoro/projects/clients/ghost/.worktrees/vip-floor-ui-first-v1`を1つ作る。
- proposalのallowed pathsだけをisolated worktree内で変更する。
- exact contract seedをcopyし、UI commitと分ける。
- existing dependenciesだけで実装する。
- lint、typecheck、build、localhost preview、browser interaction、screenshot、local commitを行う。
- build時に必要な場合だけ、`fonts.googleapis.com`と`fonts.gstatic.com`へのcredential-free GETをproposal ceiling内で行う。
- 最後にroot shared coordination docs 2件だけを規約どおり更新する。

### Forbidden

- current `/home/kokoro/projects/clients/ghost/website`のsource/evidence変更。
- current Gate C/V17/V18のtools、artifact、evidence、counter、manifest変更または再利用。
- existing `/admin/vip-floor` route、legacy dashboard、globals.css変更。
- API route、server auth、feature flag、database、Stripe、Vercel、Supabase、LINE、real customer接続。
- fetch、XHR、WebSocket、EventSource、Server Action、provider SDKをUI-first codeへ入れる。
- package install、dependency追加、package.json/package-lock/next.config変更。
- deploy、push、merge、PR、rebase、squash、force push、history rewrite。
- TableCheck brand、asset、screenshot、CSS、font、DOM、copy、customer dataの保存または模倣。
- secret、credential、token、cookie、JWT、private URL/path/provider ID、real PIIのread/output。
- terminalの先出し、失敗evidenceの上書き、placeholderでの完了扱い。

## Operating behavior

- 長時間作業では60秒以上無言にせず、短い進捗をcommentaryで伝える。
- 非blockingな細部はplanとGHOST rulesから判断し、毎回質問しない。
- scope外の変更が必要になったら推測で広げず、additive checkpointを残して停止する。
- 既存dirty workはユーザーのものとして保護する。
- source/docs editsは`apply_patch`を使う。formatterなどの機械処理だけ例外。
- 検索は`rg`/`rg --files`を優先する。
- destructive command、worktree削除、reset、checkout overwriteを使わない。
- UI implementation中もcurrent Gate C workspaceを定期的にhash監視する。

## U0 — Adopt, preflight, isolate

1. Owner replyがexact 2行か検証する。
2. proposal JSONをparseし、role code、paths、ceilings、terminalをmachine-checkする。
3. mandatory inputとskill instructionsを読む。
4. current website `git status --short`をsnapshotする。変更は直さない。
5. all frozen hashes、base commit、seed hashesを検証する。
6. proposed branch/worktreeが存在しないこと、同名refが他用途でないことをread-only確認する。
7. exact base commitからbranch/worktreeを作る。
8. path、git common dir、HEAD、inodeを確認し、current websiteと分離していることをevidence化する。
9. exact `src/lib/vipFloorV2Contract.ts`をisolated worktreeへbyte-for-byte materializeし、SHAを再検証する。
10. dependency treeが必要ならexisting `website/node_modules`をuntracked/read-only reuseし、manifest/commitから除外する。package installはしない。
11. `docs/evidence/vip-floor-ui-first/00-authority-preflight.json`と`01-isolation-and-seed-manifest.json`を作る。
12. original website statusとfrozen hashesをもう一度検証する。

U0 exit criteria:

- exact adoption PASS
- frozen input PASS
- worktree isolation PASS
- source seed PASS
- current website write 0
- external/private/provider call 0

どれか失敗ならimplementation 0のcheckpointを残し、止まる。

## U1 — Lock the visual system before feature work

まず`docs/evidence/vip-floor-ui-first/02-design-contract.md`を作り、次を固定してからcomponentを書く。

### Design Read

> GHOST OsakaのVIPフロア責任者向け運用コックピット。TableCheckのmap-first・時間軸・予約railという業務文法を使い、GHOST固有の黒紫ラッカーとシャンパン金属で再構成する。

### Dials

```text
DESIGN_VARIANCE = 3
VISUAL_DENSITY = 9
MOTION_INTENSITY = 2
```

### Signature

GHOST所有の実VIP floor mapを最大のcoordinate planeにする。floor node、timeline bar、list row、queue item、inspector selectionが常に同じ予約を指す。

### Visual rules

- black-violet lacquer、pure black一色ではなくvalue差でpaneを分ける。
- champagne 1px hairline、ivory text、局所的LED trace。
- Barlow Condensed/Noto Sans JPとtabular numerals。Inter追加禁止。
- radius 2–8px。pillはstatus/tagだけ。
- blur/glass/orb/bokeh/floating card stackなし。
- generic white/gray/blue SaaSなし。
- KPI card pile、nested card、marketing hero/copyなし。
- statusはcolor + text + icon/edge pattern。
- real floor mapよりdecorative assetを強くしない。

CSSは`VipFloorWorkspace.module.css`のroot scopeへ閉じ、`globals.css`を変更しない。

Shellを次で作る。

```text
56px nav rail
top service ribbon
left 260–300px exception/arrival queue
center elastic floor/chart/list workspace
right 336–384px inspector/command panel
```

Preview pageはServer Component、interactive workspaceだけClient Componentにする。Production buildではpreview routeが必ず`notFound()`になるguardを入れる。

1440×900と390×844のshell screenshotを早期に撮り、読みやすい大きさで実際にinspectする。first viewportでGHOST Osaka、VIP reservation operations、営業日/service、主要actionが即座に理解できなければU1をやり直す。

## U2 — Build the contract-safe fixture engine

`VipFloorBoardV2`とcommand typesを唯一のdata contractにする。UI補助fieldは別`UiViewModel`へ分離し、canonical contractを推測で変更しない。

最低16 scenarioを作る。以下は全て必須。

1. healthy mixed service
2. opening empty
3. loading
4. stale/reconnecting
5. read error/retry
6. read-only/no capability
7. masked customer
8. late/no contact
9. partial arrival
10. seated → bottle pending → served → bill requested → paid → resetting
11. unassigned
12. connected tables
13. table locked
14. reservation block
15. capacity warning/override
16. version conflict
17. table time conflict
18. cancellation/refund review
19. long Japanese/English labels
20. 50+ reservations stress

`FixtureCommandGateway`はmemory-onlyにし、network primitiveをimport/使用できない設計にする。成功、validation error、permission error、version conflict、time/block conflict、capacity override、deterministic latencyを再現する。

`scripts/verify-vip-floor-ui-first.mjs`をこの時点で作り、少なくとも次をfail条件にする。

- `fetch(`、XMLHttpRequest、WebSocket、EventSource、Server Action、API path、provider SDK import
- package/lock/config、existing route/dashboard/globalsの変更
- preview routeのproduction guard欠落
- real-looking PII、UUID/provider IDのURL state
- TableCheck brand/assets/copy
- forbidden AI visual patterns
- required scenario/view/command/breakpoint/evidence欠落
- status text/icon metadata欠落
- immutable hash drift

U2終了時にscenario manifestとnetwork-ineligibility scanをPASSさせる。

## U3 — Complete the three linked work axes

### Floor view

- `vipmapv3`とreal hotspot geometryを使う。
- table code、capacity、current/next time、status、lock/blockをnodeに表示する。
- available/arriving/late/seated/bottle/bill/paid/resetting/blockedを非色覚でも識別可能にする。
- section、zoom、legend、connected tables、unassignedを実装する。
- click/tap/keyboard selectionを同じstateへ送る。
- DnDはoptional。必ずselect-destination/button/list alternativeを作る。

### Timeline view

- row = table、column = 15 minutes。
- operating window、now line、reservation bars、turnover buffer、blocks、conflicts、unassigned tray。
- 15/30/60 minute zoom、section filter、inner horizontal scroll。
- keyboard selectionとdirect command alternative。
- heavy moduleとしてdynamic import。

### Dense list view

- sticky header、sort/filter/search、density、50+ stress。
- priority columns: time, status, public code, guest, table, exception。
- long labelsにaccessible full name。
- `content-visibility`または妥当なwindowing。
- heavy moduleとしてdynamic import。

全viewでdate/filter/selectionを維持し、floor node、chart bar、list row、queue item、inspectorが同じpublic reservationを示す。URLにはbusiness date、view、section、public codeなどprivacy-safe stateだけを置く。

## U4 — Complete inspector and every command surface

Inspector tabs:

- Overview
- Guest
- Service
- Payment
- Notes
- History

Command pipelineを全て共通化する。

```text
typed draft
  → local validation
  → capability/read-only check
  → impact/confirmation
  → FixtureCommandGateway
  → success or typed conflict
  → state/history/live-message update
```

完成必須command:

- status transition/check-in/no-show/service progress
- assignment replace/add/remove/unassign
- schedule change
- seat extension
- reservation block create/edit/remove
- note create/edit/pin
- walk-in create
- cancellation and refund decision
- customer edit and masked display

各commandはdesktop/mobileでsuccessと最低1つのrejection/conflictを再現する。destructive commandはreason、影響、confirmationを必須化する。optimistic UIはmemory stateだけでrollback可能にする。

実HTTP request、Server Action、provider/database callは0でなければならない。

## U5 — Build mobile as a different task architecture

desktop三分割を縦stackしない。

- 390×844を主基準にlist-first。
- first viewportにdate/service、exception、search、primary action。
- floorはcompact gridとpan/zoom mapを用途で切替。
- inspectorはbottom sheet。
- complex commandはfull-screen step wizard。
- fixed primary action dockを作る。
- 320/375/390/430幅でlong label、keyboard open、safe area、sheet/footer overlapを検証。
- important control 44×44 CSS px以上。
- page水平scroll 0。chart region内のhorizontal scrollだけ許可。
- swipe/dragにはbutton alternative。

mobile screenshotを最後まで後回しにせず、各feature completion時にdesktopと対で更新する。

## U6 — Accessibility, motion, and performance pass

### Accessibility

- semantic button/tab/tabpanel/dialog/grid/table/toolbar/status。
- visible accessible names、icon-only tooltip。
- champagne 2px+ `:focus-visible`。
- logical focus order、focus trap、Escape、return focus。
- sticky rail/action dock/sheetがfocusを隠さない。
- statusはcolorだけに依存しない。
- save/conflictだけの節度あるlive region。
- DnD/pan/swipeのsingle-pointer alternative。

### Motion

- 140–240msのselection、inspector crossfade、sheet/dialogだけ。
- scroll theater、parallax、cursor effect、floating motionなし。
- `prefers-reduced-motion`でtransform animationを無効化。

### Performance

- page/shellはServer Component。
- interactive islandだけ`use client`。
- floor/chart/list heavy viewを必要時にload。
- search/filterは`useDeferredValue`またはtransition。
- dense offscreen contentはcontainment/content-visibility/windowing。
- image dimensionsを固定してCLSを防止。
- client propsは必要最小限。
- unnecessary animation library usageなし。CSS first。

Target:

```text
LCP <= 2.5s
INP <= 200ms
CLS <= 0.1
```

local measurementができなければ理由を明記するだけではcompleteにしない。利用可能なbrowser performance evidenceを取得する。

## U7 — Run the full quality gate

次の順で実行し、失敗を修正して最初から該当範囲を再実行する。build attemptは最大3。

1. new JSON parse and evidence schema checks
2. targeted ESLint
3. TypeScript `--noEmit`
4. `node scripts/verify-vip-floor-ui-first.mjs`
5. production build
6. localhost browser smoke
7. keyboard-only journey
8. reduced-motion journey
9. responsive screenshot matrix
10. visual anti-AI review
11. privacy/secret/path/provider identifier scan
12. final file hash manifest self-verification

Production buildでGoogle font cacheが無い場合だけ、proposalのexact hosts/method/ceiling内でpublic unauthenticated GETを許可する。credential/header/cookie/bodyを付けない。それ以外のexternal networkは0。source-level font migration、package change、Gate C private artifact accessが必要ならcompleteにせず停止する。

Required screenshot matrix:

| viewport | scenes |
|---|---|
| 1440×900 | floor, chart, list, inspector, command, empty/error |
| 1280×800 | floor, chart, collapsed rail |
| 768×1024 | floor, list, drawer, command |
| 390×844 | list-first, floor, chart, sheet, wizard, error |
| 320×800 | long labels, action dock, no overflow |

最大60 files。各file名にviewport、scenario、view、timestampを含める。全画像を`view_image`または同等のvisual inspectionで実際に確認する。

Visual REJECT:

- glass/blur/orb/bokeh/floating cards
- generic white/gray/blue SaaS
- repeated large radius/nested cards
- KPI card pile/marketing copy
- mapがsecondary
- selection linkageが視覚化されない
- low contrast/color-only status
- long label overlap/mobile page overflow
- TableCheck branded/pixel copy
- desktopを縮小しただけのmobile

## U8 — Freeze, verify, and hand off

`docs/evidence/vip-floor-ui-first/`に最低限次を揃える。

```text
00-authority-preflight.json
01-isolation-and-seed-manifest.json
02-design-contract.md
03-fixture-scenario-manifest.json
04-network-ineligibility-scan.json
05-static-validation.json
06-production-build.json
07-browser-journey-matrix.json
08-accessibility-review.md
09-performance-observations.json
10-visual-review.md
screenshots/**
11-final-file-manifest.json
12-ui-first-terminal.json
```

Every JSON:

- `schemaVersion`
- `capturedAt`
- `decision` or `result`
- exact input hashes
- no secret/private/real PII

Final steps:

1. all U0–U7 evidenceがPASSか確認。
2. changed file manifestをSHA-256でself-verify。
3. current website statusがinitial snapshotと同じことを確認。
4. V17/V18 immutable hashesを再確認。
5. local branch commit SHAを記録。push/mergeしない。
6. `12-ui-first-terminal.json`を初めて発行。failure後のoverwriteは禁止。
7. root `docs/AI_CURRENT_STATUS.md`を「UI-first complete / Gate C HOLD / integration pending」へ更新。
8. root `docs/AI_WORK_LOG.md`へcompact rowをappend。
9. final responseはoutcome、branch/worktree、validation、remaining boundaryを簡潔に報告。

Terminal条件:

- all required surfaces/states/commands/viewports PASS
- lint/typecheck/build/static scan/browser/a11y/performance/visual/privacy PASS
- current website source/evidence mutation 0
- provider/private/customer/external application call 0
- package/dependency mutation 0
- Gate C/V17/V18 drift 0
- final manifest PASS

全て満たした場合だけ次を出す。

```text
UI_FIRST_IMPLEMENTATION_COMPLETE_AWAITING_GATE_C_INTEGRATION
```

## Required stop behavior

次のいずれかでterminalを出さず、additive nonterminal checkpointを残して停止する。

- Owner exact adoption missing/mismatch
- immutable hash mismatch
- branch/worktree collision or ownership ambiguity
- unintended current website write
- package/backend/provider/private/production access needed
- build failure after ceiling
- browser/a11y/performance/visual gate unresolved
- contract defect needing backend change
- legal/reuse boundary ambiguity
- any required UI remains placeholder/incomplete

Checkpointにはpass済み項目、failure、branch/worktree/commit、counter、smallest new authorityを記録する。将来のPASSを予約・捏造しない。

## Post-completion boundary

UI-first complete後も、Gate C signed PASSまではそのまま停止する。Ownerから別のpost-Gate-C integration authorityが出るまで、canonical contract reconciliation、real adapters、auth/feature flag、existing route integration、staging test、cutover、deployを行わない。

このpromptの目的は、見た目だけのmockではなく、integration-readyな全UIを安全なfixture trackで完成させることだ。同時に、Gate Cの安全性証明をUI進捗で代替しないことも同じ重要度の成果である。
