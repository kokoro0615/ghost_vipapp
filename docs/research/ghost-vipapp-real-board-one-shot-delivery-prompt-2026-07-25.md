# GHOST VIP App: Real Board One-shot Delivery Prompt

作成日: 2026-07-25 JST  
対象: `/home/kokoro/projects/clients/ghost_vipapp` → `https://ghost-vipapp.vercel.app/`

## Goal

TableCheck APIは一切使わない。GHOST Supabaseを唯一の正本にし、fixture-onlyのVIP Floor UIを、スタッフが実予約を安全に閲覧・操作できるProduction運用画面へ置き換え、検証してProductionにデプロイする。

## Confirmed architecture

- **System of record**: existing GHOST Supabase. TableCheck credential、shop mapping、webhook、provider ID mapping、同期workerは不要。
- **Do not depend on**: 未適用の`20260714` v2 migration群、Stripe/payment mutation、public booking cutover、refund/cancel、TableCheck/POS/CRM integration。
- **Reuse first**: 本番適用済みのGHOST v1 schema/RPC。`admin_sessions`、`admin_users`、`verify_admin_pin_session_v7`、`authenticate_admin_session_v7`、`booking_slots`、`seat_resources`、`reservations`、`reservation_resources`、`audit_logs`。
- **Standalone boundary**: `ghost_vipapp`のRoute HandlerだけがSupabase service-roleを使用する。ブラウザ、HTML、ログ、エラー応答、Gitにはsecret/PIIを出さない。
- **Authentication**: 既存のPIN検証RPCを再利用し、httpOnly / secure / sameSite=strictの短期セッションcookieで自アプリの`/api/**`を認可する。既存のfail-closed Basic Authは外周として維持する。

## Scope to ship

1. 実予約・実テーブルの本日ボード（Floor / Timeline / List、検索・フィルタ、再読込）。
2. PINログイン、セッション確認、ログアウト、権限表示。共有Basic認証だけを業務認証にしない。
3. 初回に許可する操作は以下だけ。
   - check-in / 到着・着席状態
   - 既存予約の卓割当
   - 着席延長
   - スタッフメモ
   - 店頭VIP作成（既存安全RPCで可能な場合のみ。未対応ならUIを非表示にする）
4. すべての更新は、actor、request ID、reason、既存RPC由来のauditを保持し、成功後に最新ボードを再読込する。
5. `FEATURE_ADMIN_MUTATION_ENABLED`がfalse、または権限不足なら閲覧専用にして更新UIを無効化する。

## Work sequence

### A. Baseline and environment

1. `AGENTS.md`、現行UI、既存`website`の管理API/RPCを読み、現在のv1 contractに限定する。
2. `website` Vercel Productionの次の値を、値を出力せずserver-only Production envとして`ghost-vipapp`へ移す: `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_HASH_SALT`または`RESERVATION_HASH_SALT`、`ADMIN_SESSION_HASH_SALT`が存在すればそれ、`ADMIN_RATE_LIMIT_HASH_SALT`が存在すればそれ、`FEATURE_ADMIN_MUTATION_ENABLED`。公開用の`NEXT_PUBLIC_*`やStripe/LINE secretは移さない。
3. 環境変数が欠ける場合は起動時にfixtureへ静かにfallbackしない。設定不足の運用エラーとしてUIへ表示し、mutationはfail closedにする。

### B. Server implementation

1. `@supabase/supabase-js`を追加する。
2. `src/lib/server/`に、既存websiteと同じhash/session cookie/RPC authenticationを必要最小限で実装する。session cookie pathは`/api`、cookie本文・PIN・メール・service keyはログに残さない。
3. Route Handlerを実装する。
   - `POST /api/admin/session/pin`: `verify_admin_pin_session_v7`でPINを検証し、rate limitの429をそのまま扱う。
   - `GET /api/admin/session`: session identity / roleのみ返す。
   - `DELETE /api/admin/session`: セッションをretireする。
   - `GET /api/admin/vip-floor?date=YYYY-MM-DD`: v1 schemaを読む。すべての独立queryは`Promise.all`で並列化し、UIの`VipFloorBoardV2`へ変換する。顧客名は既存`guest_label`のみ、連絡先・カード・Stripe object・raw audit payloadは返さない。
   - `POST /api/admin/vip-floor/commands`: command allowlistをサーバーで強制し、既存v1 RPCだけを呼ぶ。未知のcommandは拒否する。各更新は`Idempotency-Key`を要求する。操作後は最新boardを返す。
4. 初回にv1で安全に裏付けられない操作は、外見だけ成功させず`not_available`として無効化する。直接SQL更新で監査を迂回しない。

### C. Client implementation

1. 初期表示で`GET /api/admin/session`を確認し、未認証ならPIN login UI、認証済みならreal boardを読む。
2. `FixtureCommandGateway`を`RealCommandGateway`へ置換する。読込・再読込・mutationは同一originの`/api/admin/**`のみを使う。
3. fixture scenario selector、`FIXTURE` stamp、fixtureにしか成立しない結果modeをProduction UIから除去する。接続状態は「実データ」「閲覧のみ」「読込失敗」を明確に表示する。
4. 成功したcommandの直後は返却boardを採用し、必要時にread-after-writeを行う。401時はログイン画面へ戻す。409/429/5xxはユーザーが復旧できる短い文言を表示する。
5. 実装可能な5操作以外（block、cancel/refund、顧客PII edit、Stripe、TableCheck）は見せないか、必ずdisabled + 利用不可表示にする。
6. 320px〜desktopで横page overflowを出さず、重要操作を44px以上、keyboard/focus/aria-live/reduced-motionを維持する。

### D. Validation

1. `npm run lint`、`npm run typecheck`、`npm run build`。
2. server contract testを追加するか、少なくともauthなし401、PIN invalid401、board authenticated200、mutation disabled/read-only、unknown command400、duplicate idempotency、invalid version/permission相当を検証する。実予約の状態を検証のために変更しない。
3. browserでBasic Auth → PIN → real board → reload/session persistence → logout → 401を確認する。Productionデータの更新は、safe commandを使う許可済みのテスト予約だけに限定し、操作後にauditとread-after-writeを確認する。
4. desktop 1440×900 と mobile 390×844で、Floor/Timeline/List、長い日本語、検索、操作dialog、overflow、44px target、console errorを確認する。
5. Git差分からsecret/PIIがないことを確認する。

### E. Release

1. source、lockfile、tests、prompt/documentationだけを独立repoのcommitへ入れる。無関係の親workspace変更は含めない。
2. Vercel Productionへserver-only envを設定してから`vercel deploy --prod`する。
3. alias `https://ghost-vipapp.vercel.app/`に対して未認証Basic 401、認証後200、PIN gate、board APIの未認証401を確認する。
4. release result、commit、deployment URL、実データ接続の有無、未実装commandをREADME/運用記録へ残す。

## Non-negotiable correctness

- TableCheck/API/provider syncを追加しない。
- fixtureを実データとして表示しない。設定不全・接続不全ではread-only/failure表示にする。
- service role、PIN、session token、cookie、raw customer data、Stripeデータをclient/log/docsへ出さない。
- 予約取消、返金、公開予約の切替、決済、TableCheck、直接DB書込みは初回releaseに含めない。
- レスポンスの成功表示とDB永続化を一致させる。reloadで消える操作を「保存済み」と表示しない。
