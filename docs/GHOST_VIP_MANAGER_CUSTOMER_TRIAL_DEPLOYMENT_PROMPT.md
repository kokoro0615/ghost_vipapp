# GHOST VIP Manager 本番完成コード＋Staging DB 顧客Trial一気通貫プロンプト

> 承認日: 2026-07-26 JST  
> 顧客URL: `https://ghost-vipapp.vercel.app/`  
> Trial DB: Supabase staging `rsvrtaavofflkvtfzsfh`  
> Production DB: `cpfsrwctjymhmwvsbwdi`（read-only確認以外の変更禁止）

あなたはGHOST VIP Manager顧客Trial rolloutの統括Solです。以下を唯一の実行指示として、
本番完成コードの仕上げ、隔離staging data plane、仮データ投入、production-target build検証、
`ghost-vipapp.vercel.app`へのpromote、顧客handoff、rollback／正式本番切替準備まで
一気通貫で完了してください。
途中報告やpreview READYだけで終了してはいけません。

## 0. 承認された構成

ユーザーは次の構成を正式採用した。

> UI・機能・コード・Vercel buildは本番完成版とし、顧客trial期間だけデータ保存先を
> stagingにする。VIP App用の新規custom environmentやtrial専用アプリは作らない。

```text
Customer browser
  -> https://ghost-vipapp.vercel.app/
     VIP App production-target deployment
     本番完成コード / Production envでbuild / Basic auth / runtime TRIAL表示
  -> GHOST website staging custom environment
     本番と同一contractのadmin v2 API / Owner PIN / trial期間だけmutation ON
  -> Supabase staging rsvrtaavofflkvtfzsfh
     synthetic trial data only
```

- VIP Appの機能をtrial用に削らない。trial専用fork、mock API、別UIを作らない。
- 本番とtrialの差は、環境変数で選ぶbackend/data plane、外部delivery停止、TRIAL注意表示だけに限定する。
- VIP Appは`vercel --prod --skip-domain`でproduction-target buildを作り、
  実host E2E後に既存production aliasへpromoteする。
- VIP App用custom environmentの作成、`--target=trial`、Shareable Linkは使用しない。
- Website production alias `ghost-ruby-one.vercel.app`は変更しない。
- Production Supabaseへmigration、seed、trial mutationを行わない。
- 顧客が入力した仮データはすべてstagingへ保存する。
- Stripe、LINE、Email delivery、webhook、public bookingはtrial中すべて停止する。
- Vercel Production環境変数の変更は既存deploymentを書き換えない。trial開始時も正式本番切替時も、
  対象値を設定した後に新しいproduction-target deploymentをbuildして検証する。

## 1. 正本と既知のrollback anchor

開始時に必ず次を全文確認する。

- `docs/GHOST_VIP_MANAGER_SPEC.md`
- `docs/GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md`
- `docs/GHOST_VIP_MANAGER_IMPLEMENTATION_AUDIT_2026-07-26.md`
- `docs/evidence/GHOST_VIP_MANAGER_RELEASE_CANDIDATE_2026-07-26.md`
- `/home/kokoro/projects/clients/ghost/AGENTS.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_AGENT_SYNC.md`
- `website/AGENTS.md`とUI編集時の必読資料

開始時点のcanonical source：

- Website/API branch: `codex/vip-manager-contract-v2-20260726`
- Website/API candidate: `665fcf4d1eefca6bc790d5967f221a4d9fb48a06`
- VIP App branch: `codex/vip-manager-g0-5-20260726`
- VIP App code candidate: `fc5c24f20867d80a45564249afcc1a8f13e1ac7b`
- このprompt改訂前のVIP App docs baseline: `ced639935f56527230bdb0a013bdec7ebc6d7a47`
- 実行開始時のVIP App docs tipは、remote branch上でこのpromptを含む最新commitを解決して
  manifestへ記録する。code candidateのtreeを意図なく変更しない。

既知のproduction rollback anchor：

- Website production: `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP`
- VIP App production: `dpl_9Vh3knq1cBgnR48UNMxx7gM7j2NX`

これらは開始時にVercelで再確認し、異なる場合は最新値をmanifestへ記録する。

## 2. 権限境界

このプロンプトにより次を承認済みとする。

- 両repoのtrial safety実装、test、docs、canonical commit/push
- Website `staging` custom environmentの環境変数設定とdeployment
- Supabase stagingへのforward-only migration、synthetic seed、trial mutation
- Trial専用Basic資格情報、Owner PIN、暗号/search key、bypass secretの生成・設定
- VIP App Production環境変数のtrial data plane向け設定
- VIP Appのproduction-target staged deployment
- 全Gate合格後の`ghost-vipapp.vercel.app`へのpromote
- 認証済みsynthetic E2E、監視、rollback準備

承認されていない操作：

- Production Supabaseへのschema/data mutation
- Website production aliasの切替
- 実顧客PIIの取込
- 実メール、LINE、Stripe、webhook送信
- production project/databaseの削除・reset
- VIP App用custom environment、trial専用UI fork、trial専用mock backendの新設
- secret、PIN、cookie、Authorizationのchat/Git/log出力

## 3. 停止しない実行規則

1. 既存dirty worktreeを保護する。normal commit/reset/switchで他作業を巻き込まない。
2. canonical差分は必要ならtemp Git index/worktree/archiveで隔離する。
3. 各Waveをcontract→実装→test→evidenceで完了する。
4. production aliasを変えるのは全pre-promotion Gate合格後の1回だけ。
5. 失敗時はmutation flag OFFを最初に行い、aliasをrollback anchorへ戻す。
6. production DB refを検知したseed/mutation/cleanup scriptはfetch/SQL前に強制終了する。
7. Supabase `migration repair`、down migration、remote `db reset`を使わない。
8. 1タスクが詰まったらmock、local、staging、read-only検証へ切り替え、他Waveを進める。
9. 外部permissionまたはsecret設定が本当に必要な場合だけ、promote直前で一つの具体的操作として報告する。
10. 「コード完成」「preview READY」「手順提示」だけを完了としない。
11. trial短縮のために本番機能を省略しない。未完成機能をtrial専用mockで隠さない。

## 4. Agent編成とtoken節約

Solは実装者ではなく統括に徹し、正本解釈、依存関係、agent dispatch、
cross-repo contract、Gate判定、promote/rollback判断だけを担当する。
開始時に最大3レーンを並行起動し、各Waveで必要なレーンだけを再利用する。

| Lane | Model | 所有範囲 |
|---|---|---|
| Data/API | Terra | `website`本番contract完成、trial guard、migration、seed/cleanup、auth、external side-effect停止 |
| Manager UI | Terra | `ghost_vipapp/src`本番完成UI、runtime trial banner、proxy bypass、入力安全 |
| QA/Release | Terra | tests、live staging E2E、Vercel、observability、manifest、rollback |
| Inventory/Audit | Luna | `rg`、env名、route/migration inventory、反復validation、artifact照合 |

- Lunaが実行環境にない場合はTerraの低〜中reasoningへ置換し、Solへ戻さない。
- 各agentへ全会話を渡さず、担当path、入力SHA、期待artifact、acceptanceだけを渡す。
- 同一pathのwriterは常に1 agent。schema変更はData/APIが先に固定し、Solが承認してからUIへ通知する。
- agent報告は`変更差分 / validation / Gate / blocker`だけとし、長いraw logや既知文書の再掲を禁止する。
- Solはagentが作った差分を自分で再実装せず、contract整合、dirty保護、統合validationへtokenを使う。
- secretを扱うexternal write、production alias promote、rollbackはQA/Releaseが準備し、
  SolがGate evidenceを確認して1回だけ実行許可する。
- 各Waveのstatus更新はQA/Releaseが下書きし、Solが正本へ統合する。

## Wave TR-0: Lineage、現況、rollback固定

1. 共有status/logと両repoのdirty stateを確認する。
2. canonical branch/remote SHA、Vercel project ID、current production alias/deploymentを再取得する。
3. VIP App production envとWebsite staging envは値を出さず、変数名だけinventoryする。
4. Supabase project一覧、linked ref、local/remote migration historyを確認する。
5. Production DBのboard revision、reservation/customer/outbox件数は集計値だけsnapshotし、
   trial後に不変を照合できるようPII-free evidenceへ保存する。
6. `docs/evidence/GHOST_VIP_MANAGER_TRIAL_RELEASE_<DATE>.md`を作成し、全ID/SHA/Gateを集約する。
7. VIP App Production envをstaging向けへ設定している期間は、別agent、人、Git integrationが
   production deploymentを開始しないrelease lockを宣言する。意図しないproduction deploymentを
   検知したらaliasを変更せず停止し、そのdeploymentをevidenceへ記録する。
8. rollback anchorへ既知の安全な認証経路で到達できることを確認する。既存Basic値を取得できず
   rollback後の操作性を証明できない場合は、promote前に旧sourceから管理可能な新資格情報を使った
   rollback deploymentを`--prod --skip-domain`で用意し、そのIDを新anchorとする。

Gate TR-0：

- current productionとrollback anchorが追跡可能
- staging/production refを機械的に識別可能
- dirty差分を巻き込まない手段が確定
- production DB mutationが0
- production release lockと、認証可能なrollback deploymentが確定

## Wave TR-1: 本番コード完成＋Trial data-plane safety

開始時点ではtrial mode、protection bypass header、seed/cleanup harnessは未実装である。
既存4幅/axe suiteはAPIをsynthetic mockするUI regressionであり、live staging統合証拠ではない。
これらを「既にある」と仮定せず、このWaveで実装して別々のGateとして検証する。
ただしtrial専用の機能縮小版を作ってはならない。正本仕様の本番機能を完成させ、
trial差分はserver-side runtime flagによる安全制御と注意表示だけに閉じ込める。

### 1. Trial mode

両surfaceにserver-side `GHOST_VIP_TRIAL_MODE=true`を導入する。
同じsourceを正式本番では`false`にしてbuildできることをcontract testで保証する。

VIP App：

- 全viewportの第一画面に`TRIAL / 仮データ専用`を常時表示
- 「実在する顧客・スタッフ・電話・メール・決済情報を入力しない」を日本語で表示
- page title、header、login、dialogへ非色依存のTRIAL cueを付ける
- production実運用と誤認する文言を出さない

Backend：

- trial mode時、保存対象のdisplay nameへbackendが`TRIAL`識別を強制付与
- emailは空または`@example.com`だけ許可
- phoneは空だけを許可
- notesでemail/電話らしい文字列を検知した場合は保存前に拒否
- source/auditへPII-free `trialRunId`を記録
- trial modeでproduction Supabase ref/URLを検知したら起動またはmutationをfail-closed
- free textは可能な限り定型fixture/選択肢へ置換し、実名らしい値を自動生成trial labelへ正規化

### 2. Protected backend fetch

VIP Appのserver-only proxyへ次を追加する。

- `GHOST_BACKEND_PROTECTION_BYPASS`が存在する場合だけ
  `x-vercel-protection-bypass`としてbackend requestへ付与
- client bundle、response、error、logへ値を出さない
- header付与先を`GHOST_ADMIN_API_ORIGIN`の完全一致originに限定
- production website originへbypass headerを送らない
- unit/contract testでsecret非露出、origin制限、未設定時fail-closedを確認

### 3. External side-effect hard stop

Trial modeではflagだけに頼らず、次をapplication boundaryでも拒否する。

- public booking
- Stripe mutation
- LINE delivery
- Email delivery worker
- webhook processing
- dual write to production compatibility path

`/api/line/webhook`は現状notification/webhook flagを確認しない経路があるため、
trial modeまたはflag OFF時にroute先頭でfail-closedする修正とcontract testを必須とする。
Stripe webhook、`/api/cron/*`、`/api/admin/workers/*`も同じtrial boundaryを検証する。

Email notification選択はUI/transaction/outboxの評価用に許可してよいが、
provider deliveryは必ず停止し、outboxはstaging内だけに残す。

### 4. Seed / cleanup harness

次を実装する。

- `website/scripts/seed-vip-manager-trial.mjs`
- `website/scripts/cleanup-vip-manager-trial.mjs`
- `website/scripts/verify-vip-manager-trial.mjs`

共通条件：

- exact allowlist ref=`rsvrtaavofflkvtfzsfh`
- denylist ref=`cpfsrwctjymhmwvsbwdi`
- origin/refが曖昧ならnetwork/SQL前に停止
- generated nonce付き`trialRunId`と`--confirm-staging`必須
- idempotent
- `--dry-run`で予定件数だけ表示
- secret/PIIを表示しない
- cleanupは依存関係順
- backendが全新規business/audit/event行へ`trialRunId`を強制し、cleanup対象をrun単位に限定
- cleanup後にreservation/resource/customer attributes/link/staff assignment/block/
  Waitlist/outbox/audit/event孤児0をassert
- seed前に存在したstaging行の件数/hashがcleanup後も不変であることをassert
- production-host refusalをunit test

Seedはschema変更を含めず、migration適用後にのみ実行する。

### 5. Trial seed

次を仮データとして用意する。

- 8卓と実floor geometry
- VIP offering 1〜2件
- trial Owner 1名、trial staff 2〜3名
- 10〜15件の予約
- 単一卓、複数卓、未割当、3回転
- expected/arrived/checked-in/延長/完了/取消などの代表状態
- Walk-in
- Waitlist waiting/called
- maintenance/event block
- fake customer 3〜5件
- notes、staff assignment、history
- attention/SLO確認用の安全なsynthetic状態

メールは`trial-<run>-XX@example.com`、電話はNULL、notesはPIIを含まない定型文だけとする。
営業日はAsia/Tokyoのtrial開始日+1〜3日に固定し、顧客がdate selectorで直ちに見つけられるようにする。
実在連絡先・氏名は0件とする。

Gate TR-1：

- lint/typecheck/unit/contract/PII scan/build PASS
- trial bannerが4幅で見える
- backend bypass secret非露出
- production origin/ref拒否test PASS
- external provider call 0
- UI mock regressionとlive staging integrationの証拠を明確に分離

## Wave TR-2: Supabase staging準備

1. staging refへ明示的にlinkする。
2. migration listを保存し、`db push --dry-run`を実行する。
3. history/schema不一致時はrepairせず、forward-only migrationまたは正本照合で解消する。
4. pending migrationだけをstagingへ適用する。
5. migration listがlocalと一致することを確認する。
6. stagingのPII-free logical snapshot/row countsを保存する。
7. seedをdry-run→実行→verifyする。
8. trial Owner PINを`provision-admin-pin.mjs`でstagingへ設定する。
9. credentialはrepo外のmode 600一時fileで渡し、値を出力しない。
10. 最後にCLI linkをproduction refへ戻し、値を確認する。

Staging runtimeで必要な秘密値：

- `SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、
  `SUPABASE_SERVICE_ROLE_KEY`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- trial専用`ADMIN_HASH_SALT`、`ADMIN_SESSION_HASH_SALT`、
  `ADMIN_RATE_LIMIT_HASH_SALT`、必要時のみ`RESERVATION_HASH_SALT`
- trial専用customer encryption key
- trial専用customer search key
- trial専用bootstrap secret
- diagnosticsが必要な場合だけ新規trial用`WORKER_RUN_SECRET`/`CRON_SECRET`

ProductionのStripe、Turnstile、LINE、Email provider secretをstagingへ複製しない。
特に`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_GROUP_ID`、
`LINE_GROUP_ID_CAPTURE_PHRASE`、`GHOST_EMAIL_DELIVERY_ENDPOINT/TOKEN`、
`STRIPE_*`、`NEXT_PUBLIC_STRIPE_*`を設定しない。
既存`preflight-vip-floor-v2-gate-c-staging.mjs`はStripe/Turnstile等を要求するため
trial preflightとして流用せず、専用preflightを作る。

Gate TR-2：

- staging migrationがcanonicalと一致
- seed/verify PASS
- Owner PIN login可能
- production row-count/revision不変
- Supabase linkがproductionへ復元済み

## Wave TR-3: Website backend staging deployment

Websiteの既存`staging` custom environmentを使用する。

必須flag：

```text
GHOST_VIP_TRIAL_MODE=true
FEATURE_ADMIN_MUTATION_ENABLED=true
FEATURE_VIP_FLOOR_V2_READ_ENABLED=true
FEATURE_VIP_FLOOR_V2_MUTATION_ENABLED=true
FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLED=true

FEATURE_PUBLIC_BOOKING_ENABLED=false
FEATURE_WEBHOOK_PROCESSING_ENABLED=false
FEATURE_LINE_NOTIFICATIONS_ENABLED=false
FEATURE_EMAIL_NOTIFICATIONS_ENABLED=false
FEATURE_VIP_FLOOR_DUAL_WRITE_ENABLED=false
FEATURE_VIP_FLOOR_V2_SHADOW_COMPARE_ENABLED=false
```

1. Production envを丸ごとimportしない。
2. staging Supabaseとtrial専用secretだけを設定する。
3. Deployment Protection Automation Bypassを安全に生成・設定する。
4. exact canonical archiveを`vercel deploy --target=staging`でdeployする。
5. deployment ID、URL、READY state、runtime env presenceを記録する。
6. `vercel curl`または保護bypass付きtestで未認証401、PIN、read、mutationを確認する。

Backend staging E2E：

- 8段階create
- edit
- 6 command
- Walk-in
- Waitlist call/seat
- block create/remove
- staff create/assign
- customer attributes/relink
- version conflict/idempotent replay
- realtime revision/gap
- SLO
- outbox queued/not delivered
- logout

Gate TR-3：

- 全操作がstagingへ永続化
- audit/revision整合
- provider/network side effect 0
- production DB snapshot不変
- backend deployment READY

## Wave TR-4: VIP App production-target staged deployment

VIP App用のcustom environmentは作らない。本番完成sourceをVercel Production環境変数で
buildし、最初はdomainを割り当てずに実host統合試験を行う。

変更前にVIP App Production環境変数の名前、適用範囲、更新時刻を値非表示でsnapshotし、
rollback／正式本番切替manifestへ保存する。trial期間のProduction envを次で整備する。

```text
GHOST_VIP_TRIAL_MODE=true
GHOST_ADMIN_API_ORIGIN=<website staging origin>
GHOST_BACKEND_PROTECTION_BYPASS=<server-only secret>
VIPAPP_BASIC_USER=<trial-only value>
VIPAPP_BASIC_PASSWORD=<trial-only strong value>
```

1. production envを丸ごと再作成せず、必要なkeyだけを監査付きで更新する。
2. Basic user/passwordとOwner PINを別々の安全な経路で生成する。
3. 値はVercel envとmode 600のrepo外handoff fileにだけ保存する。
4. exact canonical source archiveのSHA/tree hashを記録する。
5. `vercel --prod --skip-domain`でproduction-target deploymentを作る。
6. deployment ID、URL、READY state、source SHA、Production env適用を記録する。
7. deployment protection automation bypassはserver-to-server/E2Eだけで使用し、
   secretをquery、browser storage、client bundle、logへ渡さない。
8. alias未付与の実deploymentへ`staging-mutation-e2e.mjs`を実行し、
   fixture create→command→audit→cleanup orphan 0→logoutまで確認する。
9. mutation harnessは`GHOST_VIPAPP_ALLOW_STAGING_MUTATION=E2E削除可`と
   staging fingerprint/host allowlistがなければnetwork前に停止する。
10. `prod-e2e.mjs`をmutation用途へ流用しない。
11. deploymentの全read/mutation requestがWebsite staging originだけへ到達し、
    Website production originやproduction Supabaseへのrequestが0であることを証明する。
12. deployment一覧を再取得し、release lock中に意図しないproduction build／alias assignmentが
    発生していないことを確認する。

この段階では`ghost-vipapp.vercel.app`は旧deploymentのままでなければならない。

Gate TR-4：

- 本番完成sourceのproduction-target staged deploymentがREADY
- current production alias不変
- Basic/PIN/session/logout PASS
- live staging mutation/audit/cleanup PASS
- 全mutationがSupabase stagingにだけ到達
- production DB snapshot不変
- VIP App custom environment作成0
- trial専用UI/API fork 0

## Wave TR-5: 顧客操作品質Gate

次のtrial scenarioを自動＋手動で確認する。

1. List/Floor/Chart
2. 8段階予約作成
3. 予約編集、複数卓
4. 到着、check-in、延長、接客状態、担当卓、メモ
5. Walk-in
6. Waitlist create/call/seat/expire/cancel
7. block/online stop
8. staff master/assignment
9. customer attributes/unlink/relink
10. 2タブによる409 conflict
11. offline read-only
12. realtime reconnect/gap recovery
13. SLO/alert
14. logout/login

品質matrix：

- 320×720
- 1024×768
- 1194×834
- 1366×1024
- Chromium reduced-motion
- axe 0
- horizontal overflow 0
- important control 44px未満0
- keyboard/focus/non-color cue
- 長い日本語/英語

実Safari/iPadがこの環境にない場合、未実施を明記する。ただし既存自動Gate合格、
trial banner、rollback、staging隔離が確認できる場合は、Owner承認済みtrial rolloutを
無期限に停止せず、Safariを顧客trialの最初のdevice witnessとして記録する。

Gate TR-5：

- customer scenario全項目PASS
- security/PII violations 0
- external delivery 0
- production DB change 0

## Wave TR-6: Promote

全Gate合格後だけ実施する。

1. current aliasがrollback anchorを指すことを再確認する。
2. rollback deploymentへ認証付きで到達でき、必要なrollback資格情報のhandoffがあることを確認する。
3. release lockが有効で、意図しないproduction deploymentが0であることを確認する。
4. backend staging mutationがON、外部side effectがOFFであることを再確認する。
5. `vercel promote <staged-production-deployment>`でVIP Appをpromoteする。
6. `ghost-vipapp.vercel.app`が新deployment IDを指すことを確認する。
7. 未認証`/`とadmin APIが401であることを確認する。
8. Basic＋Owner PINでloginする。
9. synthetic reservationを1件create/editし、stagingへだけ保存されたことを確認する。
10. production DB snapshot/revision/countが不変であることを確認する。
11. Vercel error log、SLO、outbox、realtime gapを確認する。
12. handoff fileのpath、trial期限、rollback IDをOwnerへ報告する。secret値は表示しない。
13. 意図的に作ったSLO alertをclearし、dead outbox、realtime gap、5xxが0であることを確認する。

Promotion直後smokeに失敗した場合：

1. backend staging mutation flags OFF
2. `vercel rollback <previous-vip-production-deployment>`
3. alias復旧確認
4. Basic/bypass/PIN rotation
5. staging trial rows cleanup
6. production DB不変確認

Gate TR-6：

- `https://ghost-vipapp.vercel.app/`が新trial deployment
- 顧客がBasic＋PINで操作可能
- 仮データがstagingへ永続化
- production DB/website production alias不変
- rollbackが即時実行可能

## Wave TR-7: 顧客handoffと終了準備

次をPII-freeで作成する。

- 60〜90分の顧客trial scenario
- 「実在情報を入力しない」注意
- known limitations
- feedback項目
- trial開始/終了予定JST
- support/rollback判断者
- exact deployment/source/schema manifest
- cleanup runbook
- 正式本番切替runbook

Trial credential handoff：

- repo外のmode 600 file
- BasicとPINを同一chatへ貼らない
- Git、docs、screenshot、consoleへ値を残さない
- trial終了時に全値をrotation/revoke

Trial終了時は「停止」または「正式本番切替」のどちらかをOwnerが選ぶ。
選択がない状態でproduction DBへ接続してはならない。

### A. Trialを停止し、旧productionへ戻す

次の順序で実行する。

1. backend staging mutation OFF
2. 顧客access停止
3. VIP Appをrollback anchorへrollback
4. Basic、PIN、bypass secretをrotation/revoke
5. VIP Production環境変数からstaging origin、bypass、trial mode値を除去または通常値へ復元
6. 必要なら旧sourceを復元後のProduction envで新規buildし、旧alias挙動を確認
7. cleanup dry-run
8. staging rows cleanup
9. orphan/outbox/audit検証
10. production DB不変確認
11. evidence/status/log更新

### B. 同じ本番完成コードを正式production data planeへ切り替える

これは本promptのtrial rollout承認だけでは実行しない。Ownerの正式本番切替承認を得た後、
次の独立Gateをすべて満たして実行する。

1. production DB backup/PITR状態、migration history、forward-only dry-runを確認する。
2. production Supabaseへ承認済みmigrationだけを適用し、seed/trial rowsは投入しない。
3. Website Production envへ本番secretを安全に設定し、全mutation flag OFFでbackendを先行deployする。
4. production backendのread-only smoke、schema、auth、provider flag OFFを確認する。
5. VIP Production envを次へ切り替える。

```text
GHOST_VIP_TRIAL_MODE=false
GHOST_ADMIN_API_ORIGIN=<website production origin>
GHOST_BACKEND_PROTECTION_BYPASS=<unset>
VIPAPP_BASIC_USER=<production value>
VIPAPP_BASIC_PASSWORD=<production strong value>
```

6. trialで検証したものと同一source SHA/treeから、別の
   `vercel --prod --skip-domain` production-target deploymentを新規buildする。
7. alias未付与deploymentでproduction read-only smokeを行う。synthetic mutationは実行しない。
8. Owner最終承認後にそのdeploymentをpromoteする。
9. mutation flagはread→限定mutationの順で段階的にONにし、監視とrollbackを継続する。
10. staging mutation OFF、trial credential/bypass revoke、staging cleanupを実行する。

環境変数の変更だけで既存trial deploymentを正式本番へ転用しない。
deploymentはbuild時に対象環境の値を受け取るため、正式production data plane向けの
新しいproduction-target buildとpre-promotion Gateを必須とする。

`vercel rollback`はdeployment artifactを戻すが、projectに現在登録されている環境変数を
自動では戻さない。rollback後もtrial backend originやbypass secretを残さず、
必要なら旧sourceをrotation済み通常envで再buildしてから終了する。

## 最終Definition of Done

次をすべて満たすまで完了と報告しない。

- Trial safety code/testがcanonical remote commit
- Website staging backendがREADY
- Supabase stagingにsynthetic seed
- 本番完成コードのproduction-target staged deploymentでlive integration E2EがPASS
- VIP App custom environment作成0、trial専用fork 0
- `ghost-vipapp.vercel.app`が新trial deploymentを参照
- Basic＋Owner PINで顧客が操作可能
- 仮データがstagingへ永続化
- production Supabase mutation 0
- Website production alias変更 0
- Stripe/LINE/Email/webhook delivery 0
- 4幅/axe/keyboard/PII/security Gate合格
- exact rollback deploymentがREADY
- trial credential handoff、scenario、cleanup手順が用意済み
- 正式本番切替時に同一sourceから再buildするrunbookが用意済み
- `AI_CURRENT_STATUS.md`と`AI_WORK_LOG.md`更新済み

最終報告には、secret/PIIを含めず次だけを記載する。

- customer URL
- source commit
- backend/VIP deployment ID
- staging refとmigration head
- automated/manual Gate結果
- production DB不変証拠
- external delivery 0
- rollback deployment ID/command
- credential handoff file path
- known limitation

## 公式設計根拠

- Website stagingで使用するVercel Custom Environments:
  `https://vercel.com/docs/deployments/environments`
- Vercel staged production / alias:
  `https://vercel.com/docs/cli/alias`
- Vercel CLI production deployment:
  `https://vercel.com/docs/cli/deploying-from-cli`
- Vercel promote:
  `https://vercel.com/docs/cli/promote`
- Vercel environment variables:
  `https://vercel.com/docs/environment-variables`
- Vercel Deployment Protection:
  `https://vercel.com/docs/deployment-protection`
- Protection Bypass for Automation:
  `https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation`
- Vercel deploy / `--skip-domain`:
  `https://vercel.com/docs/cli/deploy`
- Vercel rollback:
  `https://vercel.com/docs/cli/rollback`
- Supabase environment separation:
  `https://supabase.com/docs/guides/deployment/managing-environments`
- Supabase migrations:
  `https://supabase.com/docs/guides/deployment/database-migrations`
- Supabase seed:
  `https://supabase.com/docs/guides/local-development/seeding-your-database`
