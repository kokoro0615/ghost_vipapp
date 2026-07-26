# TableCheck型 VIP Floor Board P0データ契約

- 設計日: 2026-07-14 JST
- 対象: `/admin/vip-floor`
- 前提資料: `tablecheck-vip-floor-reproduction-spec-2026-07-14.md`
- 実装計画: `tablecheck-vip-floor-p0-implementation-plan-2026-07-14.md`
- フェーズ: 方針確定・データ契約設計のみ
- 実装状態: migration / RPC / API / TypeScript / UIは未実装

## 1. 確定した4方針

| 項目 | 確定方針 | 実装への拘束 |
|---|---|---|
| ブランド忠実度 | TableCheckの情報構造、操作順、情報密度を忠実に再現し、色・書体・素材はGHOST Osakaスキンを維持する | TableCheckのロゴ、商標、画像、CSS、固有素材は複製しない。黒紫ラッカー、シャンパンメタル、実フロア形状を使う |
| 画面範囲 | `/admin/vip-floor`内で`floor / chart / list`を切り替える | routeを分散させず、URL queryで業務ビュー・営業日・選択予約を復元可能にする |
| 状態範囲 | 既存の予約・決済ライフサイクルを保ち、GHOST現場進行状態を別軸で追加する | `reservations.status`へ飲食進行状態を混在させない。到着、着席、ボトル、会計、リセットを`service_status`で扱う |
| 自動配席 | P0は手動配席の完全再現まで。最適化・自動配席は対象外 | 競合判定、移動、追加、解除、未配席、ブロックは実装対象。配席候補の自動決定は後続フェーズ |

URL状態の契約は次を基準とする。

```text
/admin/vip-floor?date=2026-07-14&view=floor&reservation=<uuid>
/admin/vip-floor?date=2026-07-14&view=chart
/admin/vip-floor?date=2026-07-14&view=list
```

`view`省略時は`floor`。予約詳細は同route内のinspectorとして開き、Back/Forwardで選択状態を復元できるようにする。

## 2. P0の完了定義

P0データ契約は、UIを作らなくても次を一貫して表現できる状態を指す。

1. 同一テーブルに時間が重ならない複数予約を保持できる
2. 予約時刻を固定slotから独立して15分単位で変更できる
3. 予約を移動、追加配席、解除、未配席化できる
4. テーブル単位の予約ブロックを保持できる
5. 予約ライフサイクルと来店後の現場進行を別々に保持できる
6. 顧客サマリ、共有メモ、支払サマリ、操作履歴を予約に関連付けられる
7. キャンセル理由、返金判断、通知判断を監査可能な形で保持できる
8. 2端末の同時操作をversionで検出できる
9. すべてのmutationが認証、権限、冪等性、監査、日次revision更新を同一transactionで完了する
10. 現行の公開予約、Stripe Checkout / Setup、Webhook、refund workerを破壊しない

## 3. 現行契約と変更理由

| 現行 | 制約 | P0方針 |
|---|---|---|
| `reservations.booking_slot_id`が時刻の実体 | 任意時刻、ドラッグ移動、滞在時間変更を正確に保存できない | 予約自身に`scheduled_start_at / scheduled_end_at`を追加し、slotは販売元・template参照として残す |
| `VipStatusSeat.reservation`が単一 | 1日の複数回転を表現できない | テーブルごとに時刻順の`reservations[]`を返す |
| `reservation_resources`は多対多だがassign RPCが他席をrelease | 追加配席と置換を区別できない | `replace / add / remove / unassign`を明示したcommandにする |
| 競合判定がslot時間依存 | 異なるslotでも時間重複する予約を扱いづらい | 半開区間`[start, end)`で判定する |
| `reservations.status`がhold、決済、確認、来店を兼務 | ボトル提供や会計状態を足すとStripe workerと予約在庫が壊れる | 既存statusを予約ライフサイクルとして維持し、`service_status`を追加する |
| `customers`はhashとStripe参照が中心 | 顧客名、嗜好、アレルギー、来店履歴を表示できない | 暗号化profileと検索用blind indexを分離する |
| メモが`operator_note`またはlocalStorage | 複数メモ、端末共有、編集履歴がない | `reservation_notes`を新設する |
| `audit_logs`はあるがversion・entity relationが弱い | 競合や変更差分を画面用に安定取得できない | 既存表を拡張し、全mutationのtransactional auditを必須化する |
| 予約ブロックなし | 売止めと物理的利用不可を表現できない | block本体と対象テーブルを正規化する |
| 45秒polling | 同時更新の正しさを保証しない | `expectedVersion`と日次`boardRevision`を正しさの基準にする |

## 4. 不変条件

### 4.1 日付と時間

- `business_date`は`Asia/Tokyo`の営業日。午前0時以降の営業も前営業日に所属できる。
- DBの時刻はすべて`timestamptz`、APIはUTCのISO 8601で返す。
- 予約の計画区間は半開区間`[scheduled_start_at, scheduled_end_at)`とする。テーブル競合はassignmentの`[assigned_start_at, assigned_end_at)`を正とする。
- 予約Aの終了と予約Bの開始が同時刻なら競合しない。
- `scheduled_start_at < scheduled_end_at`を必須とする。
- P0の管理操作は15分単位。滞在延長は15〜240分、15分刻みとする。
- 公開予約は引き続き`booking_slots`から作成するが、作成時に予約側へ時刻をsnapshotする。
- ウォークインは入力した時刻・滞在時間を予約側へそのまま保存し、最寄りslotへの丸めを禁止する。

### 4.2 識別子

- DB relationは内部UUIDを使う。
- `public_code`と`public_resource_code`は表示・外部参照用であり、内部FKには使わない。
- API mutationはUUIDを受け、画面表示はpublic codeを使う。

### 4.3 状態分離

- `reservations.status`: 予約成立、hold、決済待ち、確認、キャンセル、review等の商取引ライフサイクル。
- `reservations.service_status`: 到着から退席後リセットまでの現場進行。
- `payments.status`: Stripe決済の事実。
- `reservation_resources.lock_status`: 席在庫・配席relationの有効状態。
- どれか1つの状態を、別の状態の推測だけで上書きしない。

### 4.4 mutation

- 管理mutationはservice-role-only RPCを通す。
- `Idempotency-Key`、`expectedVersion`、actor、request ID、reasonをcommand envelopeに含める。
- row lock、競合検査、更新、audit、board revision増分を同一transactionで行う。
- version不一致は上書きせず`409 VERSION_CONFLICT`を返す。
- 同じ冪等keyで異なるbodyを送った場合は`409 IDEMPOTENCY_MISMATCH`を返す。

### 4.5 Stripe境界

- VIP Floorの状態変更からStripe APIを直接呼ばない。
- キャンセル時の返金は既存`refund_cases`へ要求を積み、既存workerが実行する。
- Webhook署名検証、provider object、payment evidence、test/live分離を維持する。
- API responseへsecret key、Webhook secret、raw webhook payload、完全なカード情報を出さない。

## 5. 目標エンティティ関係

```text
event_days
  ├─ booking_slots ── reservations ── customers / customer_profiles
  │                        ├─ reservation_resources ── seat_resources ── floor_sections
  │                        ├─ reservation_service_events
  │                        ├─ reservation_notes
  │                        ├─ reservation_cancellations ── refund_cases
  │                        ├─ payments / payment evidence（既存）
  │                        └─ audit_logs
  ├─ reservation_blocks ── reservation_block_targets ── seat_resources
  └─ vip_floor_day_revisions
```

P0では既存テーブルを可能な限り拡張する。公開予約・決済sagaを一度に置換する新テーブルは作らない。

## 6. 予約時間とversion

### 6.1 `reservations`追加契約

以下は実装時のadditive migration候補であり、この文書自体はSQL実行を意味しない。

| 列 | 型 | 制約・意味 |
|---|---|---|
| `event_day_id` | `uuid` | `event_days.id`。backfill後NOT NULL。深夜営業を含む営業日の基準 |
| `scheduled_start_at` | `timestamptz` | 予約の正規開始時刻。backfillはslot.start_at |
| `scheduled_end_at` | `timestamptz` | 予約の正規終了時刻。backfillはslot.end_at |
| `expected_release_at` | `timestamptz` | 現在見込むテーブル解放時刻。初期値はscheduled_end、着席遅延・延長時に更新 |
| `service_status` | `vip_service_status` | 現場進行。成立前や終了済み予約ではNULL可 |
| `service_status_changed_at` | `timestamptz` | 現在のservice statusへ変わった時刻 |
| `arrived_at` | `timestamptz` | 最初の到着記録。取消し再操作でも消さない |
| `service_completed_at` | `timestamptz` | 清掃完了・再販可能になった時刻 |
| `version` | `bigint` | 1開始、mutationごとに+1 |

既存列の扱い:

- `booking_slot_id`はP0中はNOT NULLのまま保つ。販売元・料金規約・互換API参照に使用する。
- v2 walk-inの`booking_slot_id`は、同じevent day・offeringのslotから`abs(slot.start_at - requested_start_at)`が最小のものを選び、同値なら早いslotを選ぶ決定論的compatibility anchorとする。該当slotがなければ`SLOT_COMPATIBILITY_MISSING`で拒否する。anchorは販売元・料金規約・v1参照専用で、入力時刻をslot時刻へ変換してはならない。v2 availability / conflictは必ず予約・assignment時刻を使う。
- `checked_in_at`は互換列として残し、`service_status = seated`へ初めて遷移した時刻と同期する。
- `seat_due_at / seat_extended_until_at`は互換列として残し、`expected_release_at`と同期する。
- `status` enumの既存値は削除・renameしない。

### 6.2 予約時間の正規値

```text
reservation plan start = reservations.scheduled_start_at
reservation plan end   = reservations.scheduled_end_at
table occupancy start  = reservation_resources.assigned_start_at
table occupancy end    = reservation_resources.assigned_end_at
expected release       = reservations.expected_release_at
fallback during migration only = booking_slots.start_at / end_at
```

新APIではfallback後の値ではなく、backfill済みの予約時刻を必ず返す。

- assignment作成時は予約の計画区間をcopyし、`assigned_end_at`は`expected_release_at`を使う。
- schedule変更は予約計画とactive assignmentを同じtransactionで更新する。
- check-in時は現行の120分保証を維持し、`expected_release_at = max(scheduled_end_at, checked_in_at + 120分)`としてactive assignmentのendも更新する。後続予約と競合する場合は自動延長せず、解決可能なconflict responseを返す。
- 明示的な着席延長は`expected_release_at`とassignment endを更新する。予約時刻そのものを変える場合はschedule変更commandを使う。

## 7. GHOST現場進行ステータス

### 7.1 enum

```text
expected
late
no_contact
arrived
partial_arrival
seated
bottle_pending
bottle_served
bill_requested
paid
resetting
completed
no_show
```

TableCheckのファースト／メイン／デザートはGHOSTでは使わず、ボトル提供と会計へ置換する。

### 7.2 標準遷移

```text
expected ──> late ───────────────┐
    │          │                 │
    ├──────> no_contact          │
    │          │                 │
    ├──────> arrived <───────────┘
    │          ├─> partial_arrival ─> seated
    │          └────────────────────> seated
    └──────> no_show

seated -> bottle_pending -> bottle_served -> bill_requested
   └────────────────────────────────────────> bill_requested
bill_requested -> paid -> resetting -> completed
```

規則:

- `reservations.status`はP0中はv7互換の複合状態列として残す。v2の`lifecycleStatus`は正規化projectionであり、legacy `checked_in`は`lifecycleStatus=confirmed`、`serviceStatus=seated`として返す。
- walk-inはv7互換上`status=checked_in`、`service_status=seated`で開始できるが、v2 APIの予約成立軸と現場進行軸は混合しない。
- `confirmed`予約は原則`service_status=expected`。
- `checked_in`既存データは`service_status=seated`へbackfillする。
- cancelled / expired / failedはservice statusを自動進行させない。
- `completed`への遷移はactive assignmentをreleaseし、`service_completed_at`を記録する。assignment rowは履歴として残す。
- `no_show`への遷移はactive assignmentをreleaseし、既存のno-show review/case処理へ明示的に接続する。service statusだけから料金処理を推測しない。
- `service_status=paid`は現場の会計進行だけを意味し、Stripe/paymentの成功、capture、返金可否を推測しない。
- 標準遷移外のoverrideはmanager以上、reason必須、auditへ`override=true`を保存する。
- `no_show`は`expected / late / no_contact`からのみ通常遷移可能。

### 7.3 `reservation_service_events`

| 列 | 型 | 意味 |
|---|---|---|
| `id` | `uuid` | PK |
| `reservation_id` | `uuid` | FK |
| `from_status` | `vip_service_status` | 初回はNULL |
| `to_status` | `vip_service_status` | 新状態 |
| `occurred_at` | `timestamptz` | 操作が現場で発生した時刻 |
| `actor_admin_id` | `uuid` | 実行者 |
| `reason` | `text` | overrideや例外理由 |
| `request_id` | `text` | request追跡 |
| `metadata_json` | `jsonb` | override、端末、補助情報。PIIやsecretは禁止 |
| `created_at` | `timestamptz` | DB記録時刻 |

現在値は`reservations.service_status`、履歴はevent表を正とする。両方を同一RPCで書く。

## 8. テーブル、セクション、フロア形状

### 8.1 `floor_sections`

| 列 | 型 | 意味 |
|---|---|---|
| `id` | `uuid` | PK |
| `code` | `text` | stable code、例:`main_vip` |
| `name` | `text` | 現場表示名 |
| `sort_order` | `int` | tab / chart順 |
| `active` | `boolean` | 有効状態 |
| `created_at / updated_at` | `timestamptz` | 監査時刻 |

### 8.2 `seat_resources`追加契約

| 列 | 型 | 意味 |
|---|---|---|
| `floor_section_id` | `uuid` | section FK |
| `display_code` | `text` | ボード表示コード |
| `sort_order` | `int` | chart/list順 |
| `shape` | `text` | `rect / round / booth / custom` |
| `x_percent / y_percent` | `numeric` | floor canvas位置 |
| `width_percent / height_percent` | `numeric` | floor canvas寸法 |
| `rotation_degrees` | `numeric` | 回転 |
| `online_eligible` | `boolean` | 公開予約在庫に出せるか |
| `operational_locked` | `boolean` | 手動移動禁止。理由は別列 |
| `lock_reason` | `text` | lock理由 |
| `version` | `bigint` | layout/lockの競合検知 |

`vipSeats`の静的geometryはmigration seedの入力として使い、P0完了後はDBのgeometryをread modelの正とする。

## 9. 配席契約

### 9.1 `reservation_resources`の役割

既存`reservation_resources`を、予約と実テーブルの時間付きassignmentとして拡張する。

| 追加列 | 型 | 意味 |
|---|---|---|
| `assigned_start_at` | `timestamptz` | 通常は予約startのsnapshot |
| `assigned_end_at` | `timestamptz` | 通常は予約endのsnapshot |
| `assignment_role` | `text` | `primary / additional` |
| `assigned_by_admin_id` | `uuid` | NULLはsystem/public flow |
| `released_by_admin_id` | `uuid` | 解除者 |
| `release_reason` | `text` | 解除理由 |
| `version` | `bigint` | relation単位の競合検知 |

既存`lock_status`は残す。

```text
active assignment = released_at is null
                    and (
                      lock_status = confirmed
                      or lock_status in (held, payment_grace_locked) and expiry > now()
                    )
```

既存`UNIQUE(reservation_id, seat_resource_id)`はv7の`ON CONFLICT (reservation_id, seat_resource_id)`が依存するため、P0、dual-write、v1 rollback window中は維持する。P0の`reservation_resources`はcurrent relationとしてrelease/reactivateでき、全interval変更はappend-only `reservation_assignment_events`と`audit_logs`へ残す。同一予約・同一tableの複数relation rowを許可するpartial unique化はv7廃止後の別migrationとする。

`reservation_assignment_events`は最低限`reservation_id / reservation_resource_id / seat_resource_id / event_type / interval_before / interval_after / actor / reason / request_id / occurred_at`を持つ。intervalはPIIを含まない構造化値とし、assignment mutationと同一transactionで追加する。

### 9.2 競合条件

同じ`seat_resource_id`で、次をすべて満たす既存assignmentがあれば競合とする。

```text
existing is active
existing.reservation_id != command.reservation_id
existing.assigned_start_at < requested_end_at
existing.assigned_end_at > requested_start_at
```

さらに`scope=all_operations`の予約blockと重なる場合も競合する。`online_only` blockは管理者の手動配席を禁止しないが、warningを返す。

### 9.3 command operation

| operation | 意味 |
|---|---|
| `replace` | 現在のactive assignmentを解除し、指定table群へ置換 |
| `add` | 現在のassignmentを維持し、追加tableを割当 |
| `remove` | 指定tableだけ解除。他のtableは維持 |
| `unassign` | active assignmentをすべて解除し、未配席トレイへ移す |

`replace/add`は`tableIds[]`を受ける。P0 UIは単一table操作から始めても、APIとDBは複数tableを失わない。

### 9.4 未配席とオンライン在庫

未配席は専用statusではなく、次で導出する。

```text
予約がactive
and active reservation_resources count = 0
```

`unassign`は`reopenOnlineInventory`を必須booleanとして受ける。

- `true`: assignmentをreleaseし、公開在庫へ戻す。
- `false`: assignmentをreleaseし、同じ時間・対象tableに`online_only` blockを同一transactionで作る。

これにより「未配席だが販売枠は不用意に開けない」を明示できる。暗黙の既定値は禁止する。

## 10. 予約ブロック

### 10.1 `reservation_blocks`

| 列 | 型 | 意味 |
|---|---|---|
| `id` | `uuid` | PK |
| `event_day_id` | `uuid` | 営業日FK |
| `scope` | `text` | `online_only / all_operations` |
| `kind` | `text` | `manual / maintenance / owner_hold / event / unassignment_guard` |
| `start_at / end_at` | `timestamptz` | 半開区間 |
| `memo` | `text` | 現場理由 |
| `status` | `text` | `active / cancelled` |
| `created_by_admin_id` | `uuid` | 作成者 |
| `cancelled_by_admin_id` | `uuid` | 解除者 |
| `cancelled_at` | `timestamptz` | 解除時刻 |
| `version` | `bigint` | 楽観lock |
| `created_at / updated_at` | `timestamptz` | 監査時刻 |

### 10.2 `reservation_block_targets`

| 列 | 型 | 意味 |
|---|---|---|
| `block_id` | `uuid` | block FK |
| `seat_resource_id` | `uuid` | table対象の場合 |
| `floor_section_id` | `uuid` | section対象の場合 |
| `venue_wide` | `boolean` | venue全体の場合 |

1行につきtable、section、venueのどれか1つだけを指定するcheckを置く。P0のUI対象はtable blockだが、契約はsection/venueへ拡張可能にしておく。繰返しblockはP1へ送る。

- `online_only`と`all_operations`はv8公開availabilityの在庫を減らす。
- `all_operations`は管理配席も拒否する。
- v2 walk-inを有効化する前に、公開availabilityをslot時間ベースのv7から予約・assignment時間ベースのv8へ切り替える。これを行わずに任意時刻だけ保存すると、公開在庫が誤った時間帯で塞がる。

## 11. 顧客契約

### 11.1 原則

- 既存`customers`のStripe customer relationとhash lookupを維持する。
- raw PIIを`audit_logs`、analytics、client logへ書かない。
- clientからSupabaseへ直接customer profileをselectさせない。
- serverが権限に応じて復号し、staffにはmask済み値を返す。

### 11.2 `customer_profiles`

| 列 | 型 | 意味 |
|---|---|---|
| `customer_id` | `uuid` | PK/FK |
| `display_name_ciphertext` | `bytea` | 暗号化氏名 |
| `name_kana_ciphertext` | `bytea` | 暗号化カナ |
| `phone_ciphertext` | `bytea` | 暗号化電話 |
| `email_ciphertext` | `bytea` | 暗号化メール |
| `display_name_search_token` | `text` | server-side HMAC blind index |
| `language_code` | `text` | 例:`ja / en / ko / zh` |
| `allergies_ciphertext` | `bytea` | 暗号化 |
| `preferences_ciphertext` | `bytea` | 席、酒、接客等の暗号化profile |
| `version` | `bigint` | 競合検知 |
| `created_at / updated_at` | `timestamptz` | 監査時刻 |

各ciphertextは、`format_version / key_id / nonce / ciphertext / auth_tag`を含む認証付き暗号envelopeをdocument化したpacked `bytea`として保存する。復号はunknown key、tag不一致、旧format破損でfail closedとし、平文や暗号例外全文をlogへ出さない。鍵はenvironment別にsecret managerで管理し、active keyによる新規write、旧key read、監査付きre-encryptionでrotationする。DBやrepoへ鍵を保存しない。

P0の`display_name_search_token`は正規化した完全一致だけを対象とする。name/kanaの部分一致・prefix検索は、token化による漏洩とcandidate件数をreviewしたP1契約、またはPIIを含まない安全な候補filter後のbounded server-side復号として別途実装する。既存`email_hash / phone_hash`はlookup互換として残す。

### 11.3 `customer_tags`

`customer_id / tag_code / label / category / created_by / created_at`を持つ。P0の初期tagは`vip / regular / allergy / no_show_attention / staff_note`までとする。色はUI tokenから決め、DBへ見た目のtoneを保存しない。

来店回数、キャンセル回数、no-show回数は予約から集計する。初期P0では手更新カウンタを持たず、read modelまたは集計viewで返す。

## 12. 共有メモ

### 12.1 `reservation_notes`

| 列 | 型 | 意味 |
|---|---|---|
| `id` | `uuid` | PK |
| `reservation_id` | `uuid` | FK |
| `kind` | `text` | `floor / booking / private` |
| `body` | `text` | 最大2000文字 |
| `pinned` | `boolean` | 右一覧へ固定表示 |
| `author_admin_id` | `uuid` | 作成者 |
| `updated_by_admin_id` | `uuid` | 最終更新者 |
| `version` | `bigint` | 競合検知 |
| `archived_at` | `timestamptz` | soft delete |
| `created_at / updated_at` | `timestamptz` | 監査時刻 |

現行`operator_note`はbackfill元として残す。localStorage memoは移行後にserver noteへ一度だけimportする導線を設け、暗黙に複数端末へmergeしない。

## 13. キャンセル契約

### 13.1 `reservation_cancellations`

| 列 | 型 | 意味 |
|---|---|---|
| `id` | `uuid` | PK |
| `reservation_id` | `uuid` | P0ではunique |
| `reason_code` | `text` | `customer_request / duplicate / venue_decision / no_contact / other` |
| `reason_note` | `text` | `other`では必須 |
| `refund_decision` | `text` | `none / full / partial / review` |
| `refund_amount_yen` | `int` | noneは0、partialは明示額、fullはserver算出額、reviewはNULL可 |
| `refund_case_id` | `uuid` | 既存`refund_cases` FK |
| `notify_customer` | `boolean` | LINE通知判断 |
| `cancelled_by_admin_id` | `uuid` | actor |
| `cancelled_at` | `timestamptz` | 実行時刻 |
| `request_id` | `text` | request追跡 |

キャンセルmutationは、確認画面で取得した`expectedVersion`と上記判断を必須で送る。

- `none`: amount=0、refund caseを作らない。
- `partial`: clientが`0 < amount <= server算出remaining refundable amount`を送る。対象`payment_id`がなければ拒否する。
- `full`: clientはamountを送らず、serverがremaining refundable amountを計算して保存する。0以下なら実行caseを作らない。
- `review`: executable refund caseを作らず、承認後に別idempotent commandでpartial/fullへ確定する。

同一paymentの成功済み/処理中caseと累積refundをlockしてremaining amountを再計算し、currency、Stripe environment、account bindingを検査する。実行可能なcaseはidempotency key単位で1件だけ作る。どの判断でもStripe APIを同期呼出ししない。

## 14. 監査と日次revision

### 14.1 `audit_logs`拡張

既存表を維持し、次を追加する。

| 列 | 型 | 意味 |
|---|---|---|
| `event_day_id` | `uuid` | 営業日filter |
| `reservation_id` | `uuid` | 予約詳細filter |
| `entity_type` | `text` | `reservation / assignment / block / note / customer` |
| `entity_id` | `uuid` | 対象ID |
| `operation` | `text` | stable machine code |
| `expected_version` | `bigint` | command値 |
| `version_before / version_after` | `bigint` | 競合証跡 |
| `changed_fields` | `text[]` | 差分key |
| `metadata_json` | `jsonb` | conflict warning等。PII/secret禁止 |

既存`target_table / target_id / before_json / after_json / reason / request_id`は互換のため残す。

### 14.2 `vip_floor_day_revisions`

| 列 | 型 | 意味 |
|---|---|---|
| `event_day_id` | `uuid` | PK/FK |
| `revision` | `bigint` | 0開始、対象日を変えるmutationごとに+1 |
| `last_audit_log_id` | `uuid` | 最後のaudit |
| `updated_at` | `timestamptz` | 更新時刻 |

read APIは`boardRevision`を返す。clientはrefresh後にrevisionを比較できるが、revision自体は認可やrow versionの代わりにしない。

## 15. Read API v2

現行`GET /api/admin/vip-status`を破壊的変更しない。新契約は次に分離する。

```text
GET /api/admin/v2/vip-floor?businessDate=YYYY-MM-DD
```

### 15.1 response envelope

```ts
type VipFloorBoardV2 = {
  schemaVersion: "vip-floor.v2";
  generatedAt: string;
  boardRevision: number;
  businessDay: {
    id: string;
    businessDate: string;
    venueTimezone: "Asia/Tokyo";
    operatingStartAt: string;
    operatingEndAt: string;
  };
  capabilities: {
    readCustomerPii: boolean;
    changeServiceStatus: boolean;
    changeAssignments: boolean;
    changeSchedule: boolean;
    manageBlocks: boolean;
    cancelReservation: boolean;
  };
  sections: FloorSectionV2[];
  tables: VipTableV2[];
  reservations: VipFloorReservationV2[];
  unassignedReservationIds: string[];
  blocks: ReservationBlockV2[];
  totals: VipFloorTotalsV2;
  operations: {
    adminMutationEnabled: boolean;
    webhookProcessingEnabled: boolean;
    publicBookingEnabled: boolean;
  };
};
```

### 15.2 reservation read model

```ts
type VipFloorReservationV2 = {
  id: string;
  version: number;
  publicCode: string;
  businessDate: string;
  lifecycleStatus: string;
  serviceStatus: VipServiceStatus | null;
  sourceChannel: "online" | "admin_hold" | "walk_in";
  scheduledStartAt: string;
  scheduledEndAt: string;
  expectedReleaseAt: string;
  actualSeatedAt: string | null;
  completedAt: string | null;
  guestCount: { total: number; adults: number | null; children: number | null };
  assignmentIds: string[];
  tableIds: string[];
  customer: CustomerSummaryV2 | null;
  payment: PaymentEvidenceSummaryV2 | null;
  notes: ReservationNoteSummaryV2[];
  flags: string[];
  updatedAt: string;
};
```

`lifecycleStatus`はlegacy `reservations.status`の生値ではなく、P0の正規化projectionを返す。`checked_in`をservice statusと二重表示せず、payment stateは`payment`だけから返す。

### 15.3 table read model

```ts
type VipTableV2 = {
  id: string;
  version: number;
  publicResourceCode: string | null;
  displayCode: string;
  name: string;
  sectionId: string;
  capacityMin: number;
  capacityMax: number;
  geometry: {
    shape: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    rotationDegrees: number;
  };
  operationalLocked: boolean;
  reservationIds: string[]; // scheduledStartAt昇順、複数回転
  blockIds: string[];
};
```

payment summaryは現行の保存カード有無、payment status、Webhook processing statusを維持する。provider object IDは必要なmanager viewだけに限定し、通常floor payloadからは外す。

## 16. Mutation API / RPC契約

### 16.1 共通command envelope

```ts
type AdminCommand = {
  expectedVersion: number;
  reason: string | null;
};
```

HTTP header:

```text
Idempotency-Key: <uuid-or-opaque-unique-key>
```

成功responseは最低限次を返す。

```ts
type CommandResult = {
  ok: true;
  action: string;
  reused: boolean;
  entityVersion: number;
  boardRevision: number;
  auditLogId: string;
};
```

### 16.2 schedule変更

```text
PATCH /api/admin/v2/reservations/:id/schedule
```

```json
{
  "expectedVersion": 7,
  "scheduledStartAt": "2026-07-14T13:00:00.000Z",
  "scheduledEndAt": "2026-07-14T15:00:00.000Z",
  "reason": "guest_arrival_changed"
}
```

全active assignmentとblockの競合を検査し、予約とassignmentの時間を同一transactionで更新する。

### 16.3 配席変更

```text
POST /api/admin/v2/reservations/:id/assignments
```

```json
{
  "expectedVersion": 7,
  "operation": "replace",
  "tableIds": ["<uuid>"],
  "reopenOnlineInventory": false,
  "reason": "vip_table_move"
}
```

- `reopenOnlineInventory`は`unassign`時必須。他operationでは送信しない。
- table lock、capacity warning、時間競合、block競合を検査する。
- capacity不足はP0ではwarning付きmanager override可。reasonを必須にする。

### 16.4 service status変更

```text
POST /api/admin/v2/reservations/:id/service-status
```

`expectedVersion / toStatus / occurredAt / reason`を受ける。標準遷移外はmanager overrideでのみ許可する。

### 16.5 walk-in

```text
POST /api/admin/v2/walk-ins
```

`eventDayId / scheduledStartAt / scheduledEndAt / guestCount / tableIds / guestLabel / operatorNote / expectedTableVersions[]`を受ける。正規時刻は入力値であり、`publicSlotId`へ丸めない。

### 16.6 着席延長

```text
POST /api/admin/v2/reservations/:id/extend-seat
```

- `extendMinutes`は15〜240、15分刻み。
- `expected_release_at`、active assignmentの`assigned_end_at`、互換用`seat_due_at / seat_extended_until_at`を同一transactionで更新する。`scheduled_end_at`はschedule変更commandを使わない限り変えない。
- 延長後の競合を検査し、競合時は更新しない。
- 180分を正規に許可する。

### 16.7 block

```text
POST   /api/admin/v2/vip-blocks
PATCH  /api/admin/v2/vip-blocks/:id
DELETE /api/admin/v2/vip-blocks/:id
```

DELETEは物理削除せず`status=cancelled`にする。

### 16.8 キャンセル

既存routeを拡張する。

```text
POST /api/admin/v2/reservations/:id/cancel
```

`expectedVersion / reasonCode / reasonNote / refundDecision / refundAmountYen / notifyCustomer`を必須契約にする。`reason`だけ、または暗黙の`refundAmountYen=0`で即実行する旧UIを廃止する。

## 17. エラー契約

| HTTP | code | 意味 |
|---:|---|---|
| 400 | `INVALID_COMMAND` | field、時刻、duration、遷移が不正 |
| 401 | `UNAUTHENTICATED` | PIN/sessionなし |
| 403 | `FORBIDDEN` | role/capability不足 |
| 403 | `ADMIN_MUTATION_DISABLED` | feature flag停止 |
| 404 | `NOT_FOUND` | entityなし |
| 409 | `VERSION_CONFLICT` | expectedVersion不一致 |
| 409 | `TABLE_TIME_CONFLICT` | table時間重複 |
| 409 | `BLOCK_CONFLICT` | all-operations blockと重複 |
| 409 | `TABLE_LOCKED` | operational lock |
| 409 | `INVALID_STATE_TRANSITION` | lifecycle/service遷移不可 |
| 409 | `IDEMPOTENCY_MISMATCH` | 同じkeyで異なるrequest |
| 422 | `CAPACITY_WARNING_REQUIRES_OVERRIDE` | capacity不足、manager override待ち |

error responseには`currentVersion`、競合相手のpublic code、時間、table display codeを必要最小限で返す。顧客PIIやStripe raw objectを含めない。

## 18. 権限契約

| 操作 | staff | manager | owner / engineer |
|---|:---:|:---:|:---:|
| floor read | ○ | ○ | ○ |
| masked customer summary | ○ | ○ | ○ |
| full customer contact | × | ○ | ○ |
| service status | ○ | ○ | ○ |
| floor/booking note | ○ | ○ | ○ |
| walk-in | ○ | ○ | ○ |
| 15〜120分延長 | ○ | ○ | ○ |
| 135〜240分延長 | × | ○ | ○ |
| schedule変更 | × | ○ | ○ |
| 配席replace/add/remove/unassign | × | ○ | ○ |
| block管理 | × | ○ | ○ |
| キャンセル・返金判断 | × | ○ | ○ |
| customer profile編集 | × | ○ | ○ |

`capabilities`はrole名からclientが推測せず、server responseを正とする。

## 19. Migrationと切替順序

### Phase 0: 契約固定

- 本文の4方針、enum、時刻、不変条件、P0/P1境界を固定
- migration名、RPC v8、API v2の実装計画を作る

### Phase 1: additive schema

1. enum、新列、新テーブルを追加
2. `event_day_id / scheduled_start_at / scheduled_end_at / expected_release_at`をslotと既存seat due列からbackfill
3. checked-inを`service_status=seated`、confirmedを`expected`へbackfill
4. `reservation_resources`の時間を予約からbackfill
5. versionを1でbackfill
6. `NOT VALID` constraint追加後、検証してvalidate
7. 既存enum値、列、RPCは削除しない

### Phase 2: RPC v8 / read API v2

- version、時間競合、block、audit、revisionを実装
- `/api/admin/v2/vip-floor` v2 read modelを追加。`/api/admin/vip-floor`はv2 pathとして使用しない
- 既存`/api/admin/vip-status`はv1 adapterとして維持
- 現行UIはv1を使い続けられる状態にする

### Phase 3: mutation dual-write

- 公開予約作成時に予約時刻とassignment時刻をsnapshot
- 公開availabilityを予約・assignment時間とblockを見るv8へ切替後に、任意時刻walk-inを有効化
- 既存check-in / walk-in / extension / cancelをv8へ段階移行
- Stripe Checkout、Webhook、refund workerは既存contractのまま回帰検証

### Phase 4: UI切替

- この段階で初めてfloor / chart / list UIをv2へ接続
- feature flagでv1へ戻せるようにする

### Phase 5: cleanup

- 監視期間後にv1専用のscalar seat reservation contractを廃止
- `booking_slot_id` nullable化などの破壊変更は、公開予約sagaの移行が必要になった時だけ別migrationで行う

## 20. P0検証マトリクス

### Schema / backfill

- 全既存予約にevent day、start、end、versionが入る
- confirmed / checked-in backfillが決済statusを変更しない
- active assignmentにstart/endが入る
- test/live payment evidence件数が変わらない

### 時間・複数回転

- 同じtableの22:00–00:00と00:00–02:00は共存できる
- 22:00–00:00と23:45–01:00は競合する
- 別tableの同時刻予約は共存できる
- walk-in 22:05–23:35が丸められず保存される
- 180分延長が成功し、後続予約との重複時は全体rollbackする

### 配席

- replaceは旧assignmentをreleaseする
- addは既存assignmentを維持する
- removeは指定tableだけ解除する
- unassignは未配席へ入り、`reopenOnlineInventory`がないrequestを拒否する
- table lockとall-operations blockが配席を拒否する

### 状態

- lifecycle statusを変えずにservice statusを進行できる
- 不正遷移をstaffが行うと拒否する
- manager overrideはreasonとauditを残す
- walk-inはchecked-in/seatedとして作成される

### 監査・競合

- 同じexpectedVersionで2端末が更新すると片方だけ成功する
- 成功mutationごとにaudit 1件以上とboard revision +1が残る
- idempotency replayは重複rowを作らない
- auditにraw customer PII、Stripe secret、raw webhook payloadが入らない

### キャンセル・返金

- 理由、返金判断、通知判断なしのcancelを拒否する
- refund要求はrefund caseを1件だけ作る
- cancel transaction失敗時にreservation/assignment/auditが部分更新されない

## 21. P0と後続の境界

### P0に含む

- 正規予約時刻、複数回転
- 手動配席のreplace/add/remove/unassign
- 未配席
- table block
- GHOST service status
- 最小顧客dossier、共有メモ
- reservation audit
- cancel reason/refund decision
- version conflictとboard revision
- v2 read/mutation contract

### P1以降

- 自動・最適配席
- 順番待ち、SMS通知、呼出回数
- スタッフテーブル割当
- service period別オンライン受付
- 繰返しblock
- table接続候補の自動提案
- CSV/Excel出力
- POS連携
- 顧客セグメント配信
- Realtime購読。P0の正しさはRealtimeに依存させない

## 22. 実装開始条件

次のすべてを満たすまでUI実装へ進まない。

1. 本文の4方針を変更する新しいユーザー指示がない
2. DB migration設計がadditiveで、既存公開予約・Stripe・workerへの影響が列挙されている
3. RPC v8のpermission、idempotency、version、audit contractが実装計画に含まれる
4. v1互換期間とrollback手順がある
5. P0 fixture matrixがmigration前後で実行可能になっている

## 23. 今回未実施

- Supabase migration作成・適用
- enum / table / column変更
- RPC v8実装
- API v2実装
- TypeScript型変更
- UI / CSS変更
- lint / build（コード変更なし）
- 新契約のmigration適用・DB fixture検証（未実装のため）。現行基盤のstatic schema / saga / VIP contract検証はpass済み
- 本番・Stripe・Supabaseへの外部変更
