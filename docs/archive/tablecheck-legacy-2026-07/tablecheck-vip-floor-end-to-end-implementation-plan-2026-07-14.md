# TableCheck型 VIP Floor Board 完全再現 一気通貫実装計画

作成日: 2026-07-14 JST  
対象: `http://localhost:3000/admin/vip-floor`  
状態: 計画確定用。実装、migration適用、外部サービス変更、本番変更は未実施

## 1. 結論

実装は次のクリティカルパスで進める。

```text
公開証拠と現行baseline固定
  → P0 additive schema
  → RPC v8 / API v2
  → dual-write / shadow compare
  → Gate C
  → TableCheck型共通シェル
  → floor / chart / list
  → 予約詳細 / 予約フォーム
  → waitlist / block / staff / service period
  → 配席候補・自動最適化
  → mobile / tablet / accessibility / performance
  → staging / canary / production / legacy cleanup
```

`Gate C`までは現行VIP Floor UIを変更しない。高度運用機能も、各機能のadditive schema、RPC、API、互換確認を先に終えてからUIへ接続する。

「完全再現」は、TableCheckの公開公式情報から確認できる情報構造、操作モデル、画面密度、業務状態、レスポンシブ構成を再現する意味とする。TableCheckの商標、ロゴ、著作物、CSS、非公開コード、非公開アルゴリズム、顧客データは複製しない。外観は確定済み方針どおりGHOST Osakaの黒紫ラッカー、シャンパンメタル、実在フロア形状を使う。

## 2. 正本と優先順位

本計画は次の3文書を置き換えず、実装順と全体統合を定義する上位runbookである。

1. `tablecheck-vip-floor-p0-data-contract-2026-07-14.md`
   - P0の状態、時間、配席、block、customer、audit、version契約の正本
2. `tablecheck-vip-floor-p0-implementation-plan-2026-07-14.md`
   - additive schema、RPC v8/API v2、dual-writeの詳細正本
3. `tablecheck-vip-floor-reproduction-spec-2026-07-14.md`
   - TableCheck公開仕様、画面構成、操作、受入条件の正本

矛盾時の優先順位は、最新ユーザー指示 → P0データ契約 → P0実装計画 → 再現調査仕様 → 本計画の順とする。本計画でP0の列、RPC署名、error contractを再定義しない。

## 3. 確定済み4方針

1. **忠実度**: TableCheckの構造、操作、密度を忠実に再現し、色、書体、素材はGHOST Osakaスキンとする。
2. **画面範囲**: `/admin/vip-floor`内で`floor`、`chart`、`list`を切り替える。
3. **状態**: 予約・決済lifecycleとGHOST現場進行service statusを別軸で持つ。
4. **自動配席**: P0は手動配席を完全化し、自動・最適配席はデータと運用実績を得た後続phaseで実装する。

この4項目を再確認するために実装を停止しない。変更はユーザーから明示的な新指示があった場合だけ行う。

## 4. 完全再現のDefinition of Done

次の全項目が満たされた時だけ「完全再現完了」と呼ぶ。

### 4.1 画面パリティ

- 日付移動、今日/翌日、営業期間、オンライン受付状態、通知、印刷、言語、operator menuを持つ上部営業バー
- 業務機能へ移動できる左ナビゲーション
- `floor`、`chart`、`list`の同一日・同一選択状態での切替
- floorの約66/34マップ/予約リスト分割
- section切替、zoom、表示pin、複数回転、未配席、waitlist、完了、block、staff表示
- chartのtable×time grid、現在時刻線、予約bar、block、未配席tray、移動、resize
- listの固定列、sort、filter、search、memo、export
- 予約詳細/フォームの2ペイン、顧客、予約、支払、画像、監査、POS領域
- mobileの専用table grid、固定行list、段階式作成、bottom navigation
- loading、empty、error、stale、conflict、permission、feature-disabled状態

### 4.2 操作パリティ

- 予約作成、編集、キャンセル、確認、check-in、no-show、完了
- 任意分walk-in
- replace/add/remove/unassignを含む複数table手動配席
- time/table移動と滞在時間resize
- waitlist追加、通知、呼出、受諾、配席、取消
- table/section/venue block、繰返しblock
- staff assignment、service period、online acceptance切替
- table connectionを考慮した配席候補とmanager確定
- customer dossier、note、tag、payment evidence、audit閲覧
- print、CSV/Excel export、条件付きPOS adapter
- すべての危険操作で理由、権限、expectedVersion、idempotencyを検査

### 4.3 品質パリティ

- mouse、keyboard、touchで主要workflowを完了できる
- DnDとresizeにボタン/keyboard代替がある
- 375pxで意図しないページ全体の横scrollがない
- 重要touch targetが44×44px以上、隣接target間隔が原則8px以上
- statusを色だけで表現しない
- visible focus、dialog focus trap、Escape、focus restoreを満たす
- 2端末競合で片方だけ成功し、敗者が最新状態へ回復できる
- raw customer PII、Stripe secret、raw webhook payloadをUI、log、auditへ出さない
- 現行公開予約、Checkout/Payment Element、signed webhook、refund workerを壊さない
- 定義した全fixture、API contract、E2E、visual regression、release gateがpassする

## 5. 現在地

### 5.1 既にあるもの

- PIN/cookie admin session
- 現行`VipFloorDashboard`、map/list、予約queue、seat inspector
- assign、confirm、check-in、cancel、walk-in、seat extensionのv1 route/RPC
- payment/webhook evidence表示
- public hold、availability、Stripe Checkout Sessions、webhook worker、refund case/worker
- 33 tables、48 service-role RPCsの現行static baseline
- P0 data contractとP0 implementation plan

### 5.2 主な不足

- 正規予約時刻と複数回転を前提としたboard read model
- chart viewとtime-axis interaction
- 未配席、block、waitlist、staff assignment、service period、online acceptance
- shared customer dossier、server-persisted note、操作audit
- version conflict、board revision、idempotent v2 command
- 予約作成/編集のTableCheck型2ペインform
- mobile専用IA
- 自動配席、export、POS adapter
- 公開証拠に基づくcomponent単位のparity matrixとvisual evidence

### 5.3 既存コードの扱い

- `src/components/admin/VipFloorDashboard.tsx`と既存`vip-floor/*`はv1 fallbackとして残す。
- v2は`src/components/admin/vip-floor-v2/`へ新設し、feature flagでroot componentを切り替える。
- `src/app/api/admin/vip-status/route.ts`と既存v1 mutation routeはdual-write検証完了まで変更しない。
- 既存の巨大な`globals.css`へ各agentが並列追記しない。v2はcolocated CSS Moduleを基本とする。
- legacy削除はproductionでv2が安定し、rollback windowが閉じた最後のphaseだけで行う。

### 5.4 現行production posture

共有status上の最新release auditは`No-Go`（open 2、external open checks 7）で、public booking enabledとadmin mutation disabledの運用差も残る。TableCheck型v2の技術Gateがpassしても、次を閉じるか明示的なwaiverを記録するまでproduction完全展開を宣言しない。

- Cloudflare WAF final rule ID/readback
- signed Stripe webhook through WAF
- runtime Node flagとDB settingの整合
- Owner / Manager / Engineerの最終Go

## 6. 目標アーキテクチャ

```text
/admin/vip-floor
  ├─ VipFloorRouteGate
  │   ├─ v1: VipFloorDashboard
  │   └─ v2: VipFloorBoardV2
  ├─ URL state: date/view/section/reservation/panel/filter
  ├─ board query + revision reconciliation
  ├─ command dispatcher + idempotency + version conflict recovery
  └─ surfaces
      ├─ shell
      ├─ floor
      ├─ chart
      ├─ list
      ├─ reservation detail/form
      ├─ waitlist/block/staff
      └─ mobile

Next API v2
  ├─ admin session/capability/redaction
  ├─ board/customer reads
  ├─ reservation/assignment/status commands
  ├─ waitlist/block/staff/service period commands
  ├─ placement suggestion/export/POS adapter
  └─ typed error mapping

Supabase
  ├─ additive schema
  ├─ RPC v8 as business mutation authority
  ├─ compatibility projection for v7/worker
  ├─ audit/version/day revision
  ├─ outbox/worker for external side effects
  └─ v1/v2 shadow compare
```

### 6.1 URL contract

正規URL例:

```text
/admin/vip-floor?date=2026-07-14&view=floor&section=main&reservation=<uuid>&panel=detail
/admin/vip-floor?date=2026-07-14&view=chart&zoom=15m&from=21:00
/admin/vip-floor?date=2026-07-14&view=list&filter=arrival&sort=start_asc
```

- back/forwardでview、filter、選択を復元する。
- 不正queryは安全なdefaultへ正規化する。
- customer ID、PII、Stripe object IDをURLへ入れない。
- mobileとdesktopで同じdeep linkを開き、対応する専用surfaceへ変換する。

### 6.2 Client state原則

- server snapshotの`boardRevision`を正とする。
- drag中の位置だけlocal previewにし、確定後は必ずserver responseでreconcileする。
- stale versionは409として扱い、変更を黙って上書きしない。
- network断で危険commandを自動queue/replayしない。明示的retryだけ許可する。
- filter、selection、panel状態とserver entityを分離する。
- Realtimeは後続最適化であり、正しさはread-after-writeとrevision pollingに依存させる。

## 7. 全phaseとGate

| Phase | 主目的 | UI変更 | Gate |
|---|---|---:|---|
| 0 | evidence、parity、baseline固定 | なし | Gate 0 |
| A | P0 additive schema | なし | Gate A |
| B | RPC v8 / API v2 | なし | Gate B |
| C | dual-write / shadow compare | なし | Gate C |
| D | v2 shell、floor/chart/list、detail/form | v2 flag offで追加 | Gate D |
| E | waitlist/block/staff/service period data-first実装 | 対応API後に追加 | Gate E |
| F | placement optimizer、export、POS adapter | 対応API後に追加 | Gate F |
| G | mobile/tablet、a11y、performance、realtime | あり | Gate G |
| H | staging、canary、production、legacy cleanup | flag切替 | Gate H |

### 7.1 実装前に反映するP0契約補正

並列監査で見つかった次の点は、migration作成前のblocking correctionとする。本計画作成時にP0データ契約/P0実装計画へ反映済みであり、実装担当は古い解釈へ戻さない。

1. v7 `assign_admin_reservation_resource_v7`の`ON CONFLICT`が依存する`UNIQUE(reservation_id, seat_resource_id)`をGate Cまで維持する。partial unique化はlegacy廃止後だけ行う。
2. 配席履歴はcurrent relationの複数row化ではなく、P0でadditiveな`reservation_assignment_events`へappendする。
3. 任意時刻walk-inは同event day/offeringの決定論的anchor slotを持つ。anchorがなくても時刻を丸めるのではなく、typed errorで拒否する。
4. `reservations.status`はv7互換列、v2 `lifecycleStatus`は正規化projectionとする。legacy `checked_in`は`confirmed + serviceStatus=seated`として返す。
5. `serviceStatus=paid`は現場進行であり、Stripe payment truthではない。
6. refundはnone/partial/full/reviewを分離し、remaining refundable、payment、currency、environment/account bindingをserverが検査する。
7. customer ciphertextはkey ID、format version、nonce、auth tagを含むenvelopeとし、rotation/fail-closedを持つ。P0検索は完全一致だけとする。
8. board readはstable ordering、snapshot/generatedAt、visible window、total/cursor規則を固定する。
9. public/admin/worker全writerのaudit coverageをinventory化する。raw row before/afterは保存しない。
10. v8/v7のversion/revisionは成功1回につき正確に1増分、replayと`updated_at`だけの変更は0増分でfixture化する。

この補正を反映したfixtureはF28〜F40とする。

## 8. Multi-agent実装運用

実装時はroot coordinator + 最大3 subagentを一つのwaveとして徹底利用する。単なる人数増加ではなく、ファイル所有権とGateで衝突を防ぐ。

### 8.1 Root coordinatorの責務

- 正本契約、依存関係、Gate判定、task ledgerを所有する。
- 各agentへ150行未満を目安にした小さなtask packetを渡す。
- 共有型、RPC署名、URL contract、design tokenを先にfreezeする。
- agent diffを一件ずつreviewし、無関係なdirty worktreeをstageしない。
- 共通ファイルの統合、conflict解決、全体build/E2E、release判断を行う。
- production deploy、feature flag有効化、migration applyはrootだけが行い、必要な承認を得る。
- `package.json`、lockfile、CI、`globals.css`、top-level route/composer、migration番号、共有contract/flagをroot専有とする。
- DB reset/migration apply、`next build`、Playwright server、release auditor、共有evidence生成は並列実行せずrootが直列化する。

### 8.2 Subagentの共通ルール

- 1 agent = 1 bounded responsibility = 1所有path集合。
- 他agentの所有fileを編集しない。
- shared contract変更が必要なら編集せずrootへ提案する。
- task開始時に入力contract、許可path、禁止path、完了条件を確認する。
- 完了時に変更file、判断、command、結果、残リスクをhandoffする。
- 少なくとも対象unit/static checkと`npx tsc --noEmit`を実行する。
- migration、secret、本番flagを勝手に適用しない。
- `git add/commit/reset/rebase`、push、deploy、外部送信を行わない。
- 検証出力は割当済みの固有pathへ出し、既存evidenceを上書きしない。

### 8.3 Task packet template

```markdown
Objective:
Inputs / frozen contracts:
Owned files:
Read-only dependencies:
Forbidden files/actions:
Required behavior and states:
Required fixtures:
Validation commands:
Evidence to return:
Definition of done:
```

### 8.4 File ownership原則

| 領域 | 所有単位 |
|---|---|
| migration | 1 migration fileにつき1 agent |
| RPC | helper/admin/read/advancedでmigration fileを分離 |
| API | route familyごとに分離、shared helperはroot所有 |
| UI | `shell`、`floor`、`chart`、`list`、`reservation`、`ops`、`mobile`でdirectory分離 |
| style | componentごとのCSS Module。global tokenだけroot所有 |
| test | schema/API/UI/E2E/visualでscript/evidence pathを分離 |
| docs | task ledgerはroot、agentはhandoff本文を返すだけ |

同じfileへの並列編集は禁止する。共通file変更が避けられない場合はrootが統合waveで直列処理する。

### 8.5 Agent task ledger

実装開始時に次を作成する。

```text
docs/evidence/vip-floor-tablecheck/agent-task-ledger.md
```

最低列:

| Wave | Task | Agent | Owned paths | Depends on | Validation | Status | Handoff |
|---|---|---|---|---|---|---|---|

各wave終了時に`docs/AI_CURRENT_STATUS.md`と`docs/AI_WORK_LOG.md`を更新する。

開始時に`git -C website status --short`のdirty manifestを保存し、既存の証跡/研究文書を今回のcommitへ混ぜない。

## 9. Phase 0 — Evidenceとbaseline固定

### Wave 0A — 公開仕様parity台帳

3 subagent:

1. **Visual evidence agent**
   - 公式公開画面のdesktop/tablet/mobile referenceを再確認
   - shell/floor/chart/list/detail/formのgeometry、density、stateを記録
2. **Behavior evidence agent**
   - click、drag、resize、status、waitlist、block、staffのinteraction inventoryを作成
3. **Current-state audit agent**
   - 現行route/component/API/schemaをparity項目へmapping

成果物:

```text
docs/evidence/vip-floor-tablecheck/parity-matrix.md
docs/evidence/vip-floor-tablecheck/behavior-inventory.md
docs/evidence/vip-floor-tablecheck/current-gap-map.md
docs/design-references/vip-floor-tablecheck/**
```

注意:

- 実装時はbrowser automationを必須とし、1440、1200×721、1024、768、390でcaptureする。
- TableCheck実アカウント、認証回避、private endpoint探索は行わない。
- TableCheck assets/CSSを取得してGHOSTへ組み込まない。
- 公開画面で断定できない値は`inferred`とし、GHOST decisionを別列に持つ。

### Wave 0B — Baseline

既存P0計画のWP-0.1/0.2を実行する。

- schema/RPC/route/feature flag snapshot
- public hold、availability、admin v1、Stripe、worker baseline
- representative business day fixture
- current `/admin/vip-floor` desktop/mobile screenshot
- secret/PIIを除外したevidence manifest

Gate 0:

- `check:db-schema`、`test:reservation-saga`、`test:vip-static`、`test:stripe-unbound` pass
- current public bookingとadmin v1のrollback baselineがある
- parity matrixの全項目が`confirmed/inferred/GHOST decision/not applicable`のいずれか
- 未確定項目が実装担当の推測に残っていない

## 10. Phase A — P0 Additive Schema

既存P0計画のStage Aをそのまま実行する。

### Wave A1 — 型・table・column

Owner A:

- `20260714090000_ghost_vip_floor_p0_additive_schema.sql`
- enum、P0 table、P0 column、RLS/revoke、flag default false

Owner B:

- fixture data builder設計
- migration前後の件数、不正interval、orphan検査query
- Aのmigration fileはread-only

Owner C:

- security/Stripe compatibility review
- plaintext PII column、payment schema破壊変更、grant漏れを検査

### Wave A2 — Index、backfill、constraint

Owner A:

- `20260714091500_ghost_vip_floor_p0_indexes.sql`

Owner B:

- `20260714093000_ghost_vip_floor_p0_backfill.sql`

Owner C:

- `20260714094500_ghost_vip_floor_p0_constraints.sql`

rootはschema適用順、冪等性、`NOT VALID`→validate、production lock riskを統合reviewする。

### Wave A3 — Static contract

- `verify-vip-floor-v2-schema.mjs`
- snapshot更新
- RLS/grant/PII/Stripe non-regression検査
- local resetまたはshadow DB apply

Gate Aは既存P0計画の全条件を満たす。Gate AでUI fileを変更しない。

## 11. Phase B — RPC v8 / API v2

### Wave B1 — RPC helperと署名freeze

Owner A:

- `20260714100000_ghost_vip_floor_p0_rpc_helpers_v8.sql`
- capability、version、conflict、audit、business day helper

Owner B:

- F01〜F27 DB fixture harness
- success/error response schema検証

Owner C:

- deadlock order、SECURITY DEFINER search_path、grant、PII review

rootがRPC名、parameter、result/error envelopeをfreezeするまでAPI route実装を開始しない。

### Wave B2 — Mutation / read / API並列

Owner A — mutation RPC:

- `20260714103000_ghost_vip_floor_p0_admin_rpc_v8.sql`
- schedule、assignment、status、block、walk-in、extend、cancel、note、customer

Owner B — read/availability RPC:

- `20260714110000_ghost_vip_floor_p0_read_rpc_v8.sql`
- board snapshot、customer summary、availability v8

Owner C — API v2:

- `src/lib/vipFloorV2Contract.ts`
- `src/lib/server/vipFloorV2*.ts`
- `/api/admin/v2/**`
- error mapping、auth、capability、redaction

API agentはfrozen署名だけを使用し、RPC migrationを編集しない。

### Wave B3 — Contract validation

- auth 401、flag 403、missing idempotency 400
- version/table conflict 409、invalid transition/capacity 422
- manager-only customer read、PII masking
- cancel/refund case atomicity
- 任意分walk-in、180分延長、複数回転
- v1 route response不変

Gate Bは既存P0計画の全条件を満たす。UIはまだv1のまま。

## 12. Phase C — Dual-write

### Wave C1 — DB互換投影

Owner A:

- `20260714120000_ghost_vip_floor_p0_dual_write.sql`
- deterministic projection、version/revision trigger、v8 marker

Owner B:

- catch-up backfill/verifier
- NULL、status mapping、revision、geometry検査

Owner C:

- trigger recursion、double increment、deadlock、worker compatibility試験

triggerからStripe、通知、refund、auto assignmentを実行しない。

### Wave C2 — Route切替とshadow compare

Owner A:

- public hold v7/v8選択
- availability v7/v8選択
- customer profile encryption/write skip policy

Owner B:

- `compare-vip-floor-v1-v2.mjs`
- `verify-vip-floor-v2-dual-write.mjs`

Owner C:

- signed webhook、hold expiry、finalizer、refund worker、LINE worker non-regression

### Gate C — UI開始条件

既存P0計画のGate C 10条件すべてを満たす。特に:

- F01〜F27 pass
- active rowのP0 NULL 0
- v1/v2 common field差分が0または説明可能
- public hold/availabilityを同時に切り替え、rollback rehearsal済み
- Stripe/payment/worker regression 0
- feature flags offならv1へ即時復帰可能

## 13. Phase D — Core UI

### 13.1 UI foundation freeze

Gate C後、最初にrootが次をfreezeする。

- `VipFloorBoardV2` TypeScript contract
- URL query contract
- command/error/capability contract
- GHOST admin tokens、spacing、row height、z-index、focus style
- shared selection model、date rollover、business timezone
- surface directoryとCSS ownership

推奨構成:

```text
src/components/admin/vip-floor-v2/
  VipFloorBoardV2.tsx
  contract/
  api/
  state/
  shell/
  shared/
  floor/
  chart/
  list/
  reservation/
  ops/
  mobile/
```

### Wave D1 — Shell / state / primitives

Owner A — shell:

- top operation bar、left nav、date navigator、view switcher
- daily memo/whiteboard、online state、service period summary
- responsive shellとskip link
- desktop基準は左nav 88±4px、top bar 60±4px、business context 72±4pxとし、実装前visual specで最終承認する

Owner B — state/API:

- board fetch、URL sync、revision reconciliation、stale/conflict recovery
- command dispatcher、Idempotency-Key、pending/retry/error state

Owner C — shared primitives:

- status badge、time/pax/table cells、filter/search、dialog/sheet、toast/live region
- keyboard/touch contractを含むtable/reservation primitives

rootはv1/v2 route gate、global token、public exportsを統合する。

Gate D1:

- v2 read-only shellがflag offでproduction無影響
- 1440/1024/768/390でshell破綻なし
- keyboardだけでdate/view/searchへ到達
- loading/error/stale/permission状態を確認

### Wave D2 — Floor / Chart / List read-only並列

Owner A — floor:

- 66/34±2pt split、右rail min 360〜380px、section tabs、zoom、floor geometry
- table state、最大3回転表示、flags/memo/restriction
- right railのreservation/waitlist/finished/block/staff tabs
- table/reservation selection、multi-table preview。mutationはまだ接続しない

Owner B — chart:

- table×time virtual grid、current-time line、allocation rail
- reservation/block bars、unassigned/cancel/no-show tray
- assignment/time/durationのread-only表現、midnight跨ぎ、auto-scroll、reduced-motion

Owner C — list:

- stable columns、search、sort、filter、memo indicator、bulk selection
- row selectionとdetail deep link
- intentional horizontal table scrollだけを許可

共有fileは編集せず、必要変更をrootへ返す。

Gate D2:

- 3 viewが同じfixtureと選択予約を表示
- 複数回転、未配席、block、overnight、延長を一致表示
- visual parity matrixのcore項目100% pass
- v2 mutation flagがoffのまま、表示/選択/deep linkだけでparityを確認できる

### Wave D3 — Core operations / Reservation detail / form

Owner A — safe commands/DnD:

- floor/chartのreplace/add/remove/unassign、schedule move、duration resize
- drag preview、collision warning、drop commit、button/keyboard command代替
- pointer/touch/keyboard sensor、auto-scroll、live announcement
- 成功後server reconcile、409 conflict reload、permission/flag error

Owner B — detail/form:

- customer/reservation 2-pane
- reservation/payment/images/audit/POS tabs
- masked summaryとmanager-only customer access
- date/time/duration/pax/status/source/purpose/tables/flags/note/orders
- field-level validation、dirty state、cancel confirmation
- conflict時の差分提示とreload

Owner C — lifecycle/service commands:

- create、walk-in、check-in、extend、no-show、complete
- cancel/refund/notify decision
- service status、override reason、block editor
- destructive confirmationとaudit metadata

Gate D:

- core TableCheck操作scenarioがE2E pass
- floor/chartからのmutation後に全viewが同じrevisionへ収束
- dragとbutton/keyboard代替が同じRPC commandを発行する
- v2 mutation flag offでread-only
- v1/v2切替が即時可能
- customer/Stripe情報漏洩0

## 14. Phase E — 高度運用機能をdata-firstで追加

P0後続項目をUIから先に作らない。まず次のP1 contractを別文書でfreezeする。

### 14.1 P1 additive entities

候補:

| Entity | 役割 |
|---|---|
| `service_period_templates` / `service_period_instances` | 通常定義と営業日実体、深夜帯、cutoff |
| `vip_floor_day_notes` | 日次memo/whiteboard、version、author |
| `waitlist_entries` | 希望時刻、pax、priority、status、version |
| `waitlist_contact_attempts` | LINE/SMS/phone呼出、回数、delivery result |
| `waitlist_contact_profiles` | 暗号化contact reference、channel同意、retention |
| `staff_operational_profiles` | 管理権限と分離した現場担当profile |
| `staff_table_assignments` | staff×table×service period/有効時間 |
| `online_acceptance_rules` | service period/section別の受付状態 |
| `recurring_block_series` | 繰返しruleとmaterialized block relation |
| `table_operational_profiles` | lock、restriction、memo、接続属性 |
| `table_connection_groups` | 結合可能table、capacity、priority |
| `placement_suggestions` | 入力snapshot、score、理由、採否 |
| `customer_contact_activities` | consent付き連絡履歴、provider delivery参照 |
| `reservation_attachments` | object metadata、scan state、retention |
| `integration_outbox` | notification/export/POSの非同期副作用 |

全tableはversion、actor、timestamp、audit、RLSを持つ。外部通知はtransactional outboxへ書き、DB triggerから送信しない。

customer向けLINE/SMSは暗号化contact referenceと明示的consentを使用する。既存の社内LINE group送信へfallbackしない。outbox/logにはraw contactを持たず、provider message/delivery IDだけを安全に保持する。

### 14.2 P1 RPC/API

RPC v8へ別関数として追加する。

- create/update/cancel waitlist
- record notify/call attempt
- accept/seat/expire waitlist
- assign/change/remove staff table assignment
- create/update service period
- set online acceptance
- create/update/cancel recurring block series
- materialize recurring blocks idempotently
- suggest/apply placement plan
- request export/POS sync

API v2候補:

```text
/api/admin/v2/waitlist/**
/api/admin/v2/staff-assignments/**
/api/admin/v2/service-periods/**
/api/admin/v2/online-acceptance/**
/api/admin/v2/recurring-blocks/**
/api/admin/v2/placements/suggest
/api/admin/v2/placements/apply
/api/admin/v2/exports/**
/api/admin/v2/integrations/pos/**
```

### Wave E0 — 営業context

- service period template/instance、online acceptance、day memo/whiteboard、block seriesを先行する。
- 深夜営業日、期間境界、単発/series全体編集をfixture化する。
- online offは新規public holdを停止するが、既存holdを破棄しない。

### Wave E1 — P1 schema/RPC/API

3 agentをschema、RPC/worker、API/testに分ける。P0 migrationやcore UI fileを編集しない。

Gate E1:

- waitlist→notify→accept→seatがatomicな配席競合検査を通る
- staff assignmentとblockが時間区間を正しく扱う
- online acceptance変更がpublic availabilityへ反映する
- recurring materializationが再実行で重複しない
- external job失敗がreservation transactionをrollback/破損させない
- notification replayが二重送信せず、raw contactがoutbox/logへ残らない
- staff operational profileがadmin/PII capabilityを暗黙に拡張しない

### Wave E1b — 顧客dossier/attachment

- party breakdown、source/purpose/flags、contact activity、order summary、visit/cancel/no-show集計を追加する。
- attachmentはobject metadataだけをDBへ持ち、MIME/size/malware gateと短寿命signed URLを使用する。
- staff board readはmaskを維持し、manager customer accessをauditする。

### Wave E2 — Ops UI

Owner A:

- waitlist rail、呼出回数、delivery state、seat action

Owner B:

- recurring block、service period、online acceptance command panel

Owner C:

- staff assignment、table overlay、shift filtering

Gate E:

- floor/chart/list/detailで高度運用状態が一致
- notification不達、期限切れ、競合、権限不足を回復可能
- public availability regression 0

## 15. Phase F — 配席最適化、export、POS

### 15.1 配席optimizerの境界

TableCheckの非公開内部アルゴリズムを複製しない。公開画面で観測できる「候補提示、table connection、operator確定」を同等に実現する。

初期運用:

1. suggestion only
2. scoreと理由を表示
3. operatorが個別選択
4. managerがbatch apply
5. RPCがversion/conflictを再検査

hard constraints:

- capacity、reservation interval、active block、hold、section eligibility
- table connection、accessible/VIP restriction、service period
- seated/checkout中の予約を自動移動しない

soft constraints:

- table fragmentation最小化
- turn gap確保
- section balance
- preferred table/guest history
- staff workload

すべての候補へ入力revision、score breakdown、採否、actorを残す。

### Wave F1 — Optimizer

Owner A:

- deterministic candidate generatorとfixture

Owner B:

- suggestion/apply RPC、version recheck、audit

Owner C:

- chart/floor suggestion overlayとmanager confirmation

Gate F1:

- 同じinput revisionで同じ結果
- hard constraint違反0
- stale suggestion apply拒否
- explainabilityをUI/auditで確認
- manual assignmentに常に戻れる

### 15.2 Export/POS

- CSVはformula injectionをescapeし、権限とauditを持つ。
- Excel生成が必要ならserver workerで行う。
- POSはvendor-neutral adapter interfaceを先に作る。
- provider未確定時はUI tabを`not configured`として安全表示し、mock成功を本番へ出さない。
- raw POS payloadやcredentialをbrowser/auditへ出さない。
- syncはoutbox/retry/dead-letter/reconciliationを持つ。

Gate F:

- export内容/権限/文字化け/数式注入test pass
- configured POSだけ有効化
- POS outageでもboardの主要予約操作を継続できる

## 16. Phase G — Mobile、Accessibility、Performance、Realtime

### Wave G1 — Mobile/Tablet専用IA

Owner A:

- mobile table gridとbottom nav

Owner B:

- mobile reservation/waitlist fixed-row listとstep form

Owner C:

- tablet split pane、touch drag、safe area、orientation

desktopを単純縦積みにしない。390×844の最初のviewportで日付、主要view、次の業務actionを理解できるようにする。

### Wave G2 — A11y/Input

- keyboard drag: select → move/resize command → confirm/cancel
- screen reader live region: mutation、conflict、refresh、selection
- focus orderとskip link
- dialog/sheet focus lifecycle
- no color-only state
- reduced motion
- 200% zoom、日本語/英語long label

Gate:

- keyboardのみで予約検索、詳細、配席、status変更、取消を完了
- critical/serious automated a11y finding 0
- touch target gate pass

### Wave G3 — Performance/Realtime

- chart/listを必要に応じwindowingする。
- heavy chart/mobile surfaceをdynamic importする。
- drag中にboard全体をrerenderしない。
- non-urgent filter/scroll updateはtransition扱いにする。
- Realtime eventはentity payloadでなくday revision通知を基本とする。
- subscription断はvisible stale stateとpolling fallbackへ移行する。

性能fixture:

- 80 tables
- 500 chart bars
- 1,000 list rows
- 100 waitlist entries
- 30 active staff assignments
- 500 audit events/reservation detail sample

目標:

- staging p95 board read 800ms以下
- ordinary mutation p95 1,000ms以下。Stripe/notification worker完了時間は別SLO
- INP p75 200ms以下、drag/touch visual feedback 100ms以下を目標とする
- target tabletでdrag中p95 frame 16.7ms以下を目標とし、50ms超のlong taskを残さない
- CLS 0.1以下
- view切替でselectionを失わず、layout shiftを発生させない
- initial surfaceへ不要なchart/export/POS codeを載せない

Gate G:

- 1440×1024、1200×721、1024×768、768×1024、390×844、375×812 pass
- Chrome/Safari相当のdesktop/mobile smoke pass
- Realtime切断、復帰、複数端末、background/foreground pass
- performance budgetまたは説明付き例外が承認済み

## 17. Validation strategy

### 17.1 Static/compile

```bash
npm run check:db-schema
npm run test:reservation-saga
npm run test:vip-static
npm run test:stripe-unbound
npx tsc --noEmit
npm run lint
npm run build
```

新規scriptは実装時にpackage scriptへ登録する。

- `test:vip-floor-v2-schema`
- `test:vip-floor-v2-db`
- `test:vip-floor-v2-api`
- `test:vip-floor-v2-dual-write`
- `test:vip-floor-v2-e2e`
- `test:vip-floor-v2-visual`
- `test:vip-floor-v2-a11y`
- `test:vip-floor-v2-load`

純粋ロジックは既存方針に合わせて`node --test`を基本とし、操作/視覚は`@playwright/test`をrootが依存追加して使用する。test runnerを重複導入しない。`package.json`とlockfileはrootだけが変更する。

既存`audit-vip-release-gates.mjs`はP0の固定証跡とexit semanticsを持つため、v2専用に次を新設する。

```text
scripts/audit-vip-floor-v2-release-gates.mjs
docs/evidence/vip-floor-v2/<timestamp>/**
```

- No-Goはrelease modeでnon-zero exitにする。
- 既存P0 evidenceを上書きしない。
- evidenceは不変の時刻付きdirectoryへ出す。
- gate result、flag matrix、migration、commit、rollback結果をmanifest化する。

### 17.2 DB/API fixture

既存F01〜F27へ次を追加する。

- waitlist priority、notify retry、expiry、seat conflict
- staff interval overlapと解除
- service period境界、深夜営業日、online stop/reopen
- recurring block daylight/timezone、idempotent materialization
- connected tables capacity
- placement stale revision/hard constraint
- export permission/formula injection
- POS retry/dead-letter/reconciliation
- Realtime revision gapとfull refetch

### 17.3 E2E critical scenarios

1. public hold → card setup → signed webhook confirm → floor表示
2. 予約検索 → floor配席 → chartへ切替 →同じtable/time確認
3. 複数table追加 → 1table解除 → list/detail一致
4. chart drag time変更 → conflict → latest reload →再操作
5. duration resize → next reservation collision拒否
6. walk-in任意時刻作成 → seated →延長 →release
7. waitlist追加 → LINE/SMS/phone記録 →受諾 →配席
8. section block → public availability減少 →解除で復帰
9. service period online stop →公開在庫停止 →admin手動予約継続
10. staff assignment → floor overlay →shift終了で非active
11. cancel → reason/refund decision → refund case →worker
12. mobileで検索/詳細/配席/status変更
13. keyboardのみで同workflow
14. ownerとstaffの権限差
15. 2端末同時mutation
16. stale/realtime断/network errorからの回復

### 17.4 Visual parity

各componentは実装前にspec、実装後にreference/actual/diffを残す。

```text
docs/research/components/vip-floor-tablecheck/*.spec.md
docs/design-references/vip-floor-tablecheck/**
docs/evidence/vip-floor-tablecheck/visual-diffs/**
```

比較対象:

- geometry、比率、density、row height、column order
- default/hover/focus/selected/drag/conflict/disabled/error
- floor/chart/list/detail/form/waitlist/block/staff
- desktop/tablet/mobile

TableCheckの色やbrandを合わせるのではなく、構造と操作の差分を判定する。GHOST skin差はexpectedとする。

## 18. Stripe、Security、Privacy gate

- Checkout Sessions/Payment Element、PaymentIntent/Setup flowを維持する。
- `payment_method_types`を追加しない。
- webhook signature verificationを迂回しない。
- DB triggerからStripe APIを呼ばない。
- cancel RPCは`refund_cases`を作るだけで、workerがrefundを実行する。
- secret、raw webhook、full provider objectをclientへ返さない。
- customer profileはserver-side authenticated encryption、blind index、manager capabilityを使う。
- log/audit/fixture/screenshotへ顧客PIIを残さない。
- admin commandはsession、capability、Idempotency-Key、expectedVersionを検査する。
- CSV/POS/notificationも同じredaction/audit policyを通す。

各release candidateでStripe/security専任subagentがread-only reviewし、rootが修正を統合する。

## 19. Feature flags

P0固定flag:

- `FEATURE_VIP_FLOOR_V2_READ_ENABLED`
- `FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED`
- `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED`
- `FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED`
- master: `FEATURE_ADMIN_MUTATION_ENABLED`

後続granular flag候補:

- `FEATURE_VIP_FLOOR_CHART_MUTATION_ENABLED`
- `FEATURE_VIP_FLOOR_WAITLIST_ENABLED`
- `FEATURE_VIP_FLOOR_STAFF_ASSIGNMENT_ENABLED`
- `FEATURE_VIP_FLOOR_ONLINE_ACCEPTANCE_ENABLED`
- `FEATURE_VIP_FLOOR_PLACEMENT_SUGGESTION_ENABLED`
- `FEATURE_VIP_FLOOR_REALTIME_ENABLED`
- `FEATURE_VIP_FLOOR_POS_ENABLED`

flagはread、mutation、external side effectを混同しない。runtime readbackはsecret値でなくconfigured/enabled/alignmentだけを返す。

## 20. Rollout

### 20.1 Environment ladder

1. local reset/shadow DB
2. staging flags off
3. staging v2 read-only + shadow compare
4. staging v2 mutation + dual-write
5. staging external worker test mode
6. production additive schema/dual-write flags off
7. production shadow compare
8. owner/manager read-only canary
9. 1端末/1shift mutation canary
10. 全staffへ段階展開
11. advanced opsを機能別に展開
12. v1 fallback window終了後cleanup

各段階で最低1営業日または定義済みfixture回数の観測を行い、次へ進む条件をevidenceへ残す。実際の観測期間はowner/managerと確定する。

### 20.2 Canary stop conditions

- inventory/assignment差分
- version/revision anomaly
- duplicate reservation/refund/notification
- signed webhook failure増加
- public availability不整合
- PII/secret露出
- operatorが主要workflowを完了できない
- p95がbudgetを継続超過

一つでもcriticalがあれば該当flagをoffにし、v1へ戻す。

監視checkpointsは切替直後、15分、2時間、営業終了後、24時間後とする。業務特性によりowner/managerがより長い観測を要求できる。

## 21. Rollback

### Code

- v2 read/mutation/advanced flagsをoff
- route gateをv1へ戻す
- public hold/availabilityをv7へ同時に戻す

### DB

- additive table/columnはrollback時にdropしない。
- compatibility triggerはsettingで停止できるようにする。
- catch-up/backfillは冪等に再実行可能にする。
- destructive cleanupはrollback window終了後だけ行う。

### External side effect

- notification/POS/export workerを停止
- outbox/dead-letterを保持し、重複実行をidempotencyで防ぐ
- Stripe webhook/refund workerの既存経路を維持

### UI

- v2 componentとCSS Moduleは残してflagで非表示にする。
- v1 fallbackが同じadmin sessionで開けることを毎release確認する。

## 22. Wave-by-wave agent roster

| Wave | Agent 1 | Agent 2 | Agent 3 | Root integration |
|---|---|---|---|---|
| 0A | visual evidence | behavior evidence | current gap | parity freeze |
| 0B | DB baseline | API/Stripe baseline | UI baseline | Gate 0 |
| A1 | schema | fixture queries | security review | schema review |
| A2 | indexes | backfill | constraints | Gate A |
| B1 | RPC helpers | DB fixtures | security/deadlock | signature freeze |
| B2 | mutation RPC | read RPC | API v2 | Gate B |
| C1 | projection trigger | catch-up | worker compatibility | trigger review |
| C2 | route switch | shadow compare | Stripe regression | Gate C |
| D1 | shell | state/API client | shared primitives | route gate |
| D2 | floor | chart | list | cross-view reconcile |
| D3 | detail | form | command dialogs | Gate D |
| E1 | advanced schema | advanced RPC/worker | advanced API/tests | data Gate |
| E2 | waitlist | service/block | staff | Gate E |
| F1 | optimizer core | apply RPC | suggestion UI | Gate F1 |
| F2 | export | POS adapter | integration tests | Gate F |
| G1 | mobile grid | mobile workflow | tablet/touch | responsive Gate |
| G2 | a11y/keyboard | performance | realtime/multi-device | Gate G |
| H1 | E2E/visual | security/Stripe | release/runbook | release candidate |
| H2 | canary observer | regression observer | evidence recorder | flag/deploy authority |

agent空き枠を埋めるためだけの委譲はしない。依存が未freezeのagentはreview、fixture、evidenceなど独立したread-only taskを担当する。

## 23. Final release checklist

- [ ] 4方針とscope境界が変更されていない
- [ ] parity matrixのin-scope項目が全てpass
- [ ] Gate 0/A/B/C/D/E/F/Gがevidence付きpass
- [ ] migration apply順とrollback rehearsal pass
- [ ] F01〜F27と後続fixture pass
- [ ] v1/v2 shadow diffが説明可能
- [ ] public booking、availability、card setup、signed webhook pass
- [ ] refund/notification/POS workerのidempotency pass
- [ ] 2端末競合、network/realtime failure pass
- [ ] desktop/tablet/mobile visual pass
- [ ] keyboard/touch/a11y pass
- [ ] load/performance budget pass
- [ ] PII/secret/raw provider payload leak 0
- [ ] v1 fallback pass
- [ ] owner/manager/engineer Go記録
- [ ] 既存release auditのWAF/webhook外部checkがclosed、または責任者waiver記録
- [ ] runbook、operator guide、incident rollback guide更新

## 24. 完了成果物

### Data/API

- additive migrations
- RPC v8 helper/mutation/read/advanced functions
- API v2 routes、shared contract、typed errors
- dual-write、shadow compare、outbox、audit/version/revision

### UI

- GHOST-skinned TableCheck型shell
- floor/chart/list
- detail/form
- waitlist/block/staff/service period/online acceptance
- placement suggestion、export/POS状態
- mobile/tablet専用surface

### Quality/Operations

- component specs、screenshots、visual diffs
- DB/API/E2E/a11y/performance fixtures
- agent task ledgerとwave handoff
- migration/rollout/rollback/operator/incident runbook
- final parity report

## 25. 実装着手時の最初の3 task

ユーザーが実装開始を指示したら、最初のwaveは次とする。

1. root: task ledger作成、所有path freeze、baseline commit/worktree状態確認
2. subagent A: TableCheck公開visual parity再確認とcomponent spec分割
3. subagent B: DB/schema/RPC baseline evidence更新
4. subagent C: API/Stripe/worker regression baseline更新

rootがGate 0を判定後、`WP-A1 additive schema`へ進む。UI builder agentはGate Cまで起動しない。

## 26. 今回未実施

- source/UI/CSS/API/RPC/migrationの実装
- package追加
- database migration apply
- Supabase/Stripe/LINE/POS変更
- feature flag変更
- browser screenshot再取得
- lint/build/E2E/load test
- commit/deploy

今回は実装順、multi-agent分担、Gate、品質、rollout/rollbackを確定する計画書作成だけを行った。
