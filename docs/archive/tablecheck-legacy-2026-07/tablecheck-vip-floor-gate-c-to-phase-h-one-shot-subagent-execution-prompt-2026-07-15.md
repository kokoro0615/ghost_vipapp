# GHOST Osaka VIP Floor Gate C → Phase H 一気通貫サブエージェント実行プロンプト

作成日: 2026-07-15 JST

状態: 実行プロンプトのみ。本書作成時点ではStripe/Vercel/Supabaseの追加操作、deployment、flag/DB変更、
runtime cycle、本人署名、UI実装、production変更を実施していない

対象: 現在のGate C `OPERATOR AUTHENTICATION HOLD`から再開し、元のFAIL/HOLDを保存したbinding契約改定、
Gate C閉鎖、D0-D3、E-H、段階release、安定期間後のlegacy cleanup判断までを、停止・再開可能な同一ledgerで進める

## このプロンプトに固定した技術判断

Stripe binding不一致は、既存objectを作り直すremediationではなく、**元のFAIL/HOLDを不変保存したversioned
contract amendment**で扱う。

- SetupIntentは、immutable probe receiptの作成時`requires_payment_method`と、親Checkout Sessionをexpireした
  cleanup receiptを時系列で結び、fresh readbackが`canceled`である場合だけ限定的に受け入れる。
- Refundに存在しない`livemode`表現を要求・合成しない。Refundのtest-mode境界は、exactly oneのRefundから
  exactly oneの保持PaymentIntentへのprivate link、そのPaymentIntentの`livemode=false`、同じrun digest、
  dedicated test operator profileによって推移的に証明する。
- one-time RAK capability probeはこのevidence lineageでは永久に再実行しない。
- PaymentIntent、SetupIntent、Refund、Checkout Session、Customer、metadata、retained cohortをreplacementしない。
- 改定条件を既存objectで証明できない場合は`CONTRACT AMENDMENT HOLD`とし、歴史的HOLDをPASSへ書き換えない。
- 本判断はEngineer/セキュリティ観点の独立read-onlyレビュー済みの推奨案である。ただしAIレビューはOwner本人と
  Engineer本人によるexact amendment digestの批准を代行しない。

ユーザーはOwner、Floor Manager、Engineerを同一人物として担う。署名governanceはversioned amendmentにより
`single_operator_multi_role_v1`へ変更済みである。これは1人が3つのrole decisionを行う契約であり、3人の独立reviewを
意味しない。既取得署名は、**将来freezeする最終Gate C manifest SHAへの署名として自動転用しない**。Gate C正式署名は
runtime evidence freeze後に同じ1人が3役を別々のtimestampとrole attestation codeで再attestする。
canonical governance evidenceは
`website/docs/evidence/vip-floor-v2/gate-c-signature-governance-amendment-v2-20260715.json`である。

## 使用方法

以下の`Prompt starts`から`Prompt ends`までをprimary agentへ渡し、次のworkspace rootから実行する。

```text
/home/kokoro/projects/clients/ghost
```

長時間・複数sessionにまたがっても、同じtask/evidence ledgerから再開する。context compaction、agent交代、
human checkpoint待ちを理由に、完了済み作業やprovider mutationを最初から繰り返さない。

---

## Prompt starts

あなたはGHOST Osakaの現場向けVIP Floor Boardを、現在のGate C HOLDからPhase Hまで安全に仕上げるprimary
implementation agentである。徹底してサブエージェントを使い、各Waveでroot + 最大3 subagentsを稼働させる。
ただし、provider mutation、DB apply、deploy、shared contract integration、human checkpoint判定はrootが直列に行う。

TableCheckの商標、ロゴ、CSS、非公開コード、非公開アルゴリズム、顧客データをコピーしてはならない。公開情報から
確認できる情報構造、画面密度、操作モデルを再現し、visual languageはGHOST Osaka固有のものにする。

### 1. mandatory checkpointとtruthful terminal outcomes

`GATE C PASS / PHASE D0 UNLOCKED`は必須の**non-terminal checkpoint**である。ここでone-shot全体を完了せず、
Gate C evidence windowをfreezeして新しいsession/WaveでD0以降へ進む。

作業を次のいずれかの真実なterminal outcomeまで継続する。

1. `CONTRACT AMENDMENT HOLD`
2. `BOOTSTRAP READY / RUNTIME HOLD`
3. `RUNTIME READY / SIGNATURE HOLD`
4. `PHASE Dn HOLD`（nと不足acceptanceを明示）
5. `RELEASE HOLD / SAFE ROLLBACK COMPLETE`
6. `PHASE H PASS / STABILITY WINDOW ACTIVE`
7. `FULL REPRODUCTION COMPLETE / LEGACY CLEANUP DEFERRED OR APPROVED`
8. `FAIL-CLOSED HOLD`

infrastructure READY、通常audit exit 0、AI review、ユーザーの一般承認、署名の取得申告をGate PASSと混同しない。
未実施のhuman rehearsal、数値budget承認、観測時間、canary、本人署名を完了扱いにしない。

### 2. 最初に全文を読む正本

作業前に、root自身が次を全文で読む。サブエージェントへskillや正本解釈を丸投げしない。

- `AGENTS.md`
- `docs/AI_AGENT_SYNC.md`
- `docs/AI_CURRENT_STATUS.md`
- `docs/AI_WORK_LOG.md`の最新行
- `website/AGENTS.md`
- `website/docs/ui/UI_TOOLKIT.md`
- `.Codex/docs/DESIGN.md`の存在確認
- `website/docs/research/tablecheck-vip-floor-end-to-end-implementation-plan-2026-07-14.md`
- `website/docs/research/tablecheck-vip-floor-phase-c-gate-c-ui-implementation-plan-2026-07-14.md`
- `website/docs/research/tablecheck-vip-floor-reproduction-spec-2026-07-14.md`
- `website/docs/evidence/vip-floor-tablecheck/parity-matrix.md`
- `website/docs/evidence/vip-floor-tablecheck/component-spec.md`
- `website/docs/evidence/vip-floor-tablecheck/behavior-inventory.md`
- `website/docs/research/tablecheck-vip-floor-c7-immutable-staging-bootstrap-rak-webhook-execution-prompt-2026-07-14.md`
- `website/docs/research/tablecheck-vip-floor-c7-staging-runtime-evidence-execution-prompt-2026-07-14.md`
- `website/docs/research/tablecheck-vip-floor-c7-operator-binding-runtime-signoff-execution-prompt-2026-07-15.md`
- `website/docs/evidence/vip-floor-v2/gate-c-staging-operator-runbook.md`
- `website/docs/evidence/vip-floor-v2/gate-c-summary-20260714.json`
- `website/docs/evidence/vip-floor-v2/gate-c-c7-operator-binding-hold-20260715T012324+0900.json`
- Gate C preflight/audit/orchestrator/contractsと、そのfixture/negative tests
- `website/src/lib/server/stripeCapabilityProbe.ts`
- `website/src/lib/server/stripeEventPolicy.ts`
- Stripe webhook/refund/shadow/public compatibility runtimeとworkers
- `website/src/lib/vipFloorV2Contract.ts`
- `/admin/vip-floor`のpage、v1 dashboard、v2 API/command/error/fixture実装
- closest desktop/mobile screenshotsとfloor media
- applicable Stripe security/payments skillの全文と必要references
- UI/UX design skillのdesign-system出力。ただしGHOST正本と矛盾するgeneric paletteは採用しない。

Next.js変更前には、installed `node_modules/next/dist/docs/`からNext 16の次の該当guideを読む。

- Server and Client Components
- Layouts and Pages
- Fetching Data
- Caching
- Route Handlers
- Lazy Loading
- Forms
- Accessibility

`searchParams`をPromiseとしてawaitすること、Client Componentへ渡すDTOを最小化すること、chart/listのdynamic
importをClient wrapper内で行うことを、現行installed versionで再確認する。

### 3. authorityと禁止事項

本プロンプトは、local repositoryと明示済みstaging/test境界の通常実装を許可する。次は別のhuman authorityが
必要であり、本プロンプトだけで自動実行しない。

- exact contract amendment digestへのOwner/Engineer本人批准
- numeric runtime budgetのOwner/Engineer本人承認
- Floor Manager staging rehearsal
- final evidence manifestへの同一人物による3つのrole attestation
- production change window、canary開始、最終Go
- legacy cleanup
- paid plan、外部通知、LINE有効化、live-mode Stripe操作

絶対に行わないこと:

- Stripe live mode、production/Preview/LINEへの意図しない接触
- one-time RAK probeの再実行
- retained Stripe objectまたはmetadataのreplacement/repair
- 元のFAIL/HOLD evidenceの削除、上書き、retroactive PASS化
- default Stripe operator profileやAPI-key overrideへのfallback
- secret、credential、URL、query string、provider ID、project ref、account identity、raw response、PII、
  ciphertext、nonce、private pathのchat/log/evidence出力
- AI代筆、代理署名、placeholder、異なるmanifestへの署名転用、governance未記録のrole兼任
- DB trigger/SQL/UIからStripe、LINE、SMS、POSを直接呼ぶこと
- 未承認のoffline command自動replay
- unrelated dirty worktreeのreset、checkout、clean、revert、上書き
- subagentによるdeploy、DB apply、provider mutation、secret操作、git commit/push
- productionでのdestructive migrationやlegacy cleanupの自動実行

### 4. サブエージェント運用契約

各Waveで必ず3つのbounded taskを作る。最大同時実行数が不足する場合は順次入れ替えるが、root単独で重要Waveを
完了させない。各task packetに次を明記する。

```text
Objective
Frozen contracts
Owned paths
Read-only dependencies
Forbidden paths/actions
Required states
Required fixtures
Validation
Evidence output
Definition of done
```

rootの専有事項:

- task/evidence ledger、dirty manifest、Gate判定
- shared contract、feature flag、top-level page/composer、package/lockfile、globals.css
- provider/DB/deploy/build/Playwright serverの直列操作
- subagent diffの1件ずつのreview/integration
- human checkpointのexact digest提示とreadback
- summary、status、work log

subagent共通規則:

- 1 agent = 1 bounded responsibility = disjoint owned paths
- 他agentまたはrootのowned fileを編集しない
- shared file変更はpatch proposalだけをrootへ返す
- provider値やraw provider outputを受け取らない
- 自分の担当を検証した後、別担当をcross-reviewする
- 完了時に変更file、判断、commands/exit、残riskを返す
- builderと同じagentが単独で最終acceptしない

agent ledgerへ記録するのはrole、task、owned paths、input digest、output digest、review result、timestampだけとし、
secret、URL、ID、raw outputを含めない。

### 5. 全Wave共通の停止・再開protocol

各Wave開始前に次を行う。

1. `git status --short`を確認し、unrelated dirty changesをmanifest化する。
2. current status/work logと直前evidence SHAを読む。
3. current source/migration/artifact/contract digestを再計算する。
4. task packetをfreezeする。
5. 3 subagentsをdispatchする。
6. subagent結果をcross-reviewし、rootが差分を統合する。
7. required validationsを直列実行する。
8. sanitized evidenceと実exit codeを保存する。
9. `docs/AI_CURRENT_STATUS.md`と`docs/AI_WORK_LOG.md`を更新する。
10. PASS条件が不足すれば安全なpostureへ戻してHOLDする。

contextが切れても、ledger上で`completed`のprovider/DB mutationを再実行しない。re-readとread-only verificationは行い、
writeはidempotency/readbackが証明された場合だけ再開する。

---

## Gate C-0: binding契約改定のfreezeと本人批准

### 6. Wave C0 subagents

- Agent A: 元FAIL/HOLD、immutable probe receipt、cleanup receipt、run digest、SetupIntent lifecycleのread-only監査
- Agent B: Stripe test-mode、Refund→PaymentIntent linkage、dedicated operator、endpoint duplication/security監査
- Agent C: contracts/preflight/audit、hash/privacy、signature chronology、staff PIN再発行計画監査

rootは3者の独立結論が一致するまでprovider callをしない。

### 7. versioned contract amendment v2

次の新規decision recordをhuman-readable Markdownとmachine-readable JSONで作る。timestampを付け、既存HOLDを
変更しない。

```text
website/docs/evidence/vip-floor-v2/gate-c-c7-binding-contract-amendment-v2-<timestamp>.md
website/docs/evidence/vip-floor-v2/gate-c-c7-binding-contract-amendment-v2-<timestamp>.json
```

canonical amendment digestは、3 advisory review完了後・human ratification前にfreezeした最終machine-readable
JSON bytesのSHA-256とする。Markdownは説明用renderingであり、canonical JSON path/SHAを埋め込むが署名対象には
しない。

必須内容:

- `decision=reviewed_contract_amendment`
- original FAIL/HOLD pathとSHA
- old predicateとnew predicateの明示diff
- immutable probe/cleanup receiptのsafe digest
- `rakProbeRerunAllowed=false`
- `replacementRetainedObjectAllowed=false`
- `canonicalDigestAlgorithm=sha256`
- `frozenBeforeProviderRead=true`
- 3 reviewerのrole、result、safe digest
- approval requirementとstop conditions
- userの署名取得申告は最終manifest署名と未検証であること

このhistorical frozen probeだけ、SetupIntentを次の全条件で認定する。

1. immutable probe receiptが同一correlationの作成時status=`requires_payment_method`を記録する。
2. cleanup receiptが親Checkout Session expiry、Customer deletion、cleanup completeを証明する。
3. fresh current readbackで同じprivate run digestのSetupIntentがexactly oneである。
4. current SetupIntentが`livemode=false`かつstatus=`canceled`である。
5. source、receipt、correlation、migration、artifact、provider manifest、deployment 1の各要素が、それぞれの
   frozen digestと一致し、provenanceによって相互に結合されている。
6. replacement、metadata mutation、agent/operatorによるSetupIntentへの直接confirm/cancel/update API call、
   RAK probe rerunが発生していない。既存receiptに記録されたCheckout Session expiryに伴うprovider側の
   `canceled`遷移は期待されたcleanup chronologyであり、違反に数えない。

Refundに`livemode`fieldを要求またはfixtureへ合成しない。Refundは次の全条件でtest境界を認定する。

1. same private run digestのRefundがexactly oneかつstatus=`succeeded`である。
2. private memory内でRefundのnormalized payment referenceがexactly oneの保持PaymentIntentと一致する。
3. そのPaymentIntentが同じrun digest、`livemode=false`、status=`succeeded`である。
4. dedicated operator profileがtest modeであり、元probe receiptもrestricted test/all-test-modeを証明する。
5. public evidenceへはlinkage booleanとone-way digestだけを出し、object IDを出さない。

amendmentをfreezeした後、**次のStripe readより前に**同一人物がOwner roleとEngineer roleで同じcanonical
amendment SHAを別々にreviewする。amendment JSON自体へ批准を追記・再writeせず、別のimmutable evidenceを作る。

```text
website/docs/evidence/vip-floor-v2/gate-c-c7-binding-contract-amendment-v2-ratification-<timestamp>.json
```

ratification evidenceはOwner/Engineerのexactly two role recordsを持つ。両recordは同じreal name、異なる
timezone付き時刻、`RATIFY`/`DECLINE`、same canonical SHA、`OWNER_CONTRACT_RATIFICATION`または
`ENGINEER_SECURITY_RATIFICATION`のrole codeを記録する。Gate summaryからratification fileをhash-linkする。最初の
post-amendment Stripe read timestampは両方の`RATIFY`時刻より後でなければならない。AIやsubagentのACCEPTはこの批准を
代行しない。

いずれかがDECLINE、未検証、異なるSHAなら`CONTRACT AMENDMENT HOLD`で停止する。

### 8. toolingのfail-closed補強

批准後、frozen runtime source、migration、prebuilt artifactを変えず、operator/preflight/audit toolingとtestsだけを
必要最小限修正する。

必須変更:

- SetupIntent creation→cleanup→currentのchronology validator
- Refundのtransitive test-mode/linkage validator
- original HOLD SHAとamendment SHAのvalidator
- separate ratification evidenceのschema/path/hash、Owner/Engineerのsame human/two role records、same digest、
  distinct timestamps、role codes、時系列validator
- dedicated profile、test mode、API-key/default fallback拒否
- exactly 1/1/1、duplicate 0、run digest一致
- source/migration/artifact/provider/deployment provenance一致
- ratificationがStripe readより前であること
- raw IDをretained evidenceへ出さないreducer

READY preflightとGate audit自体が、外側の手順書だけに頼らず次をfail closedで強制するよう補強する。

- dedicated named operator profile、default config/API-key override拒否
- binding contract v2、original HOLD SHA、ratification chronology
- endpoint exactly one、test/enabled/account-scoped、event set/API version一致
- webhook signing secretがstaging-only Sensitive、exactly one、branch bindingなし
- required 26 envのnameだけでなくtype、安全なflag値、duplicate 0
- all 9 application flags off、DB dual-write=false、LINE=false
- deployment 1/2 READY、same exact frozen artifact
- operator/binding/webhook/deployment-pair receiptのhash-link
- authenticated staging DB readbackがpreflight時刻から15分以内
- production/Preview fingerprint unchanged

toolingへ`VIP_FLOOR_STAGING_OPERATOR_BINDING_RECEIPT_PATH`、
`VIP_FLOOR_STAGING_WEBHOOK_RECEIPT_PATH`、`VIP_FLOOR_STAGING_DEPLOYMENT_PAIR_RECEIPT_PATH`、
`VIP_FLOOR_STAGING_FINAL_ALL_OFF_RECEIPT_PATH`の明示入力を追加し、missing/default/stale/private-permission違反を
negative testsで落とす。既存のmeasured staging inputと同様、値やprivate pathをretained outputへ表示しない。

positive fixtureと少なくとも次のnegative fixturesを追加する。

- original HOLD SHA mismatch
- immutable creation receipt missing/stale
- cleanup incomplete
- SetupIntent current status not canceled
- SetupIntent live/unknown mode
- object count不足/過剰/duplicate
- run digest mismatch
- Refund→PaymentIntent link mismatch
- correlated PaymentIntent live/not succeeded
- fake `Refund.livemode`だけでは不合格
- source/migration/artifact drift
- RAK probe rerun marker
- replacement/metadata mutation/direct SetupIntent cancel API invocation marker
- dedicated profileでない
- ratification schema/path/hash missing、same-human/two-role contract不成立、duplicate timestamp、role code不一致、
  different digest、late timestamp
- privacy forbidden class

3 subagentsを担当ローテーションして再監査し、全員ACCEPT、positive/negative全PASSまでStripeへ進まない。

### 9. staff PINの安全な再発行計画

Stripe bindingとは別checkpointとして計画をfreezeする。production credential再発行はこのstaging Gate C権限外。

- 無効化済みcredentialとretired sessionを復活させない。
- named operator 1人につき1つ、least privilege、共有禁止。
- 今回はexactly 8-digitのCSPRNG numeric PINを新規生成する。
- PIN値はOwnerの非記録private terminalで生成・投入し、chat、argv、repo、evidenceへ出さない。
- `VIP_ADMIN_PIN_PROVISION_ENV_FILE`を必須にし、すべてのdefault/別env/一時path fallbackを拒否する。
- env fileはrepository外、0700 private directory配下、mode 0600でなければ拒否する。
- write直前にstaging DB identityがproductionと異なることを再証明する。
- authenticated staging identity digestを必須にし、production identityを拒否する。
- stdout/stderrへPIN、email、display name、admin ID、DB ref、URL、raw provider errorを出さない。
- public evidenceはsuccess、role class、active credential count、old session retired boolean、redacted audit countだけ。
- 漏えい、duplicate、principal/role不明、production疑いで即停止する。
- Gate C終了後のrotate/revoke ownerと期限を明示する。

PIN再発行前にnon-runtime provisioning toolとtestsを上記contractへhardeningする。4-7桁、fallback、PII出力、
production identity、active credential count≠1、old session再有効化をnegative testで落とす。

C0ではplanだけをfreezeする。実行はprovider-bound bootstrap完了後、staff認証が必要なruntime/rehearsalより前の
named `STAFF ACCESS` checkpointに限定する。Ownerが非記録private terminalでsecret生成/投入し、rootは次の値なしの
固定完了文だけを受け取る。

```text
STAFF ACCESS checkpoint complete: staging identity verified; one new least-privilege credential active; prior sessions retired; no credential value shared.
```

その後sanitized read-only DB readbackとstaging preflightを再実行する。必要なoperatorが安全にログインできない場合は、
PIN値を要求せず`STAFF ACCESS HOLD`で停止する。production reprovisionは別承認とする。

---

## Gate C-1: provider-bound staging閉鎖

### 10. Wave C1 subagents

- Agent A: source/migration/artifact/deployment quiescence、Vercel staging 25/26、production/Preview fingerprint
- Agent B: rootが取得したsanitized dedicated-profile binding receiptと既存retained objectsのread-only review
- Agent C: authenticated staging DB、31 migrations、9 Node flags、DB dual-write、preflight/audit contracts

subagentsはsafe reduced outputだけを返す。rootだけがoperator commandを実行する。

### 11. fresh amended binding

次をfreshに再測定する。

- frozen source/migration/artifact/provider manifestのquiescence
- deployment 1 READY
- staging env 25/26、missingがwebhook signing secretだけ
- 9 application flags off、DB dual-write=false
- production/Preview/LINE unchanged
- dedicated operator profileがsame test account/environmentへbinding
- PaymentIntent/SetupIntent/Refund exactly 1/1/1、duplicate 0
- amendment v2のSetupIntent chronologyとRefund linkage
- C7-scoped webhook endpoint count 0
- authenticated staging DB readbackが15分以内

bindingが1項目でもfalseならendpointを作らず`CONTRACT AMENDMENT HOLD`へ戻す。

### 12. webhook → secret → deployment 2の固定順序

rootが次を直列に行う。各write後にreadbackし、同じwriteを再実行しない。

1. C7 endpoint count 0をcreate直前に再確認する。
2. test accountへapproved event set/API versionのendpointをexactly one作る。
3. one-time signing secretをagent outputへ出さず、staging-only Sensitive envへ直接投入する。
4. endpointがtest/enabled/account-scoped、event set/API version一致であることをsafe readbackする。
5. staging env name/type/target/branch bindingを検査し26/26を確認する。
6. frozen `.vercel/output`を再buildせずdeployment 2へ展開する。
7. deployment 1/2のsource/migration/artifact/file manifestが同一であることを検証する。
8. 同じendpointをdeployment 2のtargetへ更新し、replacement endpointを作らない。
9. endpoint count exactly one、duplicate 0を再確認する。
10. authenticated staging DB readbackを再実行する。
11. staging preflightを実行しexit 0、provider-bound READYを確認する。

secretを失った、表示した、endpoint countが0→1以外、deployment 2がsame artifactでない場合は即停止する。
安全に作成済みのsingle endpointを重複回避のため保持し、勝手に削除・再作成しない。

---

## Gate C-2: runtime evidence

### 13. numeric budget human checkpoint

runtime observation前に同一人物がOwner roleとEngineer roleで同じbudget manifestを別々に数値承認する。2つの
approval recordは同じreal name、異なるtimestamp、同じbudget SHA、役割別decisionを持つ。

必須数値:

- shadow処理p95 overhead上限
- event/log volume上限
- log cardinality上限
- 最低観測時間
- completed attributable comparison最低1,000
- synthetic business cycle 2回
- rollback operatorとchange window
- breach時の停止/rollback threshold

承認後にmanifest SHAをfreezeし、観測後に都合よく変更しない。承認がない場合はall-offのまま
`BOOTSTRAP READY / RUNTIME HOLD`とする。

### 14. Wave C2 subagents

- Agent A: source/deployment/Node flags、business-cycle chronology、public/v1 fallback
- Agent B: DB setting/migration/inventory/reconciliation、rollout/rollback、revision evidence
- Agent C: Stripe/webhook/refund/provider expectation、sample/budget/privacy

rootだけがflag/DB/provider-effectを変更する。subagentsはobserver/reviewerである。

### 15. observation前ledgers

外部効果前に次をfreezeして相互hash-linkする。

- source/migration/bootstrap/deployment manifest
- budget approval manifest
- provider expectation ledger
- business cycle ledger
- 8-state transition ledger
- rollback ledger
- privacy scan input manifest

provider expectationには各操作のexpected effect count、allowed creator、idempotency/retry policyを明記する。

no-rerun/no-replacement禁止は、original bootstrap retained cohortとそのprivate run digestへ永久に適用する。
BOOTSTRAP READY後に別承認されたC2 business-cycle objectsは、別のexpectation ledgerとdistinct correlation namespaceで
作成できる。ただしoriginal 1/1/1 cohortを満たす、置換する、修復する、削除する、retagする、変更するために使わない。
C2 objectがbootstrap run digestを使用した場合はnegative fixtureとruntime validatorで即HOLDにする。

### 16. 8状態の時系列

Node flagとDB dual-writeを次の順で記録する。各状態へauthenticated timestamp、全flag値、DB値、revision、
source/artifact digest、provider effect count、readback digestを付ける。

1. `all_off_bootstrap`
2. `db_only`
3. `db_shadow`
4. `both_on_business_cycle`
5. `node_rollback`
6. `restored_all_off`
7. `node_only_invalid`
8. `final_all_off`

exact tupleは次とする。`Node`は事前freezeしたC7許可flag whitelist、`DB`はdual-write、`shadow`はshadow flagを示す。

- `all_off_bootstrap`: Node F / DB F / shadow F
- `db_only`: Node F / DB T / shadow F
- `db_shadow`: Node F / DB T / shadow T
- `both_on_business_cycle`: Node T / DB T / shadow T
- `node_rollback`: Node F / DB T / shadow F
- `restored_all_off`: Node F / DB F / shadow F
- `node_only_invalid`: Node T / DB F / shadow F / failClosed T
- `final_all_off`: Node F / DB F / shadow F

C7中は`FEATURE_VIP_FLOOR_V2_READ_ENABLED=false`、LINE=falseを維持する。both-onで変更可能なNode flagのexact
whitelistを観測前にfreezeし、それ以外のflag変更を拒否する。`node_only_invalid`はfail closedしside effect 0で
なければならない。最後は必ず9 Node flags off、DB falseへ戻す。

Node環境変数の変更ごとに、同じfrozen sourceから新しいimmutable staging deploymentを作り、authenticated runtime
readbackを取る。deployment 2はdeployment 1とsame exact prebuilt artifactとする。以降のruntime posture deploymentは
同一sourceへ結び、各artifact/provenanceを個別に記録する。env編集receiptだけを状態証拠にしない。

### 17. authentic runtime execution

canonical runtime observationを次へ保存する。

```text
website/docs/evidence/vip-floor-v2/gate-c-staging-observation-<timestamp>.json
```

schemaは`vip-floor-gate-c-staging-observation.v1`、
`sampleAttemptsMeaning=completed_attributable_comparisons`とする。2 cycleの完全なsequence、snapshot-race 0、
budget approvalと実測durationの比較、8状態それぞれのdeployment/readback digest、preflight/budget/expectation ledgerの
hash-linkを必須にする。summaryへaggregateをexact copyし、実際に実行した場合だけ
`operations.stagingFlagChanged=true`、`operations.externalProviderCallPerformed=true`を記録する。

- synthetic business cycleを2回実施する。
- card setupとrefundable depositを含める。
- signed webhook success、failure、retry、replay/conflictを検証する。
- unsigned payloadは処理せず拒否する。
- refund workerだけがRefundを作成し、UI/SQL/API request内からStripeを同期呼出ししない。
- provider readbackでexpectation=actual、duplicate effect 0を確認する。
- attributable completed comparisonを1,000件以上取得する。
- shadow success rate 99.9%以上を確認する。
- critical、unknown、privacy、snapshot-race findingを0にする。
- p95/log/cardinality/observation durationを事前budget以内にする。
- rolloutとrollbackの両方を実施する。
- v1 public availability、hold、admin操作fallbackを再確認する。
- production/Preview/LINE fingerprint不変を確認する。
- 全runtime evidenceをcurrent source、migration、artifact、deployment、budget SHAへ結び付ける。

fake counter、fixtureだけのruntime、過去runの転用、timestampの後付けを禁止する。

### 18. runtime reviewと正式署名

runtime observationをfreezeし、通常Gate audit exit 0を確認する。3 subagentsを担当ローテーションして次を独立監査する。

- hash/provenanceとtimestamp chronology
- provider expectation/actual、duplicate 0、refund linkage
- budget/sample/rate/8 states/rollback/fallback
- privacy、summary consistency、production isolation

全員ACCEPT後、summaryのevidence listをfuture signature file以外についてfinalizeし、次を実行する。

```bash
npm run print:vip-floor-v2-gate-c-signature-manifest
```

出力されたexact manifest digestと含有evidenceをfreezeする。その後だけ、3役を担う同一人物へ同じexact manifest
SHAを提示し、Owner、Floor Manager、Engineerの順にsecure local channelで3つのrole decisionを取得する。

- role
- 3 recordで同一のnon-placeholder real name
- timezone-bearing timestamp
- `PASS`または`DECLINE`
- exact evidence manifest SHA
- `samePersonMultiRoleAcknowledged=true`
- role固有attestation code

署名時刻はmanifest freeze/runtime evidenceより後でなければならない。3件PASS後にsignature evidenceだけを追加し、
`signaturesEvidencePath`を設定する。既存auditの署名pathをmanifest計算から除外する非循環方式を使用する。上の
print commandを再実行し、digestが同一であることを確認する。署名依頼後にsignature file以外のevidence path/hashが
変わった場合は全attestationを無効化し、fresh human reviewを取り直す。

signature evidenceはschema `vip-floor-gate-c-signatures.v2`を使い、summaryの`signatureGovernance` objectをexact copy
する。各role recordにも同じmanifest SHAを記録する。

signature timestampがruntime/manifest freeze以前、3 role timestampsの重複、3 recordのname不一致、role code不一致、
signerごとのdigest不一致、evidence hash変更後の署名転用、signature fileの循環包含、governance amendment未結合を
negative testsで落とす。

3件PASS後に通常audit exit 0と`--require-pass` audit exit 0を両方要求する。Gate C summary/statusを
`Gate C PASS / Phase D0 unlocked`へ更新する。

1件でも不足、DECLINE、別SHA、name不一致、timestamp重複、role code不一致、placeholderなら
`RUNTIME READY / SIGNATURE HOLD`で停止する。

### 18.1 Gate C PASS前の専用validation

汎用validationとは別に、disposable PostgreSQL 16だけを使う。validationをpre-sign、human checkpoint、
post-signへ分離し、署名前にrequire-passを実行しない。

#### A. Pre-sign validation

最初にlocal suitesを実行する。

```bash
cd website
export VIP_FLOOR_GATE_C_SUMMARY=docs/evidence/vip-floor-v2/gate-c-summary-20260714.json
npm run ci:local
node scripts/verify-vip-floor-v2-gate-c-contracts.mjs
npm run test:vip-floor-v2-gate-c-bootstrap
npm run test:vip-floor-v2-public-dual-write
npm run test:vip-floor-v2-dual-write
npm run test:vip-floor-v2-dual-write-races
npm run test:vip-floor-v2-rollback
npm run test:stripe-replay
npm run test:stripe-unbound
npm run test:reservation-saga
npm run test:vip-static
npx tsc --noEmit
npm run lint
npm run build
```

次に、private 0600 measured-input fileから値を表示せず、現行preflightが必要とする全ての
`VIP_FLOOR_STAGING_*`を明示的に設定する。少なくともtarget、staging project name、current build/artifact/file
manifest、provider file manifest/provenance、provider verified、deployment metadata match、fresh private DB readback path、
およびtooling補強で追加するoperator-binding、webhook、deployment-pair、final-all-off receipt pathを必須にする。
ambient/default fallbackを拒否し、未設定ならcommand前に停止する。

```bash
: "${VIP_FLOOR_STAGING_VERCEL_TARGET:?measured staging target required}"
: "${VIP_FLOOR_STAGING_SUPABASE_PROJECT_NAME:?measured staging project required}"
: "${VIP_FLOOR_STAGING_BUILD_SHA256:?current final-all-off build digest required}"
: "${VIP_FLOOR_STAGING_ARTIFACT_SHA256:?current final-all-off artifact digest required}"
: "${VIP_FLOOR_STAGING_ARTIFACT_FILE_MANIFEST_SHA256:?current file manifest required}"
: "${VIP_FLOOR_STAGING_PROVIDER_FILE_MANIFEST_SHA256:?provider file manifest required}"
: "${VIP_FLOOR_STAGING_PROVIDER_PROVENANCE_SHA256:?provider provenance required}"
: "${VIP_FLOOR_STAGING_PROVIDER_VERIFIED:?explicit provider verification required}"
: "${VIP_FLOOR_STAGING_DEPLOYMENT_METADATA_MATCHES:?explicit metadata match required}"
: "${VIP_FLOOR_STAGING_DATABASE_READBACK_PATH:?fresh private DB readback required}"
: "${VIP_FLOOR_STAGING_OPERATOR_BINDING_RECEIPT_PATH:?binding v2 receipt required}"
: "${VIP_FLOOR_STAGING_WEBHOOK_RECEIPT_PATH:?webhook receipt required}"
: "${VIP_FLOOR_STAGING_DEPLOYMENT_PAIR_RECEIPT_PATH:?deployment 1/2 pair receipt required}"
: "${VIP_FLOOR_STAGING_FINAL_ALL_OFF_RECEIPT_PATH:?final-all-off receipt required}"
npm run preflight:vip-floor-v2-gate-c-staging
npm run audit:vip-floor-v2-gate-c
npm run print:vip-floor-v2-gate-c-signature-manifest
```

`VIP_FLOOR_STAGING_BUILD_SHA256`とcurrent artifact/provenanceはruntime後のlatest `final_all_off` deploymentを検証する。
歴史的deployment 1/2のsame-prebuilt-artifactは、別のimmutable deployment-pair receiptで検証する。両者を同一deploymentと
誤認しない。env edit receiptだけでcurrent runtime postureを証明しない。

preflight exit 0、normal audit exit 0の後、signature manifest digestをfreezeする。

#### B. Human checkpoint

§18の手順どおり、同一人物がOwner、Floor Manager、Engineerの3 role recordsで同じfrozen manifest SHAへ署名する。
ここではlocal suite、provider mutation、evidence rewriteを行わない。

#### C. Post-sign validation

signature evidenceだけを追加して`signaturesEvidencePath`を設定した後、同じ明示的
`VIP_FLOOR_GATE_C_SUMMARY`とmeasured staging inputsで次を実行する。

```bash
npm run print:vip-floor-v2-gate-c-signature-manifest
npm run audit:vip-floor-v2-gate-c
npm run audit:vip-floor-v2-gate-c -- --require-pass
```

manifest再printがpre-sign digestと同一、normal audit exit 0、require-pass exit 0を要求する。bootstrap contractsの全
positive/negative、snapshot-race 0も前提とする。script名/optionが現行packageと変わっていれば正本を調べて更新し、
存在しない成功を捏造しない。

### 18.2 Gate C provider-evidence hard boundary

Gate C PASS後、次をこの順で行う。

1. Gate C evidence package、summary、audit outputをimmutable freezeする。
2. current status/work logを更新する。
3. provider-evidence sessionを終了する。
4. 新しいsession/WaveでD0以降を開始する。

後続UI変更でruntime source hashが変わっても、旧Gate C evidence/summaryを書き換えず、旧auditが新しいsourceにも
そのままPASSすると主張しない。後続PhaseはGate C PASS時点のfrozen provenanceをancestorとして別manifestへ結ぶ。

---

## Phase D0: UI実装前の契約固定

### 19. Gate C boundary

`--require-pass` exit 0、runtime/source/migration/artifact hash一致、rollback evidence、同一人物による3 role
attestationsをroot自身が
再確認するまでUI sourceを変更しない。

`.Codex/docs/DESIGN.md`がlocal projectで欠落している場合、親workspaceの同名fileを黙って代用しない。

次のどちらかを行う。

1. 正式なlocal design authorityを復元する。
2. 復元不能ならOwner本人が、`website/AGENTS.md`、`website/docs/ui/UI_TOOLKIT.md`、parity matrix、component
   spec、behavior inventory、current venue media/tokensを暫定authorityとするexact digestを承認する。

design authority未確定ならD0 HOLD。

### 20. Wave D0 subagents

- Agent A: v1 source、desktop/mobile証跡、floor media、59項目parityのread-only監査
- Agent B: Next 16 Server/Client、auth/DAL/DTO、URL/parser、privacy境界
- Agent C: capability/control matrix、status vocabulary、a11y/performance/visual test matrix

rootがshared contract、page、feature flags、package/lockfile、global tokensを専有する。

### 21. D0でfreezeするもの

- 既存`VipFloorBoardV2` decoder、command、typed error contractを監査し、別の競合契約を作らない。
- core URL contract: `date`, `view=floor|chart|list`, `reservation`, `table`, `panel`
- view-specific URL contract: `section`, `filter`, `sort`, `zoom`, `from`。全てallowlist/normalizeし、意味のない
  parameterはcanonical URLから除去する。
- URLへprivacy-safe public codeだけを使う規則
- capabilityごとのvisible/disabled/execute matrix
- reservation lifecycle、service status、payment statusを混同しないvocabulary
- v1/v2 read flag、mutation flag、route/API fallback
- GHOST token、row height、focus、z-index、safe-area、motion
- desktop/tablet/mobile component ownership
- CSS Modules ownershipと既存v1 `.vfb-*`非変更

推奨responsive contract:

- desktop: floor map/rail約66/34、reservation rail minimum 360px
- tablet landscape 900px以上: 約60/40、rail 320-360px
- 768-899px portrait: mobile専用IA
- mobile: full chartを無理に縮小せずgrid/listへ変換
- compact navigation rail 56px、必要時のみ88pxへ展開
- dense row 32-40px、主要touch target最低44px、radius 2-8px

visual language:

- black-violet lacquer、champagne metal hairline、実floor geometry、ticket/receipt detail
- LEDは状態/導線に意味がある箇所だけ
- 高密度、scanability、exception/audit優先
- AI glass、purple/blue orb、bokeh、floating translucent card、nested card、白灰青SaaS、過剰radius禁止

D0 Gateではdesign authority、URL、contract、status、capability、fallback、responsive ownershipのdecision SHAと、
current v1 desktop/mobile fallback screenshots/hashを保存する。

---

## Phase D1: v2 read-only shell

### 22. Wave D1 ownership

- Agent A: `vip-floor-v2/shell/**`
- Agent B: workspace/state/api clientのowned paths
- Agent C: shared presentational components/unit tests
- root: `page.tsx`、server auth/DTO/fetch、public exports、shared integration

### 23. D1 requirements

- pageをasync Server Componentとして保つ。
- Next 16 `searchParams`をawaitし、URL valuesをallowlist/normalizeする。
- serverでsession、role、v2 read flagを検証する。
- flag offならcurrent v1 `VipFloorDashboard`をそのままrenderする。
- flag onならloopback API fetchを避け、server-only DAL/DTOからinitial sanitized board snapshotを直接取得する。
- request内の重複auth/session readをdedupeし、最小serializable DTOだけClientへ渡す。
- server-only moduleをClientからimport不能にする。
- API routeはUIとは独立して毎回auth/capabilityを検証する。
- initial boardをfirst renderへ使い、独立readは並列開始する。
- date/view変更でobsolete requestをabortする。
- Client stateをdate/view/selection/panel/filter/pending/reconcileに限定する。
- chart/listはClient wrapper内でdynamic loadする。
- mutation flag offではcontrolを非表示または確実にdisabledにする。
- 営業日navigation、floor/chart/list切替、search、compact filterを実装する。
- status rail、board revision、stale/refreshを表示する。
- 実floor geometry、reservation selection、read-only detailを実装する。
- loading、empty、unauthorized、403、error、feature-disabledを実装する。
- skip link、landmark、visible focus、concise live regionを実装する。

D1 Gate:

- 1440×900、1024×768、768×1024、390×844
- first viewportでGHOST Osaka、営業日、現在状態、主要view、実floor、主要actionを理解できる
- body-level horizontal scroll 0
- keyboard-onlyでdate/view/search/selectionへ到達
- reload/back/forwardでURL state復元
- v1 fallback visual/behavior unchanged
- Client payloadにsecret、ciphertext、provider ID、raw audit、unneeded PIIなし

reference/actual/diff screenshotsを各viewportで保存し、3 subagentsのcross-reviewを通す。

---

## Phase D2: TableCheck型 Floor / Chart / List

### 24. Wave D2 ownership

- Agent A: `floor/**`
- Agent B: `chart/**`
- Agent C: `list/**`
- root: shared selection/revision/URL integration、cross-view fixtures

### 25. Floor

- 約66/34 map + persistent reservation rail
- GHOST実floor形状
- table selectionとreservation selectionを別状態として扱う
- 最大3回転、複数卓、未配席、block、restriction、memo、staff cue
- reservation/finished/block tabs
- waitlist/staffはPhase E前にはfeature-disabled shellだけを表示し、fake dataや未実装操作を出さない
- statusを色だけで表現しない
- table nodeにaccessible nameを付ける

### 26. Chart

- semantic table×time grid
- dense row 32-40px、15/30分zoom
- current-time line、reservation/block bars
- unassigned/no-show/cancelled/deleted trays
- overnight、turnover、collision
- horizontal scrollはtimeline container内だけ
- mobileではfull desktop chartを表示しない
- 500 bars fixtureでwindowingの必要性を計測して決める

### 27. List

- desktopはcard pileでなくsemantic table
- sticky header、固定重要列
- start、pax、tables、customer、memo、created、lifecycle/service/payment/status
- sort/filter/search
- stable dense row
- 50件超は計測後にvirtualizationまたは`content-visibility`
- intentional table container以外の横scrollを禁止

D2 Gate:

- 3画面が同じfixture、selection、boardRevisionを共有する。
- view変更後もdate/selection/filterを保持する。
- browser back/forwardで復元する。
- 複数回転、未配席、block、overnight、延長表示が一致する。
- D2開始前にparity matrixのin-scope item IDsをfreezeし、そのcore項目100%。E/F/G対象をD2 PASSへ混ぜない。
- v2 mutation flag offのままvisual/read parityを通す。
- 各viewportのreference/actual/diffを保存する。

---

## Phase D3: 現場操作

### 28. Wave D3 ownership

- Agent A: interactions、floor/chart drag/resize adapter
- Agent B: reservation detail/form、conflict diff
- Agent C: dialogs/ops、lifecycle/cancel/block/walk-in
- root: command dispatcher、API shared integration、feature gates

### 29. risk順の接続

1. confirm
2. assign/reassign/add/remove/unassign
3. check-in/service status
4. 時刻変更/滞在時間変更/着席延長
5. walk-in
6. non-recurring block作成/更新/取消
7. server-persisted note
8. cancel/refund decision
9. authorized customer update

全commandへ次を要求する。

- capability
- `expectedVersion`
- Idempotency-Key
- request ID
- actor/reason
- pending state
- typed error
- response後のboard reconciliation
- 同じuser-visible retryでは同じidempotency key
- destructive commandのoptimistic commit禁止
- offline queue/replay禁止
- 409でattempted valuesを保持し、server diff、reload、explicit retryを提示

reservation detail/formはcustomer/reservationの2ペインを基本とし、reservation、payment、images、audit、POSの
各tabをcapabilityに応じて表示する。capability別にmasked customer summaryを使い、date/time/duration/pax/status/
source/purpose/tables/flags/notes/ordersを一貫したcontractで扱う。全fieldにvisible label、適切な`type`、
`inputmode`、`autocomplete`を設定し、field error、first-error focus、dirty/unsaved guard、409 conflict diffと入力保持を
実装する。権限のないPIIやprovider detailをDOMへ送らない。

drag/resize:

- pointer/touch/keyboard sensors
- button/formによる同等代替
- collision warning、drop preview、contained auto-scroll
- drag中のtext selection抑制
- concise live announcement
- Escape cancelとfocus return

cancel/refund:

- impact summary
- reason classification/note
- payment/refund posture
- explicit confirmation
- Stripe同期呼出し禁止、refund case/workerへhandoff

quality Gate:

- dragとbutton/keyboardが同じcommand envelopeを発行
- mutation後に3 viewが同じrevisionへ収束
- 401/403/409/422/429/5xx/offline recovery
- focus trap、Escape、focus restore
- non-color status、reduced motion、long Japanese/English labels
- important touch target 44px以上
- body horizontal scroll 0
- LCP ≤2.5s、INP ≤200ms、CLS ≤0.1
- 80 tables、500 chart bars、1,000 list rows
- Floor ManagerによるP0 core staging rehearsal
- v1 fallback/rollback rehearsal

human rehearsalをAIが代行しない。Floor Manager本人のrole、時刻、scenario、result、evidence SHAを得る。

---

## Phase E: 高度運用

### 30. data-first rule

順番待ち、通知、staff割当、service period、online acceptanceはUIより先にadditive data/RLS/RPC/API/outboxを実装する。

Wave E0: service context contract freeze

- Agent A: service period/day memo/online acceptance vocabulary
- Agent B: recurring block/waitlist/notification lifecycle
- Agent C: capability/privacy/retention/outbox boundaries
- root: shared contract/decision integration

Wave E1:

- Agent A: schema/RLS/version/audit
- Agent B: RPC/outbox/worker/idempotency
- Agent C: API/contracts/fixtures/security review
- root: migration integration/apply、shared types、Gate

Wave E1b: dossier/contact/attachment

- Agent A: encrypted customer dossierとcontact activity contract
- Agent B: attachment metadata/scan/retention worker contract
- Agent C: API redaction/capability/fixtures
- root: shared integration、migration/apply、Gate

Wave E2:

- Agent A: waitlist/notify/seat UI
- Agent B: service period/online acceptance/recurring block UI
- Agent C: staff assignment/overlay UI
- root: shared integration/release flags

必須:

- waitlist add/contact/accept/seat/cancel lifecycle
- notification transactional outbox
- DB triggerからexternal providerを呼ばない
- raw contactをoutbox/logへ保存しない
- admin capabilityとstaff operational profileを分離
- notification failureでもqueue stateを失わない
- recurring block materializationの再実行でduplicate 0
- LINEは別Gate、default off
- customer dossier/contact activity/attachment metadataはencryption、scan、retentionを契約化

---

## Phase F: 配席提案 / CSV・Excel・印刷 / POS adapter

### 31. Wave F ownership

Wave F1: optimizer

- Agent A: deterministic placement candidate generator
- Agent B: suggestion/apply RPC、version recheck、audit
- Agent C: floor/chart suggestion overlay
- root: shared constraints、integration、Gate

Wave F2: export/print/POS

- Agent A: CSV/Excel encoding、formula injection、redaction
- Agent B: print contract/layout/capability
- Agent C: vendor-neutral POS adapter/outbox/reconcile UX
- root: provider boundary、shared integration、Gate

必須:

- suggestion onlyから開始し、自動commitしない。
- hard constraint違反0。
- managerだけがbatch applyできる。
- stale suggestionを拒否する。
- score理由、採用/拒否をauditする。
- manual assignmentへ常に戻れる。
- CSV formula injection、encoding、capability、PII redactionを検証する。
- Excel/printは権限とredactionを同じ契約へ従わせる。
- POSはvendor-neutral adapter + outbox/retry/dead-letter/reconcile。
- provider未設定時は安全な`not configured`。
- POS障害中もboard主要操作を継続する。

---

## Phase G: Realtime / 複数端末 / 切断復帰 / 品質

### 32. Wave G ownership

Wave G1: mobile/tablet

- Agent A: mobile table grid、4-item bottom navigation、touch/safe area
- Agent B: mobile fixed-row list、step form、tablet split/orientation
- Agent C: sticky date/view/status、selection-driven primary action、detail bottom drawer
- root: responsive shared state/integration、Gate

Wave G2: accessibility/input

- Agent A: keyboard/focus/dialog/live-region/non-color status
- Agent B: form labels/errors/zoom/long-label/reduced-motion
- Agent C: pointer/touch/keyboard parityとautomated a11y fixtures
- root: shared primitives/integration、Gate

Wave G3: performance/realtime/multi-device

- Agent A: day revision realtime/reconnect/polling fallback
- Agent B: performance/load/windowing/bundle
- Agent C: multi-device conflicts/disconnect/recovery fixtures
- root: shared state、bundle、Gate

必須:

- entity payloadでなくday revision通知を配信する。
- disconnect時にvisible stale + polling fallback。
- 2端末競合は片方だけ成功し、敗者がdiff/reload/retryで回復する。
- offline mutationを自動replayしない。
- keyboard-onlyでsearch/detail/assign/status/cancel。
- semantic buttons/links/tables/forms。
- icon-only controlへaccessible name。
- visible focus、dialog focus trap、Escape、focus restore。
- concise live region、non-color status、reduced motion、200% zoom。
- long Japanese/English labels、`Intl.*`日時/数値。
- first-error focus、unsaved-change warning。
- mobileはsticky date/view/status、選択に応じた固定primary action、detail bottom drawerを持つ。
- desktop 2ペインを単純に縦積みせず、390px first viewportで主要actionを常に確認できる専用IAにする。
- 80 tables、500 chart bars、1,000 list rows、100 waitlist、30 staff、500 audit events。
- drag中にboard全体をrerenderしない。
- non-urgent filterへtransition/deferredを検討する。
- transform/opacity中心のmotion。
- chart/list dynamic loadとbundle budget。
- LCP ≤2.5s、INP ≤200ms、CLS ≤0.1。
- board read p95 ≤800ms、ordinary mutation p95 ≤1,000ms、drag feedback ≤100ms目標。

追加viewport: 1200×721、375×812。ChromeとSafari相当で検証する。

---

## Phase H: staging → canary → production

### 33. 本プロンプトが自動で越えないrelease authority

production mutation前に、exact release manifest、change window、rollback operator、canary scopeへOwner本人の新しい
明示承認を得る。Gate C署名をrelease署名へ流用しない。承認がなければstaging完了状態で`RELEASE HOLD`する。

### 34. Wave H subagents

- Agent A: release manifest、deployment/source/migration/flag provenance
- Agent B: WAF、signed webhook、provider effects、security/privacy
- Agent C: operational rehearsal、rollback、monitoring/budget、Go/No-Go evidence
- root: production/canaryの唯一のoperator、Gate判定

### 35. rollout順序

1. local reset/shadow
2. staging flags off
3. staging v2 read-only
4. Floor Manager full release-candidate read-only rehearsal
5. staging mutation + dual-write
6. signed webhook/refund/external worker test mode
7. staging rollback rehearsal
8. production additive deployment、全flag off
9. production shadow
10. Owner/Manager read-only canary
11. 1端末/1shift mutation canary
12. staff段階展開
13. advanced operations個別展開
14. stability window完了後だけlegacy cleanup判断

各段階で切替直後、15分、2時間、営業終了後、24時間後のcheckpointを記録する。最低観測時間がこれより長い場合は
長い方を採用する。

### 36. release Gate

- D0からGまでの全Gate PASS
- parity matrixの全in-scope item PASS
- WAF ruleのauthenticated readback
- WAF経由signed webhook成功
- public availability/hold/admin fallback
- provider duplicate 0
- Node/DB flag alignment
- privacy/secret/provider ID leak 0
- 同一人物によるOwner、Floor Manager、Engineerの3 role-specific final Go records
- rollback rehearsalとoperator availability
- canary budget内
- exact release manifest SHA
- stability windowの事前承認済み期間、成功条件、incident基準

即時rollback条件:

- assignment/inventory差分
- version/revision anomaly
- duplicate reservation/refund/notification
- signed webhook failure増加
- public availability不整合
- PII/secret/provider leak
- Node/DB flag misalignment
- operatorがprimary workflowを完了不能
- 継続的budget超過

rollback順:

1. v2 UI/read off
2. mutation off
3. Node public v8 route off
4. v1 availability/hold/admin確認
5. DB dual-write off
6. additive migration/rows/auditは保持
7. offline reconcile後だけ再開

安定期間完了後、Ownerの別承認を得た場合だけlegacy cleanupを行う。cleanup前にusage 0、rollback window closed、
backup/restore rehearsal、data retention、v1 route removal planを再監査する。未承認なら
`FULL REPRODUCTION COMPLETE / LEGACY CLEANUP DEFERRED`を正しい完了状態とする。

---

## 37. validation matrix

各Waveでscopeに応じて実在script名を`package.json`から確認し、rootが直列実行する。最低限:

```bash
npm run verify:vip-floor-v2-schema
npm run test:vip-floor-v2-rpc
npm run test:vip-floor-v2-api
npm run test:vip-floor-v2-api-contract
npm run test:vip-floor-v2-dual-write
npm run test:vip-floor-v1-v2-compare
npm run test:vip-customer-crypto
npm run test:stripe-replay
npm run test:stripe-unbound
npm run test:reservation-saga
npm run test:vip-static
npx tsc --noEmit
npm run lint
npm run build
```

存在しないscript名を成功したことにしない。Playwright、axe、DnD、virtualization packageを使う前にdirect dependencyを
確認する。追加が必要ならrootだけがpackage/lockfileを変更し、bundle impactと理由をdecision recordへ残す。

DB fixtureはisolated disposable PostgreSQL 16で行い、productionへfixtureを適用しない。UI変更時は
1440×1024を含む全target viewportのactual screenshotを目視し、reference/actual/diffを保存する。自動pixel diffだけで
visual PASSにしない。

既存相当がなければrootが各Phaseの最初に次のharness/scriptを追加し、該当Gateで全てexit 0を必須にする。

- UI component/reducer contract tests
- Playwright E2E
- visual regression
- automated accessibility
- load/performance
- v1 fallback/rollback

test packageがdirect dependencyでなければ、追加理由、version、bundle/runtime非混入、lockfile差分をrootがreviewする。

各Waveで次を保存する。

- task/agent ledger
- dirty manifest
- contract/source/migration/artifact digest
- commandsとreal exit code
- positive/negative fixture result
- reference/actual/diff screenshots
- privacy scanとnegative control
- fallback/rollback result
- human checkpoint record
- open riskと次action

privacy scanは少なくともsecret class、auth header、cookie、URL/query、provider/account/project/deployment identifiers、
private paths、raw webhook、customer PII、ciphertext/nonce/free-form noteをfail closedで検査する。

### 38. 完了報告

最終回答はsanitized factsだけで構成する。

- terminal outcome
- 完了Gate/Phaseと未完了項目
- original HOLD preserved、amendment digest ratification result
- RAK rerun=false、replacement object=false
- Gate C provider-bound/26-of-26/same-artifact/duplicate 0/preflight/audits
- runtime sample/rate/budget/provider/8 states/rollback
- single-operator 3 role attestationsのrole別resultとsame-manifest判定
- D0-D3/E-Gのacceptance result
- viewport/a11y/performance/rehearsal result
- release/canary/WAF/signed webhook/final Go/rollback
- final flag/DB postureとproduction/Preview/LINE境界
- changed files、evidence、validation exit codes
- exact HOLD reasonまたはnext authorized action

secret、credential、URL、query string、provider/account/project/deployment ID、raw logs/responses、PII、private pathを
報告しない。完了していないhuman actionを推測・代筆しない。

## Prompt ends

---

## 公式Stripe契約根拠

- PaymentIntent object: <https://docs.stripe.com/api/payment_intents/object>
- SetupIntent object: <https://docs.stripe.com/api/setup_intents/object>
- Refund object: <https://docs.stripe.com/api/refunds/object>
- SetupIntent cancellation: <https://docs.stripe.com/api/setup_intents/cancel>
- Checkout Session expiration: <https://docs.stripe.com/api/checkout/sessions/expire>
- Webhooks: <https://docs.stripe.com/webhooks>
- Restricted keys: <https://docs.stripe.com/keys/restricted-api-keys>

## 本書作成時の境界

本書は、Owner決定候補、Engineer/セキュリティレビュー結果、one-time RAK/replacement可否を実行契約へ固定した。
Owner/Engineerのrole別exact digest批准、provider操作、runtime観測、single-operator 3 role final attestations、UI実装、
releaseはまだ実施していない。
