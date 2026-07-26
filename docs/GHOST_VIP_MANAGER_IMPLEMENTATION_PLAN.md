# GHOST VIP Manager 正本実装計画

> 文書ID: GHOST-VIP-MANAGER-PLAN  
> 版: 1.1（production監査反映・緊急実行版）  
> 基準日: 2026-07-26 JST  
> 対応仕様: `GHOST_VIP_MANAGER_SPEC.md` v1.0  
> 現況証拠: `GHOST_VIP_MANAGER_IMPLEMENTATION_AUDIT_2026-07-26.md`

## 1. 計画統制

本書をGHOST VIP Managerの唯一の現行実装計画とする。
旧TableCheck関連計画、実行prompt、復旧prompt、Gate文書は履歴資料であり、実行指示として使用しない。

実装は既存の未コミット変更を保持し、差分を監査してから行う。公開予約は`ghost/website`、
現場UIは`ghost_vipapp`が所有する。TableCheck API、Stripe管理機能、外部顧客データは接続しない。

Ownerの2026-07-26指示に基づき、本v1.0 scope内の実装・検証は作業ごとの再承認を待たず継続する。
Gate不合格時はproductionを変更せず、既存read-only fallbackを維持したまま別laneを進める。
実顧客mutation、credential取扱い、schema切替は本書の隔離fixture・kill switch・rollback Gateを必ず通す。
「承認待ち」を停止理由にせず、証拠不足はfixture、staging、feature flag、read-only検証へ切り替える。

## 2. 現状

### 2.1 監査結論

2026-07-26のproduction・source・validation監査では、正本Release GateのうちG0だけがPASS。
現行は顧客提供可能な完成版ではなく、Basic保護された旧board read UIと6 command中継入口である。

### 2.2 検証済みの土台

- 独立Next.js管理アプリ、Vercel production、Basic認証fail-closed。
- PIN session中継とHttpOnly / Secure / SameSite Strict cookie。
- Floor / Timeline / List、検索、予約Inspector、例外表示、13状態表示metadata。
- GHOST本体`/api/admin/vip-status`の中継とlegacy board変換。
- 6 commandのVIP App側入口、idempotency key、`expectedUpdatedAt`、payload validation。
- mutation kill switch由来のread-only、browser offline、board revision表示の基礎。
- 44px操作、focus、skip link、dialog focus trap、reduced motionの基礎。
- `lint`、`typecheck`、`build`、`npm audit --omit=dev`、production 401 smoke。

### 2.3 Release blocker

| 優先 | 領域 | 現状 | 必要な到達点 |
|---|---|---|---|
| P0 | backend lineage | 中継先`vipapp-command`が共有`website` sourceに存在しない | 実在route、deployment SHA、versioned contract、staging E2E |
| P0 | deployment lineage | VIP Appは`gitDirty=1`、GHOST本体metadata SHAはlocal/remoteに存在しない | 両deploy内容を追跡可能なcommitへ復元 |
| P0 | migration history | remote-only 1本、local-only 12本でdry-run停止 | missing migration復元、履歴照合、破壊的repairなしでdry-run PASS |
| P0 | test safety | 自動test/CIなし。現`prod-e2e`はcookie/fixture/cleanup不備 | test DB、専用fixture、CI、production read-only smoke |
| P0 | 権限 | Owner以外にも一部mutation許可 | 初期Owner-only、PII mask、403 contract |
| P0 | 営業日/卓 | 21時開始、2 section、任意席 | 22時境界、8卓正本、sectionなし |
| P0 | command | 単一卓、30分固定、理由入力 | 複数卓、15〜120分、server固定理由 |
| P1 | 公開予約 | hold/status未除外のlegacy read | confirmed-only、2秒、顧客確認、outbox |
| P1 | UI shell | GHOST独自3 view/左rail | 4ナビ、Chart、TableCheck型階層 |
| P1 | 新規予約 | 未実装 | 8段階作成、編集、通知選択 |
| P1 | 現場機能 | Walk-in/Waitlist/block/担当卓未実装 | 正本全flow |
| P1 | 顧客 | マスク済み表示名のみ | 自動集約、VIP属性、履歴、Owner PII |
| P1 | realtime | browser offlineと再取得のみ | push、revision gap、stale cache、reconnect |
| P1 | observability | 永続metric/alertなし | request ID log、SLO、error/outbox/realtime alert |

### 2.4 正本との差分

| 領域 | 現状 | 必要な到達点 |
|---|---|---|
| UI | GHOST独自Floor/Timeline/List | 現行TableCheck Managerの階層・操作順へ統合 |
| 営業日 | 21:00開始、暦日初期値 | 22:00〜翌05:00、00:00〜04:59は前営業日 |
| 卓 | 2 section、API側の単一卓中心 | 8卓正本、sectionなし、複数卓、最大3回転 |
| 延長 | 固定30分 | 15分刻み、60分preset、最大120分 |
| 新規予約 | Manager側未完 | 8段階作成、編集、通知選択 |
| Walk-in | capabilityのみ | 短縮作成フローと到着記録 |
| Waitlist | 未実装 | 登録/呼出/再通知/期限切れ/着席 |
| ブロック | contractのみ | 作成/編集/解除、受付停止 |
| 担当卓 | 未実装 | スタッフ・卓の割当/解除 |
| 顧客 | summary中心 | 自動集約、VIP属性、履歴、Owner PII |
| realtime | polling/再取得中心 | board revision付きpush同期 |
| 通知 | 未統合 | 管理変更Eメールoutbox |
| 監査 | 部分 | 最小監査を全mutationへ統一 |
| 権限 | 5 roleにcommand権限 | 初期Ownerだけがmutation/PII |
| E2E | unsafeなproduction script 1本 | 隔離fixture、cleanup、公開予約→Manager、競合、障害、全主要操作 |

## 3. 実装原則

- API・DB contractを先に確定し、UIから直接DBへ書かない。
- すべてのmutationは認証、権限、kill switch、version、idempotency、監査を通る。
- TableCheck外観のコピーではなく、操作モデルをGHOST design tokensで再構築する。
- 公開予約holdと確定予約を混同しない。
- 本番データをfixtureやvisual testへ保存しない。
- PIIをログ、screenshot、analytics、error payloadへ出さない。
- 既存productionを壊さない小さなvertical sliceで進め、最後に一括切替する。
- test基盤を最後に追加しない。各contract/UI/APIの着手前に失敗testを置く。
- production E2Eはread-onlyに限定し、mutation E2Eは通知無効の隔離fixtureだけを使う。
- 仕様完了、実装完了、本番実証を別判定にし、証拠なしで`done`へしない。

## 4. Phase 0 — 正本化と安全な基準

### 作業

- 本仕様書と本計画書を`ghost_vipapp/docs/`へ固定する。
- 旧35文書をarchiveへ移す。
- TableCheck安全画像のうち実顧客・スタッフ名を含まないものだけをローカル研究証拠として保持する。
- 1194×834のList/Floor/新規予約/状態メニューをvisual baselineへ変換する際は、
  TableCheck名称・素材を含めずGHOST再構築用寸法だけを採取する。
- 現行`ghost_vipapp`のdirty diffを別作業として保護し、正本化変更と混ぜない。

### 完了条件

- 現行仕様1本、現行計画1本、archive index 1本だけが現行入口から参照される。
- READMEから正本2本へリンクする。
- Owner決定D-01〜D-08が仕様書へ記録され、版が1.0になっている。
- production監査文書が現行実装・未完了・Release Gateを追跡している。

## 4.1 Phase 0.5 — backend source lineage確定

### 作業

- `ghost_vipapp`が呼ぶ全read/mutation pathと`ghost/website`の実在routeを一覧化する。
- 未追跡の`/api/admin/reservations/:id/vipapp-command`を廃止してversioned v2 APIへ寄せるか、
  対応sourceとmigrationを共有正本へ復元する。二重routeは残さない。
- board、command、error、capability、version、audit、idempotencyのJSON schemaを固定する。
- production deployment ID、Git commit SHA、DB migration version、API schema versionをrelease manifestへ記録する。
- VIP Appのdirty deploy内容とGHOST本体の未取得commitを、共有remoteの追跡可能なcommitへ復元する。
- remote-only migration `20260604090000`の内容を監査し、local migration historyへ非破壊で復元する。
- 2026-07-14のlocal-only 12 migrationを適用前にstagingで順序・互換性・rollback read pathまで検証する。
- Basic→Owner PIN→board read→隔離予約1 mutation→audit→logoutのstaging contract E2Eを作る。
- legacy read pathと新v2 read pathをshadow compareし、差分をPIIなしで記録する。

### 完了条件

- VIP Appの全network requestが共有sourceの実ファイルとimmutable deploymentへ追跡できる。
- 未追跡routeが0件。
- `supabase db push --linked --dry-run`がmigration history差分なしで完了する。
- stagingでread/mutation/audit/logoutが同一contract versionでPASS。
- productionはread-only smokeだけを実行できる。

## 4.2 Phase 0.6 — 継続的検証基盤

### 作業

- `ghost/website`と`ghost_vipapp`にunit/contract/integration/E2E scriptを追加する。
- 固定clock、Asia/Tokyo、22:00境界、PIIなしfixture、notification sandboxを用意する。
- Playwrightを3解像度と320px補助幅で実行し、visual、axe、keyboardをCIへ入れる。
- migration up、旧read互換、fixture cleanup、idempotency再送をCIで検証する。
- production用scriptをread-only smokeへ縮小する。
- mutation E2Eをstaging専用scriptへ分離し、`E2E削除可`識別、cookie jar、各更新後version再取得、
  cleanup、audit確認を必須にする。

### 完了条件

- pull requestごとにlint/typecheck/build/unit/contract/integration/Playwright/visual/a11yが再現可能。
- 本番顧客予約を選択するtest pathが存在しない。
- 失敗時artifactにPII、PIN、cookie、Authorization headerが含まれない。

## 5. Phase 1 — ドメイン・DB contract

Phase 2のactor/session/audit最小schemaを先に固定し、そのactor IDを参照して本Phaseのmigrationを作る。
認証UIの完成を待つ必要はないが、Owner actorと監査主体が未確定のまま業務tableを作らない。

### 作業

- `business_day`を22:00〜翌05:00で計算する共通関数をAPIとUIで共有する。
- 00:00〜04:59を前営業日へ戻す固定clock testを追加する。
- 卓マスタ1〜8、表示名、定員、geometryをJSON/SQLの機械可読正本へ固定し、卓1の最大人数を7へ統一する。
- 現行NORTH/SOUTH sectionを互換read期間後に撤去する。
- 予約と卓を多対多へ正規化し、primary/secondary assignmentを保存する。
- 予約時間区間、ブロック区間、卓ロックを同一競合判定へ統合する。
- 最大3回転を想定したinterval overlap testを作る。
- 13状態の許可遷移表、late評価、Owner-only no-showを機械可読contractへ固定する。
- 状態、到着/着席/退店時刻、経路、担当スタッフ、顧客ID、単調増加versionを予約contractへ追加・統一する。
- Waitlist、block、staff-table assignment、notification outbox、audit log、idempotency recordを追加する。
- 顧客正規化電話/Eメール索引と手動再紐付けを追加する。

### migration

- 追加migrationはforward-only。
- 既存予約の単一卓をprimary assignmentへbackfillする。
- `updated_at`由来の暫定versionをDBの単調増加versionへ移行する。
- rollbackはschema削除ではなく旧read pathへ戻せる互換期間を設ける。

### 完了条件

- DB contract testが営業日境界、複数卓、回転、競合、capacity override、version conflictを通る。
- 13状態の全許可/拒否遷移、late表示、各実績時刻が固定clock testを通る。
- 旧公開予約と旧Manager読込が互換期間中も動く。

## 6. Phase 2 — 認証・権限・mutation共通基盤

### 作業

- Basic認証を継続し、利用者別PIN sessionへ統一する。
- 初期OwnerとOwner専用PINを各1件作り、PIN hash、rate limit、失敗ロック、session expiryを実装する。
- 初期capabilityはOwnerだけにmutation/PIIを許可し、staff/manager/engineer/accountantはschema保持だけにする。
- Owner actor、session、audit actor/request IDの最小schemaをPhase 1より先に固定する。
- commandごとの個別allowlistをcapability policyへ統合する。
- 全mutation共通middlewareで次を検証する:
  - 認証session
  - Owner権限
  - mutation kill switch
  - request ID
  - idempotency key
  - expected version
  - 固定理由`管理画面操作`
- 全mutationで変更前後とaudit IDを保存する。
- PII responseをOwner以外でmaskするcontract testを追加する。

### 完了条件

- 認証欠落、role不一致、kill switch、競合、再送をfail-closedで拒否する。
- 同一idempotency keyの再送が二重更新を起こさない。
- Owner以外の全mutationとPII readが403またはmask responseになる。

## 7. Phase 3 — 公開予約とManagerの一本化

### 作業

- `/book-a-table`の選択、hold、決済確定、予約確定の状態を明確化する。
- holdはManager queryから除外する。
- `confirmed_at`と許可statusをManager readの必須条件にし、期限切れholdをqueryとadapterの両方で除外する。
- 確定transactionで予約、顧客、選択卓、プラン、時刻、人数、経路`GHOST Web`を保存する。
- 確定commit後にboard revisionを発行し、Managerへpushする。
- Manager変更を顧客予約確認APIへ反映する。
- 既存GHOST差出人を使う管理変更Eメールをtransactional outboxへ書き、非同期送信する。
- 送信失敗は最大3回自動再送する。
- retry間隔、attempt count、provider message ID、dead状態、Owner手動再送をoutbox contractへ含める。
- 通知失敗は予約更新をrollbackせず、Ownerへ再送状態を表示する。

### 完了条件

- sandbox決済または通知を発生しない専用確定fixtureで
  `book-a-table → confirmed reservation → List/Floor → customer status`をE2E確認する。
- holdと期限切れholdがManagerへ表示されない。
- 確定から表示までp95 2秒目標を測定する。

## 8. Phase 4 — TableCheck型Manager shell

### 作業

- iPad横の2段top bar、営業日移動、集計、当日メモ、下部4ナビを構築する。
- 現行のGHOST tokensを使い、TableCheck白/紫、ロゴ、固有アイコンは使用しない。
- 店舗切替、言語切替、Insight、決済、exportを非表示にする。
- 1024×768、1194×834、1366×1024で固定header/footerとsafe areaを検証する。
- touch target、focus、keyboard、reduced motionを共通component testへ入れる。
- view、filter、選択日、Inspector tabをURL stateへ同期し、再読込とdeep linkで復元する。
- tablistのArrow keyとroving tabindex、mobileの不要な`autoFocus`抑止を実装する。

### 完了条件

- 3解像度でhorizontal overflowなし。
- visual regressionで基準の情報階層・寸法・操作位置を確認できる。

## 9. Phase 5 — List / Floor / Chart / 詳細

### List

- 営業日集計、当日メモ、予約/オーダー状況/ブロックtab、検索、sort、状態ボタンを実装する。
- 予約行に時刻、人数、卓、顧客、状態、非色覚cueを表示する。
- 未配席、遅刻、Waitlist、競合、通知失敗を優先表示する。

### Floor

- 8卓正本MAPを実フロア形状で表示する。
- 空席、将来予約、到着、着席、複数回転、複数卓、ブロック、未配席を表現する。
- 卓選択から予約作成とブロックを開始する。
- 予約割当はタップ選択を必須経路とし、dragは補助経路にする。
- 表示切替はGHOSTで使う項目だけ残す。

### Chart

- 現行TimelineをTableCheck型の時間軸`Chart`へ整理し、独立画面として残す。
- mobileでは主要情報を縦型代替viewでも操作でき、page全体のhorizontal overflowを発生させない。

### 予約詳細

- 表示/編集モード、顧客、日時、人数、滞在、複数卓、経路、メモ、状態、担当、最小操作履歴を実装する。
- 対象外の決済tabは非表示にし、GHOSTで使用する情報だけを残す。
- PIIはOwner sessionでのみ表示する。
- version conflict時は変更前後を示し、再読込または再適用を選択させる。

### 完了条件

- 空、通常、dense、複数回転、未配席、block、stale、conflictのvisual/E2E fixtureが通る。

## 10. Phase 6 — 新規予約・Walk-in・Waitlist・ブロック

### 新規予約

- 日付→時刻/滞在→人数→卓→顧客→追加情報→担当→確認の8段階。
- 入力を戻っても保持する。
- 最終保存前にcapacity、overlap、block、営業日を再検証する。
- Eメール送信/送信しないを選択する。

### Walk-in

- 現在時刻、経路Walk-in、到着を初期値にした短縮導線。
- 人数、卓、顧客省略可、メモを入力して保存する。

### Waitlist

- 登録、呼出、再通知、期限切れ、卓割当、着席を実装する。
- 呼出から30分を通知期限として表示・判定する。
- 期限表示と通知outboxを連携する。

### ブロック

- Floor選択卓からmodalを開き、日付、開始/終了、オンラインのみ/全て、対象卓、繰り返し、メモを保存する。
- 日付/時間帯/卓/全体の受付停止APIへ統一する。

### 完了条件

- 各フローのcreate/edit/discard/conflict/notification failure E2Eが通る。

## 11. Phase 7 — 6操作とスタッフ担当卓

### 6操作

- check-inは到着状態と到着時刻をatomicに更新する。
- 到着時刻変更は未来時刻と営業日外を拒否する。
- 卓割当は複数卓追加、解除、交換、未配席化をatomicに更新する。
- 延長は15分刻み、60分preset、最大120分で競合再検証する。
- メモは500文字以内の共有メモとして保存する。
- サービス状態は仕様書で確定したGHOST 13状態の遷移表に従う。
- operation registryで表示/権限/ラベルを後から変更できるようにする。
- 操作理由入力欄を削除し、serverで`管理画面操作`を固定記録する。

### スタッフ担当卓

- スタッフmaster、営業日単位assignment、解除を実装する。
- 初期スタッフmasterはOwnerが登録する。
- 予約担当と卓担当を別表示する。
- Floorに担当者cueとfilterを追加する。

### 完了条件

- 6操作と担当卓のhappy path、権限拒否、競合、kill switch、idempotency testが通る。

## 12. Phase 8 — リアルタイム・性能・障害耐性

### 作業

- venue/business day単位のrealtime channelを実装する。
- board revisionの欠番検知でfull refreshする。
- 切断時はstale read-onlyへ遷移し、mutation controlを無効化する。
- reconnect後に差分を再取得し、選択中予約のversionを検証する。
- duplicate、out-of-order、別business day eventをclient reducerで安全に破棄する。
- 最終正常boardをPII暗号化方針に沿う短期cacheへ保存し、再起動後もstale read-onlyで開ける。
- 初期取得を営業日boardへ限定し、顧客詳細・履歴を遅延取得する。
- iPad Safariのメモリ、long task、re-renderを計測する。
- request ID、API error、reconnect、revision gap、outbox dead、SLOを構造化metricへ送りalertを設定する。

### 完了条件

- offline/reconnect、duplicate event、out-of-order event、revision gap E2Eが通る。
- 仮SLOを測定し、未達はrelease blockerまたはOwner承認付き例外とする。

## 13. Phase 9 — 検証と本番切替

### 自動検証

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- unit / contract / integration test
- Playwright E2E
- 3解像度visual regression
- accessibility scan

### 専用テストデータ

- GHOST stagingまたは通知無効の専用fixtureに、`E2E削除可`予約を生成する。
- 本番顧客の電話、Eメール、氏名を使わない。
- 通知outboxをsandboxへ向ける。
- test終了時に予約、顧客、block、Waitlist、auditのcleanupを検証する。
- production E2Eは認証、当日read、日付切替、検索、logoutだけに限定する。
- staging mutation E2Eはcookie jarを保持し、各mutation後にboard/versionを再取得して次へ進む。
- `scripts/prod-e2e.mjs`の任意本番予約選択・一括mutation経路を削除する。

### 切替

- コードは段階実装するが、ユーザー公開はOwner指定どおり一括切替。
- 切替前に現行production deployment URLとDB migration状態を記録する。
- Git commit SHA、API schema version、migration version、feature flag状態をrelease manifestへ固定する。
- kill switchはOFFから開始し、smoke確認後にON。
- 本番smokeは認証、当日読込、日付切替、検索、専用テスト予約だけを使う。

### rollback

- UI/API障害: 直前の`ghost_vipapp` production deploymentへrollback。
- mutation障害: kill switch OFFで即時read-only化。
- realtime障害: polling/read-only fallback。
- schemaはforward compatibleと旧read互換を維持し、破壊的down migrationは行わない。
- migration途中障害、outbox滞留、public booking不整合のrestore rehearsalをstagingで実行する。

## 14. Release gate

| Gate | 合格条件 |
|---|---|
| G0 正本 | v1.0仕様、v1.1計画、監査文書、D-01〜D-08、旧文書archive |
| G0.5 Source lineage | 全read/mutationが共有source・commit・deployment・schemaへ追跡可能 |
| G1 Contract | schema/migration/競合/idempotency test合格 |
| G2 Security | Basic/PIN/role/PII/kill switch test合格 |
| G3 Booking bridge | 公開確定→Manager→顧客確認E2E合格 |
| G4 UI parity | 4主要画面、3解像度、visual/a11y合格 |
| G5 Operations | 6操作、Walk-in、Waitlist、block、担当卓合格 |
| G6 Resilience | realtime/offline/conflict/SLO合格 |
| G7 Production | release manifest、backup/restore、rollback rehearsal、隔離test、production read-only smoke |

G7合格前に本番mutationを全面有効化しない。

## 15. 実装順序の推奨

1. Phase 0
2. Phase 0.5とPhase 0.6
3. Phase 2のOwner actor/session/audit最小基盤
4. Phase 1のdomain/DB contractとPhase 2残り
5. Phase 3
6. Phase 4とPhase 5
7. Phase 6とPhase 7
8. Phase 8
9. Phase 9

UIだけを先行して本番APIへ結合しない。各Phaseはcontract、UI、E2Eを同じvertical sliceで完了させる。

## 16. 緊急実行wave

3実装laneと1統合/QA laneを同時稼働できる場合の目標は12営業日。
単一laneの場合は25〜35営業日相当であり、品質Gateを省略して短縮しない。
日数は着手時点でG0.5のbackend lineageが復元できることを前提とする。

| Wave | 目安 | Backend / Data | Manager UI | QA / Release | Exit |
|---|---:|---|---|---|---|
| W0 | Day 0–1 | route lineage、schema、Owner actor | 現行UI差分固定 | test基盤、safe E2E分離 | G0.5 PASS |
| W1 | Day 2–4 | 22時、8卓、version、audit、Owner-only、複数卓 | contract adapter更新 | migration/contract/security test | G1/G2 PASS |
| W2 | Day 5–6 | confirmed-only、customer sync、outbox | notification/error状態 | booking bridge E2E、2秒計測 | G3 PASS |
| W3 | Day 5–8 | read models、query | shell、List/Floor/Chart/詳細、8段階 | visual/a11y 3解像度 | G4 PASS |
| W4 | Day 7–10 | Waitlist/block/staff/customer/6操作API | 全業務flow | happy/error/conflict E2E | G5 PASS |
| W5 | Day 9–11 | realtime/revision/metrics | stale/reconnect/offline UI | SLO、Safari、fault injection | G6 PASS |
| W6 | Day 12 | manifest、flags、backup | production candidate | restore/rollback/read-only smoke | G7 PASS |

Waveの日付は依存関係を示す。W3はW2完了を待たず、W1のversioned contract確定後に開始する。
W4の各機能はAPI+UI+testを1本ずつ縦切りし、全API完成待ちの大規模mergeを避ける。

## 17. 実行タスク台帳

| ID | 優先 | 所有repo | 作業 | 依存 | 完了証拠 |
|---|---|---|---|---|---|
| T-001 | P0 | 両方 | 全network route/source/deployment lineage確定 | なし | G0.5 manifest |
| T-002 | P0 | `website` | versioned board/command/error schema | T-001 | schema + contract test |
| T-003 | P0 | 両方 | test DB、fixture、CI、PII redaction | T-001 | CI green |
| T-004 | P0 | `ghost_vipapp` | production E2Eをread-onlyへ分離 | T-003 | mutation 0 smoke |
| T-005 | P0 | `website` | Owner actor/PIN/session/audit最小schema | T-002 | security contract |
| T-006 | P0 | `ghost_vipapp` | Owner-only capability、表記、UI disable | T-005 | 他role 403 |
| T-007 | P0 | `website` | 22時business day、8卓master、section撤去互換 | T-002 | boundary/master test |
| T-008 | P0 | `website` | DB version/idempotency/audit共通middleware | T-005 | conflict/replay test |
| T-009 | P0 | `website` | 予約-卓many-to-many、3回転、overlap | T-007,T-008 | interval test |
| T-010 | P0 | `website` | 13状態遷移、late、各実績時刻 | T-008 | transition matrix test |
| T-011 | P0 | 両方 | 6 commandをv2契約へ接続 | T-006,T-008,T-010 | staging 6 command E2E |
| T-012 | P0 | 両方 | 複数卓、延長15〜120、固定理由 | T-009,T-011 | command contract/E2E |
| T-013 | P1 | `website` | confirmed-only read、hold除外 | T-002 | hold exclusion test |
| T-014 | P1 | `website` | customer confirmation read model同期 | T-013 | customer E2E |
| T-015 | P1 | `website` | email outbox、最大3回、dead/再送 | T-005,T-013 | worker/notification test |
| T-016 | P1 | `ghost_vipapp` | TableCheck型shell、4ナビ、URL state | T-002,T-007 | visual/keyboard |
| T-017 | P1 | `ghost_vipapp` | List/Floor/Chart/詳細の正本化 | T-009,T-010,T-016 | state fixture E2E |
| T-018 | P1 | 両方 | 予約作成8段階・編集 | T-009,T-014,T-016 | create/edit E2E |
| T-019 | P1 | 両方 | Walk-in短縮flow | T-018 | atomic arrival E2E |
| T-020 | P1 | 両方 | Waitlist 5状態・30分・Eメール | T-015,T-018 | expiry/seating E2E |
| T-021 | P1 | 両方 | block、繰返し、online stop | T-009,T-013,T-016 | conflict/public E2E |
| T-022 | P1 | 両方 | staff master・担当卓 | T-005,T-007,T-016 | assignment E2E |
| T-023 | P1 | 両方 | 顧客集約・属性・履歴・再紐付け | T-005,T-014 | PII/dedupe test |
| T-024 | P1 | 両方 | realtime channel/revision gap/reconnect | T-011,T-017 | fault E2E |
| T-025 | P1 | `ghost_vipapp` | 3解像度+320、axe、keyboard、Safari | T-016〜T-024 | visual/a11y artifact |
| T-026 | P1 | 両方 | metrics/log/alert/SLO | T-013,T-015,T-024 | dashboard/alert test |
| T-027 | P0 | 両方 | forward compatibility、dual read、rollback | T-007〜T-015 | restore rehearsal |
| T-028 | P0 | 両方 | release manifest、一括切替、read-only smoke | 全task | G7 evidence pack |

## 18. Agent分担

| Role | 推奨model | 責務 | 書込境界 |
|---|---|---|---|
| 統括 | Sol | 正本、依存関係、cross-repo contract、統合review、Gate判定 | docs、統合差分 |
| Data/API lane | Terra | migration、domain、auth、mutation、outbox、realtime | `website` backend/migrations |
| Manager UI lane | Terra | shell、4 view、8段階、現場flow、a11y | `ghost_vipapp/src` |
| QA/Release lane | Terra | CI、fixture、Playwright、visual、SLO、manifest、rollback | tests/scripts/release docs |

Lunaが実行環境で利用可能な場合は単純なinventory、文言監査、artifact整理に限定する。
利用不可の場合はTerraへ置換し、Solは実装量を持たず統合・矛盾解消・最終判定へ集中する。
同一ファイルを複数laneで同時編集せず、API schema変更はSolが先にmergeしてから各laneへ通知する。

## 19. Definition of Done

次を全て満たすまで顧客提供可能とは判定しない。

- G0〜G7が同一release manifestとCI artifactでPASS。
- Owner以外のmutation/PIIが全て拒否またはmaskされる。
- 22:00境界、8卓、3回転、複数卓、13状態、6操作がcontract/E2Eで一致する。
- confirmed公開予約だけが2秒目標でManagerへ出現し、顧客確認とEメールoutboxへ同期する。
- 8段階作成、Walk-in、Waitlist、block/online stop、担当卓、顧客統合がhappy/error/conflictで動く。
- realtime切断、revision gap、duplicate/out-of-order、offline再起動、reconnectを再現できる。
- 1024×768、1194×834、1366×1024と補助320pxでoverflow、44px、focus、keyboard、非色cue、長文が合格。
- staging fixture cleanup後に予約、顧客、block、Waitlist、outbox、auditの孤児が0件。
- production smokeは本番顧客を変更せず、異常時はkill switch OFFまたは直前deploymentへ即時復旧できる。

## 20. 停止しない運用

- 1 taskの外部依存が解けない場合、状態を`blocked`へ放置せず、mock contract、staging fixture、
  read-only shadow、別taskへ切り替え、critical path以外を進める。
- backend lineage不明時はproduction mutationを試さず、T-003/T-004/T-016/T-025を進める。
- notification provider不通時はoutbox sandboxとdead/retry contractを完成させ、予約transactionを止めない。
- realtime不通時はpolling/read-only fallbackでG5まで進め、G6だけを未合格として隔離する。
- production異常時はkill switch OFFで閲覧専用化し、原因調査中も予約確認のread pathを維持する。
- Gateを省略しての見かけ上の短縮は行わない。作業継続と本番安全を両立する。
