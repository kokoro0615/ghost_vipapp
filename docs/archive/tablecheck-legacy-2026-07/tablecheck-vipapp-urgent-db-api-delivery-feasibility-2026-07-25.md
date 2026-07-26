# ghost_vipapp 緊急DB/API結合・TableCheck接続の実現可能性

調査日: 2026-07-25 JST  
対象: `https://ghost-vipapp.vercel.app/`  
調査種別: read-only。実装、migration適用、環境変数変更、provider設定変更、deployは未実施

## 結論

短納期での納品は可能。ただし、次の2つを同じ「TableCheck実装」と呼ばない。

1. **GHOST独自の現場管理MVP**
   - 既存GHOST Supabaseを正本にし、standalone UIへ実予約read、限定command、個人認証、監査を接続する。
   - 既存API/RPC資産を再利用できるため、必要な権限、秘密情報、staging、maintenance windowが揃えば3〜5営業日が現実的な目安。
2. **TableCheck本体との正式な双方向連携**
   - 現在のrepositoryにはTableCheck API client、credential、shop mapping、Sync webhook handlerがない。
   - TableCheck側のAPI access審査、component選択、店舗有効化、test/live credential発行、必要に応じDPAが外部クリティカルパスになる。
   - credential未発行なら、期限内完成をGHOST側だけで保証できない。

全Gateを無視して本番DBへpending migrationを一括適用する案は採らない。既存Gate Cを「PASSした」と扱わず、standalone向けの短いEmergency Delivery Gateを新設し、read-onlyから段階的にmutationを開ける。

## 確認できた現状

### standalone ghost_vipapp

- Next.js 16.2.11の最小appで、TypeScript sourceは約2,357行。
- `FixtureCommandGateway`がbrowser memoryだけを更新し、reloadで元へ戻る。
- Supabase、Stripe、TableCheck client packageとAPI routeはない。
- Production環境変数は`VIPAPP_BASIC_USER`と`VIPAPP_BASIC_PASSWORD`の2件だけ。
- Basic Authenticationはfail-closedだが、共有資格情報なので個人識別、退職者無効化、role、MFA、actor auditを提供しない。

### 既存GHOST website backend

- `/api/admin/v2/**`はboard readを含む13 route、311行。
- 既存standalone UIの10 command familyに対応するRPC routeがすでにある。
  - service status
  - check-in / confirm
  - assignment
  - schedule
  - seat extension
  - block
  - note
  - walk-in
  - cancel / refund decision
  - customer profile
- server layerはadmin session、role/capability、redaction、idempotency、expected version、typed conflict、customer encryption、auditを実装済み。
- v2 core server/contractは約2,792行、2026-07-14系migrationは約12,570行。

### remote Supabase

`supabase migration list --linked`のread-only確認では、2026-06-03までの19 migrationはremote適用済みだが、v2用の2026-07-14系12 migrationは全てremote未適用だった。

pending 12 migrationの静的規模:

- `CREATE TABLE`: 10
- `ALTER TABLE`: 69
- `CREATE INDEX`: 13
- `CREATE OR REPLACE FUNCTION`: 44
- `VALIDATE CONSTRAINT`: 43
- 既存rowのbackfill、`SET NOT NULL`、既存table updateを含む
- `DROP TABLE` / `DROP COLUMN`: 0

したがって「API sourceをstandaloneへcopyしてenvを足すだけ」では動かない。board RPCとcommand RPCがremote DBに存在しないため、migration rehearsalと適用が必要になる。

## Gate Cで実際に止まっているもの

現在のGate C HOLDはUI不足ではない。V18の3 findingは次の証跡toolingにある。

1. crash/resume fixtureがproduction startup pathそのものを通っていない。
2. Vercel同値env更新receiptのprovider identityが空でも通る。
3. Stripe deliveryと結合するDB hashが64文字lowercase SHA-256形状かを検証しない。

これはStripe custom-staging、env更新後deploy、実webhook delivery、rollbackを厳密に証明できないという問題であり、実顧客・payment mutationを有効にする前には閉じるべきである。一方、次の範囲を先行することまでは妨げない。

- 既存schemaからの実予約read-only
- 個人認証/MFA
- masked data
- standalone固有のaudit
- Stripe/paymentはread-only evidence表示
- mutation flag offのProduction canary

元のGate C lineageは凍結したまま保持し、緊急MVPを元Gate C PASSとして偽装しない。

## 推奨する最短納品経路

### E0 — 0.5日: 境界固定

- 納品定義を「実予約read、個人認証、5つの安全command、監査、rollback可能なProduction canary」に限定する。
- 初回mutationは`check-in`、`service status`、`assignment`、`schedule`、`note`。
- `cancel/refund`、customer PII edit、public booking切替、Stripe endpoint変更、通知送信、TableCheck writeは除外。
- production backup、DB restore手順、mutation kill switch、担当者、maintenance windowを確保する。

### E1 — 1日: 個人認証とreal read

- Supabase Authまたは既存IdPで個人userを発行する。
- TOTP等のMFAを必須にし、JWTの`aal2`をAPIとRLSで強制する。
- Basic Authenticationは第二のperimeterとして残せるが、業務actorの正本にはしない。
- standalone server routeに、現行v1 schemaからv2 view modelへ変換するread adapterを実装する。
- 顧客名/連絡先はroleごとにmaskし、service-role keyはserver-onlyに置く。
- この段階で実予約を閲覧できるProductionをmutation offでcanaryする。

### E2 — 1〜2日: v2 migration rehearsal

- Supabase branchまたは別staging projectでpending 12 migrationを順番どおり適用する。
- Supabase branchはdata-lessなので、production件数・境界を再現するsanitized seedまたは復元環境が別途必要。
- migrationごとにlock timeout、実行時間、backfill件数、NULL、constraint、RPC signature、RLS/ACLを記録する。
- 失敗時はproductionへ進めず、forward-fix migrationを作る。remote SQL editorで履歴外変更をしない。

### E3 — 1日: API gatewayと安全command

- `FixtureCommandGateway`を`RealCommandGateway`へ置換し、board readと5 commandを同一originのNext APIへ接続する。
- `Idempotency-Key`、`expectedVersion`、409 conflict recovery、read-after-write、audit actor、reasonを必須化する。
- serverだけがSupabase/service-roleへ接続し、browserへsecretを出さない。
- `FEATURE_VIP_FLOOR_V2_READ_ENABLED`とmutation kill switchを別々に持つ。

### E4 — 0.5〜1日: Production canary

- 1 operator / 1営業日 / safe commandだけで開始する。
- 旧画面またはread-only fallbackへの即時rollbackを確認する。
- 2端末競合、二重送信、network retry、stale、overnight business date、mobile、auditを確認する。
- error率、command latency、reconciliation差分を監視し、問題がなければ対象operatorを増やす。

### E5 — 後続: paymentと危険操作

- Stripeはrestricted key、環境分離、endpoint固有signing secret、raw body signature verificationを維持する。
- cancel/refund、payment mutation、public booking cutoverはGate Cの3 findingを閉じ、sandbox delivery、duplicate/out-of-order、worker、rollbackを通してから開く。
- Vercel env変更は既存deploymentへ反映されないため、env設定後の新deploymentを必須とする。

## TableCheck本体を接続する場合

現在の「TableCheck型」計画は公開UI/操作モデルをGHOST固有実装で再現する計画であり、TableCheck API統合計画ではない。正式連携は別adapterとして追加する。

最小component候補:

| 目的 | TableCheck component | 注意 |
|---|---|---|
| 空き状況 | Availability v1 | Booking系のcompanion API |
| 予約read/write | Booking v1 | special arrangement、店舗ごとの承認、payment/menu item非対応 |
| 予約変更通知 | Sync v1 | eventに本体dataは含まれず、対象APIを再fetchする |
| Door Waitlist | Waitlist v1 | Test/Live endpointが別、create/update/cancel対応 |
| 顧客/履歴 | CRM v1 | sensitive data、DPA必須、予約作成用途には非推奨 |
| floor/table settings | Site Controller v1 | shop単位のaccess request、read-only |
| POS/table status | POS v1 | POS vendor専用で、GHOST operator appの一般adapterとしては前提にできない |

申請は`api@tablecheck.com`へ行い、system description、component、integration diagram、月間request数、designated contactを提出する。承認後にAPI Portal、test credential、検証後にproduction credentialが発行される。Booking v1はvenue operator本人またはintegration partner向けだが、case-by-case審査と費用がある。

Sync webhookは順序保証がなく、event本体に予約dataがないため、次の処理が必要になる。

1. authenticated callback受信
2. event IDのidempotent保存
3. 対象componentからobject再fetch
4. provider ID ↔ local ID mappingによるupsert
5. out-of-order / duplicate / 404-as-delete reconciliation
6. polling fallback

TableCheck credentialが既に発行済みなら、read + Syncのadapterは追加2〜5営業日が目安。Booking/Waitlist/CRMの双方向writeとreconciliationまで含めると追加5〜10営業日が現実的。credential未発行の場合、TableCheck側審査時間はGHOST側から保証できない。

## 納品判定

### 3〜5営業日で狙えるもの

- real reservation board
- individual auth + MFA
- role/capability
- masked customer data
- check-in/status/assignment/schedule/note
- idempotency/version conflict
- audit log
- mutation kill switch
- Production canary + rollback

### 同じ期限で「完成」と呼ばないもの

- Stripe refund/payment mutationの本番解放
- TableCheck正式APIの承認前接続
- Door Waitlist/CRM/POS/marketing/Insightの全網羅
- original Gate Hまでのfull rollout
- TableCheck製品全体の完全再現

## 実装開始に必要な明示authority

standalone `AGENTS.md`は実顧客、provider credential、payment、本番mutationを明示Owner承認とrollout gateなしに接続することを禁止している。実装開始時は次を明記した新しいauthorityが必要。

- 対象repository: `ghost_vipapp`
- 接続先: 既存GHOST Supabaseか新規専用projectか
- 初回command allowlist
- real PII範囲
- TableCheck credentialの有無
- staging/backup/maintenance window
- Production canaryとrollback責任者
- Stripe/paymentは初回scope外であること

## 公式資料

- [TableCheck API access request](https://tablecheck.atlassian.net/wiki/spaces/API/pages/44729064/Requesting+TableCheck+API+Access)
- [TableCheck API getting started](https://tablecheck.atlassian.net/wiki/spaces/API/pages/44630975/Getting+Started)
- [TableCheck Booking APIs](https://tablecheck.atlassian.net/wiki/spaces/API/pages/4687527943/Booking+APIs)
- [TableCheck Booking v1](https://tablecheck.atlassian.net/wiki/spaces/API/pages/160334455/Booking+v1)
- [TableCheck Sync v1](https://tablecheck.atlassian.net/wiki/spaces/API/pages/44631150/Sync+v1)
- [TableCheck Waitlist v1](https://tablecheck.atlassian.net/wiki/spaces/API/pages/663126251/Waitlist+v1)
- [TableCheck CRM v1](https://tablecheck.atlassian.net/wiki/spaces/API/pages/44664326/CRM+v1)
- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)
