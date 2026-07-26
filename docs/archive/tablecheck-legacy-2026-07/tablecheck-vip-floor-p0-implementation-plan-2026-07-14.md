# TableCheck型 VIP Floor Board P0 実装計画

- 作成日: 2026-07-14 JST
- 対象: `/admin/vip-floor`のUI実装前データ基盤
- 正となる契約: `tablecheck-vip-floor-p0-data-contract-2026-07-14.md`
- 実施順序: additive schema → RPC v8 / API v2 → dual-write
- 現在地: 計画のみ。migration / RPC / API / UIは未実装

## 1. ゴール

この計画の完了時点では、既存VIP Floor UIを切り替えずに次が成立している。

1. 既存予約と新規予約の両方がP0データ契約を満たす
2. v8 RPCだけで複数回転、任意時刻、配席変更、未配席、block、service status、note、cancelを操作できる
3. API v2から同一営業日のfloor / chart / list用データを一貫したsnapshotとして取得できる
4. 現行v7 route、公開予約、Stripe Checkout、Webhook、hold finalizer、refund workerが継続動作する
5. v1 UIは変更せず、v2 UIを作り始められる安定したread/mutation contractがある
6. v2を無効化すれば即座にv1運用へ戻せる

## 2. 今回の非対象

- React / CSS / floor / chart / list UI
- 自動・最適配席
- 順番待ち、SMS呼出
- スタッフテーブル割当
- POS連携
- Realtimeを正しさの前提にすること
- 既存Stripe Checkout / Payment Element構成の変更
- Stripe API version変更
- 既存migrationの書換え

## 3. 実施フロー

```text
Baseline固定
   ↓
A1 additive schema
   ↓
A2 backfill / constraints / seed
   ↓
Gate A: 既存v7無回帰 + P0 schema完全性
   ↓
B1 共通v8 helper
   ↓
B2 admin mutation RPC v8 + read RPC + availability v8
   ↓
B3 API v2 + server types + error mapping
   ↓
Gate B: v8単独fixture + v1 UI無変更
   ↓
C1 deterministic projection dual-write
   ↓
C2 public hold / availability cutover
   ↓
C3 legacy admin / worker shadow整合
   ↓
C4 catch-up backfill + v1/v2 shadow compare
   ↓
Gate C: dual-write安定・rollback確認
   ↓
UI実装開始可
```

各Gateをpassするまで次段階へ進まない。productionへのmigration適用とfeature flag切替は別操作とし、同時実行しない。

## 4. 全段階の共通ルール

### 4.1 DB変更

- 新しいmigrationだけを追加し、適用済みmigrationを編集しない。
- P0期間中は既存列、enum値、v7 RPCをdrop / renameしない。
- 新列はnullableまたは安全なdefaultで追加し、backfill後にconstraintをvalidateする。
- 大量更新は営業中に一括実行せず、対象件数とlock時間を事前計測する。
- migrationはtransaction内で実行可能なDDLと、長時間index作成を必要に応じて分離する。
- RLSは`ENABLE`と`FORCE`を設定し、anon/authenticatedへ直接権限を与えない。
- v8 RPCは`SECURITY DEFINER`、固定`search_path`、service-role-only grantとする。

### 4.2 mutation

- `Idempotency-Key`、actor、request ID、expected version、reasonを受ける。
- `SELECT ... FOR UPDATE`後にexpected versionを比較する。
- business update、audit、board revision増分を同一transactionで完了する。
- errorを例外文字列だけで潰さず、stable codeへmapする。
- client retryで重複rowや重複notificationを作らない。

### 4.3 Stripe

- public bookingのStripe object作成順序、metadata、idempotency keyを変更しない。
- Checkout / SetupIntent / PaymentIntent / Webhook署名検証を維持する。
- P0 mutationからStripe APIを同期呼出ししない。
- cancelは既存`refund_cases`へ要求を積み、workerが返金する。
- raw webhook payload、client secret、secret keyをv2 board / audit / logsへ出さない。

### 4.4 互換性

- v1 read: `GET /api/admin/vip-status`
- v1 admin mutations: 既存`/api/admin/...`
- v2 read/mutations: 新規`/api/admin/v2/...`
- v1とv2を同時にdeploy可能にする。
- v2 routeを作っても、v1 UIのimportやfetch先を変更しない。
- Stage 0でpublic route、admin v7 RPC、webhook/finalizer/refund/LINE workerを含む全writer inventoryを作る。各writerは既存domain auditまたはPIIを含まない`source_contract`付きsystem auditのどちらかを持ち、raw row before/afterをauditへ保存しない。

## 5. 影響範囲

### 5.1 既存DB

主な対象:

- `event_days`
- `booking_slots`
- `seat_resources`
- `customers`
- `reservations`
- `reservation_resources`
- `audit_logs`
- `refund_cases`
- `admin_action_requests`
- `app_settings`

既存のStripe、payment、webhook、worker queueテーブルはschema変更対象外。relation確認と回帰検証だけ行う。

### 5.2 既存write path

dual-writeで漏らしてはいけないwrite path:

1. `begin_public_reservation_hold_v7`
2. `finalize_public_reservation_hold_stripe_v7`
3. `confirm_reservation_locks_v7`
4. public/admin hold expiry/release
5. admin hold作成/延長/解除
6. assign / confirm / check-in / cancel
7. walk-in
8. seated extension
9. Stripe webhook workerのreservation status更新
10. status token経由のcustomer操作

全v7関数をv8へ一括書換えず、決定論的な新列投影はcompatibility trigger、業務操作はv8 RPCへ分離する。

### 5.3 既存コード

- `src/app/api/admin/vip-status/route.ts`
- `src/app/api/admin/reservations/**`
- `src/app/api/admin/walk-ins/route.ts`
- `src/app/api/reservations/availability/route.ts`
- `src/app/api/reservations/seat-availability/route.ts`
- `src/app/api/reservations/holds/route.ts`
- `src/lib/server/adminActionRoutes.ts`
- `src/lib/server/vipReservation.ts`
- `src/lib/server/featureFlags.ts`
- `src/lib/server/workers/*`
- `src/components/admin/vip-floor/types.ts`
- `src/data/vipSeats.ts`

`VipFloorDashboard.tsx`とCSSは本計画では変更しない。

## 6. Stage 0 — Baseline固定

### WP-0.1 現状snapshot

作業:

- 現行schema snapshotを取得する。
- reservation / reservation_resources / event_days / booking_slotsの件数を環境別に記録する。
- status別件数、active lock数、customer/payment relation欠損数を記録する。
- migration適用前のv1 API response fixtureを匿名化して保存する。
- dirty worktreeの既存差分を一覧化し、今回対象と混在させない。

想定ファイル:

- `scripts/snapshot-vip-schema.sql`更新
- 新規`docs/evidence/vip-floor-v2/baseline-*.json`
- 新規`docs/evidence/vip-floor-v2/baseline-summary.md`

### WP-0.2 既存検証のbaseline

必須command:

```bash
npm run check:db-schema
npm run test:reservation-saga
npm run test:vip-static
npm run test:stripe-unbound
```

DB fixture環境が利用可能な場合:

```bash
npm run verify:allocation-fixtures
npm run verify:stripe-db-matrix
```

### Gate 0

- static 4系統がpass
- fixture失敗がある場合はP0実装前からの失敗か、新規失敗かを分類済み
- production secretや顧客PIIがevidenceへ入っていない

## 7. Stage A — Additive schema

### WP-A1 型・列・新テーブル

新規migration:

```text
supabase/migrations/20260714090000_ghost_vip_floor_p0_additive_schema.sql
```

追加内容:

1. `vip_service_status` enum
2. `floor_sections`
3. `reservation_service_events`
4. `reservation_notes`
5. `reservation_blocks`
6. `reservation_block_targets`
7. `customer_profiles`
8. `customer_tags`
9. `reservation_cancellations`
10. `vip_floor_day_revisions`
11. `reservation_assignment_events`
12. P0契約で定義した`reservations`追加列
13. `reservation_resources`の時間、role、actor、version列
14. `seat_resources`のsection、geometry、lock、version列
15. `audit_logs`のevent day、entity、version、changed fields列
16. `app_settings.vip_floor_v2_dual_write`を`false`で追加

制約:

- 既存予約を壊す可能性があるNOT NULLはこのmigrationで付けない。
- `customer_profiles`のciphertextは`bytea`。平文contact列を作らない。
- `reservation_resources`の既存unique constraintはこの段階で外さない。
- `reservation_blocks`とtargetsはsoft delete前提。
- 新テーブルはRLS強制、service role以外の直接権限なし。

### WP-A2 Index

同migrationまたは別migration:

```text
supabase/migrations/20260714091500_ghost_vip_floor_p0_indexes.sql
```

主なindex:

- `reservations(event_day_id, scheduled_start_at, scheduled_end_at)`
- `reservations(event_day_id, service_status)`
- `reservation_resources(seat_resource_id, assigned_start_at, assigned_end_at)` active filter
- `reservation_resources(reservation_id, lock_status)`
- `reservation_blocks(event_day_id, start_at, end_at, status)`
- `reservation_block_targets(seat_resource_id, block_id)`
- `reservation_service_events(reservation_id, occurred_at desc)`
- `reservation_notes(reservation_id, pinned, updated_at desc)` active filter
- `audit_logs(reservation_id, created_at desc)`
- `audit_logs(event_day_id, created_at desc)`
- `customer_tags(customer_id, tag_code)` unique

営業中productionで必要なら`CREATE INDEX CONCURRENTLY`をtransactional migrationから分離する。

### WP-A3 Backfill

新規migration:

```text
supabase/migrations/20260714093000_ghost_vip_floor_p0_backfill.sql
```

順序:

1. `reservations.event_day_id`をbooking slotからbackfill
2. `scheduled_start_at / scheduled_end_at`をslotからbackfill
3. `expected_release_at`を`seat_extended_until_at → seat_due_at → scheduled_end_at`の順でbackfill
4. confirmedを`service_status=expected`へbackfill
5. checked-inを`service_status=seated`へbackfill
6. `service_status_changed_at`を既存timestampからbackfill
7. `reservation_resources.assigned_start_at / assigned_end_at`をreservationからbackfill
8. reservation/resource versionを1へbackfill
9. event day revision rowを0で作成
10. `floor_sections`とseat geometryを`vipSeats`のpublic resource codeからseed
11. `operator_note`を`reservation_notes(kind=booking)`へ冪等backfill

backfillは`WHERE new_column IS NULL`で冪等にする。既存localStorage memoはDB migrationから取得できないため対象外。

### WP-A4 Constraint validate

新規migration:

```text
supabase/migrations/20260714094500_ghost_vip_floor_p0_constraints.sql
```

作業:

- start < end check
- expected release >= scheduled start check
- assignment start < end check
- version >= 1 check
- block targetがtable / section / venueのどれか1つであるcheck
- cancellation reason / refund decision check
- backfill対象列のNOT NULL化
- 旧`UNIQUE(reservation_id, seat_resource_id)`はv7の`ON CONFLICT`互換のため維持する。partial unique化はv1 rollback window終了後の別Gateへ延期する
- assignmentのrelease/reactivate/interval変更は`reservation_assignment_events`へappend-onlyで残す

constraintは可能なものを`NOT VALID`で追加し、別statementで`VALIDATE CONSTRAINT`する。

### WP-A5 Static schema contract

変更:

- `scripts/check-db-schema-static.mjs`
- `scripts/snapshot-vip-schema.sql`
- `scripts/verify-p0-spec-schema-diff.mjs`

新規:

- `scripts/verify-vip-floor-v2-schema.mjs`

検証項目:

- 追加table / enum / column / index
- RLS / revoke / service-role grant
- 平文PII列がない
- v7 RPCが残っている
- `payment_method_types`が増えていない
- 既存Stripe/payment tableに破壊変更がない

### Gate A

- local DB resetまたはshadow DB migrationが成功
- backfill欠損0
- start/end不正0
- confirmed/checked-in status mapping不正0
- orphan assignment/block/notes 0
- baseline static検証がすべてpass
- v1 availability / public hold / admin status responseが変更前fixtureと互換
- rollbackはコード切替不要。新列・新tableをv1が無視できる

Gate AでUIコードは変更しない。

## 8. Stage B1 — 共通RPC v8基盤

新規migration:

```text
supabase/migrations/20260714100000_ghost_vip_floor_p0_rpc_helpers_v8.sql
```

### WP-B1.1 Helper関数

| 関数 | 役割 |
|---|---|
| `require_admin_capability_v8` | actor active、role、操作capability検査 |
| `assert_reservation_version_v8` | expectedVersion比較 |
| `reservation_effective_interval_v8` | 予約計画と解放見込を取得 |
| `assert_assignment_conflict_free_v8` | assignmentとall-operations blockの時間競合検査 |
| `bump_vip_floor_day_revision_v8` | 日次revisionをatomic increment |
| `append_vip_floor_audit_v8` | version差分、entity、changed fieldsを記録 |
| `resolve_vip_service_transition_v8` | 標準遷移とmanager override検査 |
| `resolve_business_day_for_timestamp_v8` | 深夜帯を含む営業日解決 |
| `active_reservation_assignment_v8` | active relation判定を一箇所へ集約 |

helper自体にも`REVOKE ALL`を適用し、外部から直接呼ばせない。mutation RPCだけが使用する。

### WP-B1.2 Error code

PL/pgSQLの自由文例外だけに依存せず、次のどちらかへ統一する。

推奨:

```json
{
  "action": "rejected",
  "error": {
    "code": "VERSION_CONFLICT",
    "currentVersion": 8,
    "details": {}
  }
}
```

DB接続失敗・予期しない例外だけをHTTP 500へし、業務競合はRPC resultから409/422へmapする。

## 9. Stage B2 — Admin mutation RPC v8

新規migration:

```text
supabase/migrations/20260714103000_ghost_vip_floor_p0_admin_rpc_v8.sql
```

### WP-B2.1 RPC一覧

| RPC | 主な処理 |
|---|---|
| `set_admin_reservation_schedule_v8` | schedule変更、active assignment時間同期、競合検査 |
| `change_admin_reservation_assignments_v8` | replace/add/remove/unassign |
| `set_admin_reservation_service_status_v8` | service event、current status、完了/no-show時release |
| `create_admin_reservation_block_v8` | table/section/venue block作成 |
| `update_admin_reservation_block_v8` | expectedVersion付きblock更新 |
| `cancel_admin_reservation_block_v8` | block soft delete |
| `create_admin_walk_in_reservation_v8` | 同event day/offeringの決定論的compatibility anchor slotを持ち、任意時刻を丸めず作成、checked-in/seated開始 |
| `extend_checked_in_reservation_seat_v8` | 15〜240分、assignment競合検査、180分許可 |
| `confirm_admin_reservation_v8` | lifecycle confirm + service expected + version/revision |
| `check_in_admin_reservation_v8` | seated、120分保証、競合検査 |
| `cancel_admin_reservation_v8` | cancellation row、resource release、refund case、notification判断 |
| `upsert_admin_reservation_note_v8` | shared noteの作成/更新 |
| `archive_admin_reservation_note_v8` | note soft delete |
| `upsert_admin_customer_profile_v8` | ciphertextとblind indexだけを保存 |

### WP-B2.2 配席lock順

deadlock回避のため、1 transaction内で次の順にlock/writeする。

1. `admin_action_requests`をidempotency keyでpreclaimし、既存rowはlock/replay判定
2. reservation row（予約を伴うcommandのみ）
3. 対象seat resourcesをUUID昇順
4. 対象reservation resourcesをUUID昇順
5. 重なるblock rowsをUUID昇順
6. audit insertとpreclaim済みaction response確定
7. event day revisionをatomic increment

複数table追加でも順序を変えない。

block作成/更新も同じseat resource lock順を使用する。assignment側とblock側がqueryだけで重複判定すると競合raceになるため、対象seatをlock後に双方のintervalを再検査する。

初期案のrevision-first順は採用しない。legacy v7 writerは既に`admin_action_requests`、reservation、seat rowをlockした後にStage C projection triggerへ入るため、trigger内でrevisionを後取得するとv8のrevision-firstと逆順になり得る。v8もaction requestを先にpreclaimし、v7 rollback window中はrevisionを全writerの最後に更新する。preclaimはtransaction内で`INSERT ... ON CONFLICT`と既存row lock/replay判定を行い、部分失敗時はcommand全体とともにrollbackする。

### WP-B2.3 unassign

- `reopenOnlineInventory`を必須にする。
- falseの場合、解除前table・同一時間へ`online_only / unassignment_guard` blockを同一transactionで作る。
- trueの場合、blockを作らない。
- active assignmentが0になった予約はread modelでunassignedへ導出する。

### WP-B2.4 cancel

- reason code / note / refund decision / amount / notify customerを保存する。
- noneはcaseなし、partialは0より大きくremaining refundable以下、fullはserverがremaining amountを算出、reviewは承認までexecutable caseなしとする。
- payment、成功済み/処理中case、累積refundをlockし、currency/environment/account bindingを検査する。
- refundはidempotentな`refund_cases` insertまで。
- Stripe APIは呼ばない。
- notification jobはnotify=trueの場合だけ作る。
- resource release、cancellation、refund case、auditが部分成功しないことをfixtureで確認する。

## 10. Stage B3 — Read RPC / Availability v8

新規migration:

```text
supabase/migrations/20260714110000_ghost_vip_floor_p0_read_rpc_v8.sql
```

### WP-B3.1 Board read RPC

```text
get_admin_vip_floor_board_v8(p_actor_admin_id uuid, p_business_date date)
```

要件:

- 1 SQL statement / transaction snapshotでboardを返す。
- event day、sections、tables、reservations、assignments、blocks、notes、totals、board revisionを含む。
- tableの`reservationIds[]`はassigned start昇順。
- 未配席reservation IDを別配列で返す。
- staffにはmasked customer summaryだけを返す。
- ciphertext、raw contact、provider object raw payloadを返さない。
- `schemaVersion = vip-floor.v2`を返す。
- `generatedAt`とsnapshot時刻を返し、全配列のstable sort、visible service window外予約の包含規則、total/cursor規則をcontract fixtureで固定する。
- transition期間のNULL新列はfallbackし、`legacyFallbackCount`を返す。

### WP-B3.2 Customer detail read

DB RPCはciphertextと安全な集計だけを返し、復号はNext serverで行う。

```text
get_admin_customer_profile_v8(p_actor_admin_id uuid, p_customer_id uuid)
```

manager以上のみ。auditへ`customer_profile.read`を残すか、少なくともaccess logを残す。

### WP-B3.3 Availability v8

```text
calculate_public_availability_v8(date, int)
calculate_public_seat_availability_v8(date, int)
```

v8はslotを販売候補として返すが、占有判定は次を使う。

- reservation/assignmentの実時間
- active hold expiry
- `online_only`と`all_operations` block
- offering resource requirement
- table online eligibility

この段階では関数を作成・fixture検証するだけで、public routeはまだv7を呼ぶ。

## 11. Stage B4 — API v2

### WP-B4.1 Shared型

新規候補:

- `src/lib/vipFloorV2Contract.ts`
- `src/lib/server/vipFloorV2.ts`
- `src/lib/server/vipFloorV2Commands.ts`
- `src/lib/server/customerProfileCrypto.ts`

責務:

- enum / response / command型
- strict date / time / UUID / expectedVersion validation
- RPC resultからHTTP errorへのmapping
- capability mapping
- AES-256-GCM等の認証付き暗号とHMAC blind index
- log redaction

暗号envelopeは`formatVersion/keyId/nonce/ciphertext/authTag`を含むdocumented formatとし、active/legacy key readと監査付きrotationを実装する。P0検索tokenは完全一致のみ。prefix/keyword検索は漏洩review後のP1とする。

暗号鍵:

- `VIP_CUSTOMER_PROFILE_ENCRYPTION_KEY`
- `VIP_CUSTOMER_SEARCH_KEY`

repoやDBへ鍵を保存しない。production/staging/testで別鍵を使う。

### WP-B4.2 Feature flags

`src/lib/server/featureFlags.ts`へ追加:

- `FEATURE_VIP_FLOOR_V2_READ_ENABLED`
- `FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED`
- `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED`
- `FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED`

既存`FEATURE_ADMIN_MUTATION_ENABLED`をmaster kill switchとして維持する。v2 mutationは両方trueの時だけ許可する。

runtime readbackには値そのものではなく、enabled/configuredだけを出す。

`src/app/api/admin/runtime/flags/route.ts`はNode側flagに加え、`app_settings`の`vip_floor_v2_dual_write`をadmin認証後に取得する。Node/DBのdual-write状態が不一致なら`alignment: mismatch`を返す。

### WP-B4.3 Read route

新規:

```text
src/app/api/admin/v2/vip-floor/route.ts
src/app/api/admin/v2/customers/[customerId]/route.ts
```

read flag false時は403 `{ ok:false, error:"vip_floor_v2_read_disabled" }`。admin session必須。

### WP-B4.4 Mutation routes

新規:

```text
src/app/api/admin/v2/reservations/[reservationId]/schedule/route.ts
src/app/api/admin/v2/reservations/[reservationId]/assignments/route.ts
src/app/api/admin/v2/reservations/[reservationId]/service-status/route.ts
src/app/api/admin/v2/reservations/[reservationId]/extend-seat/route.ts
src/app/api/admin/v2/reservations/[reservationId]/cancel/route.ts
src/app/api/admin/v2/reservations/[reservationId]/notes/route.ts
src/app/api/admin/v2/walk-ins/route.ts
src/app/api/admin/v2/vip-blocks/route.ts
src/app/api/admin/v2/vip-blocks/[blockId]/route.ts
src/app/api/admin/v2/customers/[customerId]/route.ts
```

既存routeは変更しない。

### WP-B4.5 Admin route共通処理

`runAdminRpcActionV2`を新設または既存helperを拡張する。

要件:

- v2 mutation flag
- expectedVersion必須
- Idempotency-Key必須
- typed RPC error mapping
- currentVersion / boardRevision / auditLogIdをresponseへ含める
- PII / DB例外全文をclientへ返さない

既存v1 routeのerror shapeを変えない。

### WP-B4.6 API tests

新規:

- `scripts/verify-vip-floor-v2-api-static.mjs`
- `scripts/verify-vip-floor-v2-api-contract.mjs`

最低ケース:

- 未認証401
- mutation disabled 403
- missing idempotency 400
- invalid version 400
- version conflict 409
- table conflict 409
- capacity override 422
- role不足403
- PII masking
- customer endpoint manager制限
- raw Stripe object / secret非露出

### Gate B

- v8 RPC fixture matrixがpass
- v2 API contract tests pass
- v2 readでtableごとに複数予約が時刻順
- 任意時刻walk-inと180分延長fixture pass
- version conflictで片方だけ成功
- cancel/refund caseのatomicity pass
- v1 API / UI fetch先に差分なし
- feature flags offでproduction挙動が変更されない

## 12. Stage C — Dual-write

### 12.1 方針

dual-writeを、各routeで同じINSERTを2回行う実装にはしない。DB transaction内で旧列と新列を同時に更新する。

構成:

- v8 RPC: business mutationの正
- compatibility trigger: v7/workerが書いたrowの決定論的なP0投影を補完
- revision/version trigger: 全writerの変更検知
- feature flag / app setting: activationとrollback

triggerが行ってよいこと:

- event day、scheduled time、expected releaseの補完
- assignment timeの補完
- confirmed/checked-in初期service statusの補完
- row version増分
- board revision増分

triggerが行ってはいけないこと:

- Stripe API call
- notification job作成
- refund case作成
- 自動配席
- lifecycle status変更
- block自動作成
- PII復号

### WP-C1 Compatibility projection

新規migration:

```text
supabase/migrations/20260714120000_ghost_vip_floor_p0_dual_write.sql
```

関数/trigger候補:

| 名前 | 対象 | 処理 |
|---|---|---|
| `project_reservation_floor_fields_v8` | reservations BEFORE INSERT/UPDATE | dual-write setting有効時に新列を補完 |
| `project_assignment_floor_fields_v8` | reservation_resources BEFORE INSERT/UPDATE | assignment時間/role/version補完 |
| `bump_reservation_version_trigger_v8` | reservations BEFORE UPDATE | relevant changeでversion+1 |
| `bump_assignment_version_trigger_v8` | reservation_resources BEFORE UPDATE | relevant changeでversion+1 |
| `touch_vip_floor_revision_trigger_v8` | reservations/resources/blocks AFTER change | 対象営業日のrevision+1 |

version/revisionを二重加算しないため、v8 RPCはtransaction開始時に`SET LOCAL ghost.vip_floor_v8_managed = '1'`相当のmarkerを設定し、自身でversion/revisionを更新する。compatibility triggerはmarkerがあるtransactionをskipする。v7/workerにはmarkerがないためtriggerが補完する。

recursionと不要なrevision増分を防ぐため、changed column listを明示する。`updated_at`だけの変更ではboard revisionを増やさない。

### WP-C2 Catch-up backfill

dual-writeを有効化する直前に、Stage A backfill以降に作られたrowへ同じ冪等backfillを再実行する。

確認query:

- active reservationのnew contract NULL件数
- active assignmentの時間NULL件数
- status/service status不整合
- event day revision欠損
- geometry未割当seat

すべて0になるまでv2 readを現場UIへ接続しない。

### WP-C3 Public holdのv8書込み

新規RPC:

```text
begin_public_reservation_hold_v8
```

最新版v7のrate limit、idempotency、resource requirement、Stripe binding、hold expiryを維持し、新列を同じINSERTで書く。

`src/app/api/reservations/holds/route.ts`はfeature flagで呼出RPCだけを選ぶ。

```text
dual-write off -> begin_public_reservation_hold_v7
dual-write on  -> begin_public_reservation_hold_v8
```

Stripe object作成以降のコード、metadata、idempotency key、response shapeは変えない。

### WP-C4 Availability切替

`src/app/api/reservations/availability/route.ts`と`seat-availability/route.ts`で、dual-write flagに応じてv7/v8を選ぶ。

切替順序:

1. v8 availabilityをshadow実行し、v7との差分を記録
2. blockがない日では同一availabilityになることを確認
3. block fixtureでは仕様どおりv8だけ在庫減になることを確認
4. v8 hold作成とv8 availabilityを同時に有効化

holdだけv8、availabilityだけv7という中間状態をproductionへ残さない。

### WP-C5 Legacy admin / worker互換

現行v1 UIがv7 admin mutationを呼んでも、projection/version/revision triggerがP0列を補完することを確認する。

対象fixture:

- admin hold
- assign
- confirm
- check-in
- cancel
- walk-in
- extend seat
- hold expiry
- Stripe webhook confirm
- hold finalizer retry/finalize

legacy pathでは高度なv8 service eventやcancellation detailは作らない。v2 UI切替後にのみv8 commandを正とする。legacy更新はauditへ`source_contract=v7_compat`を付けられる範囲で付ける。

### WP-C6 Customer profile dual-write

public hold routeは既に正規化済みemail/phoneを持つ。customer profile write flagが有効で暗号鍵が揃っている時だけ、serverで暗号化してv8 RPCへ渡す。

- 鍵不足時や暗号化失敗時も公開予約全体を停止させない。profile writeだけskipし、PIIを含まない監視metricを出す。
- customer profileは補助台帳であり、予約在庫・Stripe holdより優先しない。productionでも予約継続+PII非保存を固定動作とする。
- Stripeから過去contactを一括取得してbackfillしない。
- 既存customerはguest label / hash /予約履歴だけでcustomer summaryを作れる。

### WP-C7 Shadow compare

新規:

- `scripts/compare-vip-floor-v1-v2.mjs`
- `scripts/verify-vip-floor-v2-dual-write.mjs`

比較:

- business date
- reservation数
- status別件数
- seat数
- active assignment数
- public code / resource code relation
- payment evidence summary
- v2だけのservice status / block / version / revision

PIIはcompare outputへ保存しない。差分はID hashまたはpublic codeで記録する。

## 13. Dual-write rollout

### Staging

1. Stage A migration適用
2. Gate A
3. Stage B migration/code deploy、v2 flags off
4. v8 fixture
5. v2 readだけon、shadow compare
6. dual-write DB setting on
7. catch-up backfill
8. public hold/availability v8 on
9. worker/admin compatibility fixture
10. 24時間または十分な予約サイクル監視

### Production

1. 低トラフィック時間を選ぶ
2. DB backup / schema snapshot / rollback owner確認
3. Stage A migration適用、v1 smoke
4. Stage B migration/code deploy、全v2 flags off
5. v2 read on、内部確認のみ
6. DB dual-write setting on
7. catch-up backfill、NULL 0確認
8. hold/availability v8 shadow compare
9. `FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED=true`
10. signed Stripe webhook、hold→card setup→confirmの非回帰確認
11. admin v7操作の投影確認
12. Gate C判定

public bookingとWebhook処理の既存master flagsを同時に変更しない。

Node側feature flagとDB側app settingはruntime readbackへ両方出し、不一致は一時切替中以外No-Goとする。

## 14. Rollback

### Code rollback

1. v2 mutation flag off
2. dual-write feature flag off
3. `app_settings.vip_floor_v2_dual_write=false`
4. public availability / holdをv7へ戻す
5. v2 read flag off
6. v1 smokeを実行

### DB rollback

- additive column/tableは即dropしない。
- projection triggerは`app_settings.vip_floor_v2_dual_write=false`で停止する。
- version/revision triggerに問題がある場合は専用disable migrationを作る。
- v2で作ったblock/note/service eventは保持し、v1が無視する。
- v2で作った任意時刻予約は`booking_slot_id`互換参照を持つためv1でも予約自体は失わない。
- 新データを削除してrollbackしない。

### Stripe rollback

- Stripe objectやWebhook eventを巻き戻さない。
- DB rollback中もWebhook署名検証とworkerを維持する。
- refund caseを直接cancelせず、既存worker運用手順に従う。

## 15. 検証command計画

package.jsonへ追加候補:

```text
check:vip-floor-v2-schema
test:vip-floor-v2-rpc
test:vip-floor-v2-api
test:vip-floor-v2-dual-write
test:vip-floor-v1-v2-compare
```

各Gateで実行:

```bash
npm run check:db-schema
npm run check:vip-floor-v2-schema
npm run test:reservation-saga
npm run test:vip-static
npm run test:stripe-unbound
npm run test:vip-floor-v2-rpc
npm run test:vip-floor-v2-api
npm run test:vip-floor-v2-dual-write
npm run lint
npm run build
```

外部fixtureが可能な環境では追加:

```bash
npm run verify:allocation-fixtures
npm run verify:stripe-db-matrix
npm run test:vip-floor-v1-v2-compare
```

## 16. Fixture matrix

| ID | Scenario | 期待 |
|---|---|---|
| F01 | 同table 22:00–00:00 / 00:00–02:00 | 両方成功 |
| F02 | 同table 22:00–00:00 / 23:45–01:00 | 409 conflict |
| F03 | walk-in 22:05–23:35 | 丸めず保存 |
| F04 | 180分延長、後続予約なし | 成功 |
| F05 | 180分延長、後続予約あり | 全体rollback |
| F06 | replace | 旧assignment release、新assignment active |
| F07 | add | 既存維持、追加active |
| F08 | remove | 指定tableだけrelease |
| F09 | unassign + reopen=true | assignment 0、block 0 |
| F10 | unassign + reopen=false | assignment 0、online-only block作成 |
| F11 | all-operations blockへ配席 | 409 |
| F12 | online-only blockへ管理配席 | warning付き許可 |
| F13 | staffのschedule変更 | 403 |
| F14 | managerのschedule変更 | 成功 |
| F15 | 同expectedVersionで2更新 | 1件成功、1件409 |
| F16 | service標準遷移 | event/current/audit一致 |
| F17 | service override reasonなし | 拒否 |
| F18 | completed | assignment release、履歴保持 |
| F19 | cancel refund partial | cancellation+refund case 1件 |
| F20 | cancel transaction途中失敗 | 部分更新0 |
| F21 | v7 public hold | 新列投影、旧response不変 |
| F22 | v7 admin check-in | service seated投影、旧response不変 |
| F23 | signed Stripe webhook | 既存処理pass、version/revision更新 |
| F24 | idempotency replay | duplicate 0 |
| F25 | staff board read | PII masked |
| F26 | manager customer read | 復号、access audit |
| F27 | raw secret scan | client/audit/evidenceへsecret 0 |
| F28 | v7 assign `ON CONFLICT` | legacy unique維持、v7成功、assignment event追加 |
| F29 | 同予約・同table release→reactivate | current relation 1件、履歴event欠損0 |
| F30 | walk-in 22:05、exact slotなし | 決定論的anchor、正規時刻22:05を維持 |
| F31 | walk-in対応slotなし | `SLOT_COMPATIBILITY_MISSING`、部分insert 0 |
| F32 | walk-in深夜跨ぎ | 正しいbusiness dayのanchor、正規終了時刻維持 |
| F33 | cancel refund full | server算出remaining amount、case 1件 |
| F34 | cancel refund review | executable case 0、承認待ち記録 |
| F35 | 累積refund超過 | 拒否、case/予約/audit部分更新0 |
| F36 | v8/v7 version/revision | 成功ごとに各1、updated_at-onlyとreplayは0 |
| F37 | block作成と配席の同時競合 | seat lock順により片方だけ成功 |
| F38 | customer key rotation | 旧key read、新key re-encrypt、PII log 0 |
| F39 | board配列順とsnapshot | 同snapshotで全viewの順序/total一致 |
| F40 | legacy writer inventory | writerごとにdomain auditまたはredacted system auditあり |

## 17. ファイル単位の実装順

### Commit / Work package 1 — Schema

- 4本のStage A migration
- schema snapshot / static checker
- v2 schema verification script
- evidence template

### Commit / Work package 2 — RPC v8

- helper migration
- admin RPC migration
- read / availability migration
- RPC fixture script

### Commit / Work package 3 — API v2

- shared contract types
- server read/command/crypto helpers
- `/api/admin/v2/**`
- feature flags / runtime readback
- API static/contract tests

### Commit / Work package 4 — Dual-write

- dual-write migration
- public hold / availability flag routing
- catch-up verifier
- v1/v2 compare
- Stripe/admin/worker non-regression evidence

各commitで既存の無関係なworktree差分をstageしない。

## 18. Gate C — UI開始条件

以下をすべて満たした時だけ、TableCheck型UI実装へ進む。

1. active reservation / assignmentのP0必須列NULLが0
2. v8 fixture F01〜F27 pass
3. v1/v2の共通項目差分が説明可能
4. 公開hold、card setup、signed webhook、confirmationがpass
5. refund worker契約がpass
6. version conflictとidempotency replayがpass
7. v2 flags offのrollback rehearsal pass
8. v1 UIが変更前どおり動作
9. PII / Stripe secret leak 0
10. owner / managerがdual-writeの運用状態を確認

## 19. 完了時のhandoff

実装担当は各Stage完了時に次を残す。

- 適用migration一覧
- 実行commandと結果
- fixture結果
- v1/v2 shadow diff
- feature flag状態
- rollback確認結果
- 未解決事項
- 次のGate判定

UI担当へ渡すもの:

- `VipFloorBoardV2` TypeScript contract
- API endpoint一覧
- service status transition表
- command/error/capability一覧
- floor/chart/list共通fixture
- P0で未対応のP1項目一覧

## 20. 今回未実施

- migrationファイル作成・適用
- RPC v8実装
- API v2実装
- dual-write実装・有効化
- feature flag追加
- production / Supabase / Stripe変更
- UI変更
