# GHOST Osaka VIP Floor Owner承認済み Gate C runtime → Phase H 完全実装プロンプト

作成日: 2026-07-15 JST

目的: runtime budget v2のOwner承認済みcheckpointから再開し、Engineer承認、Gate C runtime証跡、
同一人物による最終3役attestation、Gate C PASS、D0-D5現場UI、Phase E-G高度運用、Phase H releaseまでを、
安全に停止・再開しながら一気通貫で完了する。

本書の終点: staging full parity、明示承認後のcanary/production安定化、または正直なrelease HOLDまで。
legacy cleanupは本体完成後の別承認とし、未承認ならdeferredを正しい完了状態とする。

ファイル名は既存参照を壊さないため`...to-d3...`のまま保持するが、本書の正本範囲はPhase Hまでである。

## 現在地

- binding amendment批准: 完了
- provider-bound staging: READY
- Stripe test webhook: exactly 1
- staging environment: 26/26
- deployment 1/2: 同一frozen artifact、deployment 2 READY
- endpoint: deployment 2へ既存1件だけ更新済み
- READY preflight: exit 0
- normal Gate C audit: exit 0、HOLDとしてvalid
- require-pass audit: exit 2
- runtime budget v2 Owner承認: 完了
- runtime budget v2 Engineer承認: 未完了
- runtime mutation: 未承認、未開始
- runtime evidence/final manifest/final 3 role attestations: 未生成
- .Codex/docs/DESIGN.md: 欠落
- v2 UI source: 未実装

## 承認済み・凍結済みSHA

- binding amendment:
  ea36da8d20673196e1cd5ad05232de42f09e8ea7e998bb37e3137d082f464939
- binding ratification:
  e7b71d5198ab07115db4bc07aeb590300f1a18c93de638246e73863d23ac2083
- frozen runtime source:
  3f8ce66ca59ebd337035ae6abbcd22f501d0e42c5ef30fcacf0d2e5ccc93ee37
- migration bundle:
  c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272
- frozen artifact:
  b4026d4558f6acd21712a5842fc2956012f5632895f8351f56b4998634085d46
- deployment pair evidence:
  09594f70ec57428a15d74c0e8abeff1fa95a5829ca320fe06b8fd71514a1070e
- provider-bound READY evidence:
  0146329805088f2c171676b374f7e12e88b3b8b67d9b9e0d303cd4967537727f
- READY preflight:
  beb986a3399bcb335a62611a0c44bb66f589beaafa4b139dbccdaa7300197d92
- runtime budget proposal v2:
  ffd1402c945fdae5ac1b276785ad08aaebad58fc10a01b65a5168cdec5dabf37
- runtime budget Owner checkpoint:
  e8428a8126b16dd572f783d1c14ed0959355c2c29fad097dfa4aeb16f39cfb8d

## 次にやるべき作業タスク

1. Engineer本人がruntime budget v2の同じSHAを別メッセージで承認する。
2. Owner/Engineerのordered approvalを最終budget ratification evidenceへfreezeする。
3. frozen sourceを変えず、専用runtime collectorとschema-aware privacy scannerを実装する。
4. C2 provider expectation ledger、private correlation map、test-only readback toolを実装する。
5. 8状態のflag/DB/deploy/webhook-rebind/readback orchestratorをjournaled state machineとして実装する。
6. 2時間window、60秒rollback開始、10分rollback完了watchdogを実装する。
7. card_setup/refundable_depositの2 authentic cycle runnerを実装する。
8. webhook success/invalid/failure/retry/replay/conflictとrefund-worker readback harnessを実装する。
9. v1 availability/seat/hold/admin fallback、Node-only fail-closed、Production/Preview/LINE不変性を機械検証する。
10. 全tool/ledger/negative fixtureをfreezeし、3 read-only reviewersのACCEPTを得る。
11. absolute change window、rollback operator、pre-mutation manifestをfreezeする。
12. Owner本人からexact pre-mutation manifestへのruntime execution authorizationを得る。
13. 8状態、2 cycles、30分以上、1,000 comparisons以上をstaging限定で実行する。
14. final all-off、fresh READY preflight、runtime observation、privacy scanを閉じる。
15. normal auditでruntimeReady/runtimeEvidenceReadyをtrueにする。
16. 非署名evidence manifestをfreezeする。
17. Owner → Floor Manager → Engineerの順で同じmanifest SHAへ本人attestationを得る。
18. normal audit exit 0、require-pass exit 0でGate CをPASSにする。
19. provider evidence sessionを終了し、別WaveでD0を開始する。
20. DESIGN.md復元またはOwner承認の代替design authorityをfreezeする。
21. D0でboard/URL/capability/status/fallback/token/responsive契約を固定する。
22. D1 read-only shellを実装する。
23. D2 Floor/Chart/Listの3画面を実装する。
24. D3の現場操作をリスク順に接続する。
25. desktop/tablet/mobile、a11y、性能、v1 fallback/rollbackを検証する。
26. Floor Manager本人がstaging現場リハーサルを行う。
27. D4で専用mobile/tablet IAを完成させる。
28. D5でvisual/a11y/performance Gateを閉じる。
29. Phase Eでwaitlist、service period、online acceptance、recurring block、staff、dossier/outboxをdata-first実装する。
30. Phase Fでplacement suggestion、CSV/Excel/print、vendor-neutral POS adapterを実装する。
31. Phase Gでrealtime、複数端末競合、切断復帰、load hardeningを完了する。
32. exact release manifestへのOwner本人承認後だけPhase H canary/productionを実行する。
33. stability windowを閉じ、legacy cleanupは別承認の有無に応じてcompleteまたはdeferredとする。

---

## Prompt starts

あなたはGHOST Osakaの現場向けVIP Floor Boardを、現在のGate C HOLDからPhase Hまで安全に仕上げるprimary
implementation agentである。workspace rootは次である。

    /home/kokoro/projects/clients/ghost

長時間・複数sessionでも、evidence ledgerから再開する。完了済みprovider mutationを繰り返さない。
active system/developer instructionとユーザーの明示権限を優先する。subagentが明示許可されていない環境ではspawnしない。
既存Gateが3 independent reviewsを要求する場合、許可された独立reviewを取得するか`REVIEW HOLD`とし、rootが3人分を
代筆しない。provider/DB/deploy/secret/shared contract/human checkpointはrootだけが直列に扱う。

TableCheckの商標、ロゴ、CSS、非公開コード、非公開アルゴリズム、顧客データはコピーしない。公開情報から確認できる
情報構造、密度、操作モデルだけを参考にし、visual languageはGHOST Osaka固有にする。

### 1. truthful terminal outcomes

次のいずれかまで進め、未達を隠さない。

1. ENGINEER BUDGET APPROVAL HOLD
2. ENGINEER BUDGET REJECTED
3. RUNTIME TOOLING HOLD
4. RUNTIME EXECUTION AUTHORIZATION HOLD
5. RUNTIME EXECUTION AUTHORIZATION DENIED
6. RUNTIME HOLD / SAFE ALL-OFF
7. RUNTIME READY / SIGNATURE HOLD
8. GATE C FINAL ATTESTATION FAIL
9. GATE C PASS / PHASE D0 UNLOCKED
10. D0 DESIGN AUTHORITY HOLD
11. PHASE D1 HOLD
12. PHASE D2 HOLD
13. PHASE D3 HOLD
14. D3 UI IMPLEMENTED / FLOOR MANAGER REHEARSAL HOLD
15. D5 CORE UI PASS / ADVANCED OPERATIONS PENDING
16. PHASE E-G HOLD
17. STAGING FULL PARITY PASS / RELEASE HOLD
18. CANARY HOLD / SAFE FALLBACK
19. FULL REPRODUCTION COMPLETE / LEGACY CLEANUP DEFERRED
20. FULL REPRODUCTION COMPLETE / LEGACY CLEANUP COMPLETE

通常audit exit 0、provider READY、AI review、一般的な「承認」をGate C PASSや本人署名と混同しない。
明示REJECT/DENYを承認待ちHOLDとして隠さない。最終roleがFAILならsummary decision=FAILとし、blockerへroleと
sanitized reason digestを記録する。PASS signature evidenceを作らず、require-passをexit 0にしない。再審査には原因修正、
new manifest freeze、Ownerから3役全attestationの再取得が必要である。

### 2. 最初にroot自身が読む正本

正本解釈を他者へ丸投げしない。

- AGENTS.md
- docs/AI_AGENT_SYNC.md
- docs/AI_CURRENT_STATUS.md
- docs/AI_WORK_LOG.mdの最新行
- website/AGENTS.md
- website/docs/ui/UI_TOOLKIT.md
- .Codex/docs/DESIGN.mdの存在確認
- 本プロンプト
- website/docs/research/tablecheck-vip-floor-phase-c-gate-c-ui-implementation-plan-2026-07-14.md
- website/docs/research/tablecheck-vip-floor-reproduction-spec-2026-07-14.md
- website/docs/evidence/vip-floor-tablecheck/parity-matrix.md
- website/docs/evidence/vip-floor-tablecheck/component-spec.md
- website/docs/evidence/vip-floor-tablecheck/behavior-inventory.md
- website/docs/evidence/vip-floor-v2/gate-c-staging-operator-runbook.md
- website/docs/evidence/vip-floor-v2/gate-c-summary-20260715.json
- runtime budget proposal v1/v2とOwner checkpoint
- Gate C preflight/audit/contracts/orchestrator/deploy scripts
- Stripe webhook/refund/shadow/public compatibility runtimeとworkers
- website/src/lib/vipFloorV2Contract.ts
- website/src/lib/server/vipFloorV2.ts
- website/src/lib/server/vipFloorV2Commands.ts
- /admin/vip-floor page、v1 dashboard、v2 API routes
- website/src/app/globals.cssのGHOST tokensと既存v1 .vfb scope
- applicable Stripe security skill、frontend design skill、React/Next performance skill

Next.js UI変更前にinstalled website/node_modules/next/dist/docsから、現行versionのServer/Client Components、
Layouts and Pages、Fetching Data、Caching、Route Handlers、Lazy Loading、Forms、Accessibilityを読む。
training memoryよりlocal installed docsを優先する。

### 3. current state invariants

次は完了済みであり、作り直さない。

- binding amendment/ratification
- bootstrap retained PaymentIntent/SetupIntent/Refund 1/1/1
- one-time RAK probe
- webhook endpoint exactly 1の作成
- signing secretのstaging Sensitive投入
- env 26/26
- deployment 1/2
- endpointのdeployment 2 URL更新
- final provider readback
- fresh DB all-off readback
- READY preflight
- Owner runtime budget approval

禁止:

- original bootstrap cohortのupdate、retag、metadata変更、削除、replacement
- original SetupIntentへの直接confirm/cancel/update
- one-time RAK probe再実行
- webhook endpointの再作成またはsecret rotation
- deployment 1/2の再実行
- default Stripe profileまたはAPI-key override fallback
- live Stripe、production、Preview、LINE mutation
- secret、URL、query、provider ID、account/project/deployment identity、PII、private path、raw responseの共有出力
- unrelated dirty worktreeのreset/clean/revert
- AI proxy、placeholder、historic approvalの再利用

raw provider/private correlation/client secret/session cookieはrepository外0700 directory、0600 regular non-symlink
filesだけに置く。公開evidenceはhash/count/boolean/categoryだけにする。

### 4. subagent execution contract

各Waveで3つのbounded taskを作る。

- Agent A: chronology/contract/provenance
- Agent B: provider/runtime/idempotency/rollback
- Agent C: security/privacy/audit、UI Waveではdesign/a11y/performance

task packetにはObjective、frozen inputs、owned paths、forbidden paths/actions、fixtures、validation、evidence、
definition of doneを含める。subagentはprovider call、DB write、deploy、secret操作、shared file編集をしない。
rootが1件ずつreview/integrateする。同じbuilderだけで最終acceptしない。

各Wave開始前後にcurrent status/work logを同期し、60秒以上ユーザーを無更新にしない。

---

## Gate C Runtime R0: Engineer numeric budget approval

### 5. Owner checkpointを検証

次をexact bytesで検証する。

- proposal v2 SHA:
  ffd1402c945fdae5ac1b276785ad08aaebad58fc10a01b65a5168cdec5dabf37
- Owner checkpoint SHA:
  e8428a8126b16dd572f783d1c14ed0959355c2c29fad097dfa4aeb16f39cfb8d
- Owner decision=APPROVE
- role code=OWNER_RUNTIME_BUDGET_APPROVAL
- directHumanMessage=true
- aiProxy=false
- approval scope=numeric only
- runtimeMutationAuthorized=false

v1 proposalはsuperseded済みであり批准対象にしない。

### 6. Engineer human checkpoint

Owner checkpointからEngineer承認を推論しない。別のユーザーメッセージで次を得る。

    実名: Ownerと同じ実名
    Role: Engineer
    Decision: APPROVE
    Budget Proposal SHA: ffd1402c945fdae5ac1b276785ad08aaebad58fc10a01b65a5168cdec5dabf37
    Role code: ENGINEER_RUNTIME_BUDGET_APPROVAL
    samePersonMultiRoleAcknowledged: true
    Approval scope: numeric_runtime_budgets_only_not_runtime_mutation_authorization

Ownerより後の異なるtimezone付き時刻を記録する。受領後、proposal/Owner checkpoint/Engineer recordを結ぶ別の
immutable budget ratification JSONを作る。proposal自体へ署名を追記しない。

この批准完了だけではruntime mutationを開始しない。

---

## Gate C Runtime R1: evidence toolchain implementation

### 7. frozen tooling boundary

binding amendmentが次の既存5 filesのSHAを固定している。

- scripts/lib/vip-floor-gate-c-stripe-operator.mjs
- scripts/orchestrate-vip-floor-v2-gate-c-webhook.mjs
- scripts/preflight-vip-floor-v2-gate-c-staging.mjs
- scripts/audit-vip-floor-v2-gate-c.mjs
- scripts/verify-vip-floor-v2-gate-c-bootstrap-contracts.mjs

これらを黙って変更しない。新しいruntime evidence toolingはversioned additive filesとして作り、package.json、
package-lock.json、src、migrations、frozen artifactを変更しない。

既存locked file、runtime source、package、migrationの変更が不可避なら即HOLDし、変更前後SHA、理由、影響を持つ
versioned tooling/runtime amendmentを作り、必要な再build/preflight/budget approval/Owner+Engineer批准を取り直す。

### 8. dedicated collector

既存repoには専用runtime collectorがない。新規versioned collectorを実装し、source SHA、fixture SHA、negative
fixture SHAをfreezeする。

collector contract:

- exact READY staging deploymentのlog envelopeだけを対象にする
- event nameはVIP Floor shadow comparisonだけ
- schemaVersion=1
- mode=runtime-sample
- servedContract=v1またはv2
- seven classification countsの合計がexactly 1
- migration headとdeployment/source lineageが一致
- C2用にfreezeしたbusinessDateHash allowlistと一致
- runIdでdeduplicate
- observation window外を除外
- raw logsはprivate 0600
- public outputはaggregateとdigestだけ
- upstream requests、scheduled attempts、completed events、concurrency skips、collector lossesを別々に数える
- sampleAttemptsはcompleted attributable comparisonsだけ
- 100% sample、single-flight/pacedを原則とし、前のcompletion eventを確認してから次request
- completion欠損はcollectorLoss=1として即abort
- durationMsはperformance.now計測値
- p95はnearest-rank、sorted ascending、index=ceil(0.95*n)-1
- cardinalityはbudget proposal v2のtupleで数える

provider log envelopeからexact deploymentを証明できない、またはone request/one completion attributionが証明できない
場合は実行を止める。runtime instrumentationを追加してfrozen sourceを変えることを自動選択しない。

### 9. schema-aware privacy scanner

canonical-key denylistだけで済ませない。新規scannerとnegative fixturesを実装する。

検出対象:

- secret/API key/signing secret/client secret
- Authorization/Cookie/session
- URL/query/private path
- provider/account/project/deployment/object ID
- customer PII
- ciphertext/nonce
- note/free-form body
- raw webhook/provider payload

scanner source SHA、fixture set SHA、input manifest SHA、result SHAを結ぶ。negative fixtureが確実にFAILすることを証明する。
public ledger/receipt/observation/collector aggregateを全件scanする。

### 10. provider expectation ledgerとC2 boundary

external effect前にimmutable ledgerを作る。期待値を実測後に合わせない。

二つのcycle:

- card_setup
- refundable_deposit

applicableなCustomer、Checkout Session、SetupIntent、PaymentIntent、Refund、webhook delivery/queue/worker、
refund case/job/worker categoryをsourceから列挙する。各categoryにexact expected integer count、owner path、
idempotency key owner、retry policy、test-mode assertionを持たせる。non-applicable categoryは理由付きで事前記録する。
wildcardは禁止。

bootstrap cohortと異なるC2 namespace digestをfreezeする。private correlation/object mapはrepository外だけに置く。
bootstrap run digest/objectをC2へ使わない。

list/retrieve-only C2 provider readback toolを新規実装する。

- dedicated test operator profileのみ
- test mode/same account/linkage/statusを確認
- expected=actual
- duplicate=0
- raw IDsを出力しない
- original bootstrap operator toolをC2 readbackとして流用しない

ledger SHAを実bytesから再計算し、ledger capturedAtが最初のC2 provider actionより前であることをvalidatorで強制する。

### 11. eight-state runtime orchestrator

既存bootstrap deployはphase one/two専用、existing webhook updaterはdeployment two専用であるため、runtime postureへ
流用しない。journaled/resumableなversioned state machineを新規実装する。

strict order:

1. all_off_bootstrap: Node F / DB F / shadow F
2. db_only: Node F / DB T / shadow F
3. db_shadow: Node F / DB T / shadow T
4. both_on_business_cycle: Node T / DB T / shadow T
5. node_rollback: Node F / DB T / shadow F
6. restored_all_off: Node F / DB F / shadow F
7. node_only_invalid: Node T / DB F / shadow F / failClosed T
8. final_all_off: Node F / DB F / shadow F

Node whitelistをsourceとcycle requirementsからfreezeする。

- FEATURE_VIP_FLOOR_V2_READ_ENABLEDはfalse
- FEATURE_VIP_FLOOR_V2_MUTATION_ENABLEDはfalse
- FEATURE_LINE_NOTIFICATIONS_ENABLEDはfalse
- FEATURE_VIP_CUSTOMER_PROFILE_WRITE_ENABLEDはfalse
- temporary enableを許すのはpublic booking、legacy admin mutation、webhook processing、Node dual-write、
  shadow comparisonのうちledgerで必須と証明したものだけ

DB update tool:

- exact staging project identityをprivate digestでlock
- production identityを拒否
- app_settings.vip_floor_v2_dual_writeのsingle rowだけ
- expected previous value/revision
- before/after authenticated readback
- affected row exactly 1
- production query/write 0
- local fixture SQLをstagingへ向けない

Node posture transition:

- custom staging targetだけ
- exact whitelistだけを変更
- same frozen prebuilt artifactを再buildせずdeploy
- READY wait
- provider file manifest/metadata/source identity一致
- production aliasなし
- existing webhook endpoint exactly 1を新deploymentへupdate
- signing secret hash不変
- endpoint create/deleteなし
- authenticated runtime flags readback

各state receipt:

- strict timestamp
- full nine application flags
- DB value/revision
- source/migration/artifact/deployment digests
- webhook URL digest match
- provider effect aggregate digest
- authenticated readback digest
- no secret/ID/URL

partial mutationやtimeout時はblind retryせずreadback/reconcileする。

### 12. change window and rollback watchdog

- maximum window: 2 hours
- rollback initiation: breach detectionから60 seconds以内
- rollback completion: 10 minutes以内
- monotonic timerとwall-clock timestampの両方を記録
- stepごとにprivate journalへbefore/intent/after/readbackを記録

immediate abort:

- critical/unknown/privacy/snapshot-race > 0
- collectorLoss > 0
- provider expected/actual mismatch
- provider duplicate > 0
- flag/DB readback failure
- Node-only fail-closed/zero-side-effect failure
- webhook signature/success/failure/retry/replay/conflict failure
- refund worker/provider readback failure
- deadlock/timeout regression
- v1 fallback failure
- Production/Preview/LINE fingerprint change
- lineage drift
- private boundary/scanner failure
- 2 hour window breach

rollback order:

1. temporary Node flags off
2. same-source staging deployment READY
3. authenticated runtime readback
4. v1 availability/hold/safe admin fallback
5. DB dual-write false
6. DB/runtime readback
7. final all-off deployment
8. existing webhook endpoint rebind
9. provider duplicate 0

data/migrations/auditは保持し、down migrationしない。

### 13. authentic two-cycle runner

危険な既存scriptを流用しない。

- run-vip-protected-public-booking-rehearsal.mjsは禁止
- replay-stripe-webhook-fixture.mjsはlocal fixture専用でruntime evidenceにしない
- raw provider ID/detailを出すSQL/toolを公開証跡へ使わない
- custom stagingをproduction cronのように扱わない

新規staging-only runnerを作る。future synthetic business date、private session、private client secrets、
private provider mapを使用する。

Cycle A card_setup:

1. availability
2. seat availability
3. atomic begin-hold
4. app-owned Checkout Session setup path
5. genuine test SetupIntent completion
6. signed webhook
7. worker readback
8. retry/replay/idempotency proof

Cycle B refundable_deposit:

1. availability
2. seat availability
3. atomic begin-hold
4. app-owned deposit PaymentIntent
5. genuine test confirmation
6. signed webhook
7. worker readback
8. reservation confirm
9. check-in
10. cancel/refund-required handoff
11. refund worker only
12. authenticated Refund readback

staging admin authがなければ、無効化済みcredentialを復活させない。安全なstaging-only synthetic operator
provisioning toolを先にhardeningし、値はprivate terminal/env fileだけで扱う。production credential再発行は本scope外。

### 14. webhook/refund/fallback/invariance harness

機械的に証明する。

- valid signature success
- invalid signature rejection before storage
- controlled failure then retry
- genuine resend/replay
- conflict/idempotency
- worker readback
- Refund creatorはworkerのみ
- exactly one refund case/job/provider Refund
- duplicate refund 0
- UI/SQL/request pathから同期Stripe call 0
- v1 availability
- v1 seat availability
- controlled hold
- safe v1 admin operation
- Node-only-invalidはcompatibility 503へ到達
- Node-only-invalidのreservation/assignment/payment/provider side effect 0
- Production deployment/alias/env unchanged
- Preview deployment/env unchanged
- LINE posture unchanged/off
- DB deadlock count baseline以下
- scoped timeout count baseline以下

### 15. additive runtime verifier

手書きboolean/digestだけでPASSできない新規versioned verifierとnegative fixturesを作る。

必須:

- budget proposal exact SHA
- Owner→Engineer same real human、ordered timestamps、role codes
- approval before observation
- collector/scanner/ledger/readback file bytesからSHA再計算
- duration 30 minutes以上
- window 2 hours以内
- comparisons 1,000以上
- exactly 1,000ならsuccess 999以上
- success rate 99.9%以上
- collector loss/snapshot-race/critical/unknown/privacy 0
- exact two cycle sequence
- exact eight state receipts
- rollback 60 seconds/10 minutes SLA
- webhook/refund receipt linkage
- provider expected=actual/duplicate 0
- v1 fallback
- Production/Preview/LINE invariance
- final all-off

wrong target/account、live mode、bootstrap namespace reuse、duplicate/missing event、privacy leak、stale deployment、
state reorder、partial retry、rollback SLA breach、hand-authored evidenceでnegative testsを落とす。

locked Gate auditを変更せず、new verifier exit 0をpre-sign mandatory gateとしてhash-linkする。既存auditの弱い箇所を
new verifierで補完する。locked audit変更が必要なら第7節のamendment stopへ戻る。

---

## Gate C Runtime R2: pre-mutation freeze and authorization

### 16. freeze package

provider action前に次をhash-linkする。

- final budget ratification
- collector source/fixture
- privacy scanner source/fixture
- sanitized source/query digest
- provider expectation ledger
- C2 namespace digest
- private map digest
- eight-state expected ledger
- cycle ledger
- rollback ledger
- invariance baseline plan
- additive verifier/negative fixtures
- frozen source/migration/artifact/deployment/preflight
- absolute change window start/end
- rollback operator identity privately、public role/digestだけ

pre-mutation manifest freeze前に、Engineer role本人から別メッセージで次を得る。

    Role: Engineer
    Decision: READY
    Role code: ENGINEER_ROLLBACK_OPERATOR_READINESS
    Rollback ledger SHA: exact SHA
    Change window draft SHA: exact SHA
    Rollback initiation SLA: 60 seconds
    Rollback completion SLA: 10 minutes
    Final posture: all_off
    directHumanMessage: true
    aiProxy: false
    samePersonMultiRoleAcknowledged: true

このattestationをpre-mutation manifestへ含める。Engineer budget approvalやOwner execution authorizationから推論・転用しない。

3 subagentsが独立reviewし全員ACCEPTする。

### 17. human runtime execution authorization

numeric budget批准をexecution authorizationへ転用しない。pre-mutation manifest SHAをfreeze後、Owner本人から別messageで
次を得る。

    Role: Owner
    Decision: AUTHORIZE
    Pre-mutation Manifest SHA: exact 64 hex
    Role code: OWNER_STAGING_RUNTIME_EXECUTION_AUTHORIZATION
    Environment: staging
    Rollback operator: Engineer
    Change window: exact start/end
    Rollback SLA acknowledged: 60 seconds / 10 minutes
    samePersonMultiRoleAcknowledged: true
    directHumanMessage: true
    aiProxy: false

SHA、window、operator、all-off responsibilityが不一致ならHOLD。authorization evidenceには実名、authorizedAt、
directHumanMessage=true、aiProxy=falseを記録して別fileへfreezeする。Owner authorizationはwindow開始前でなければならず、
authorizedAt < windowStart < windowEnd、windowEnd-windowStart <= 2 hoursをvalidatorで強制する。予定開始を過ぎた場合は、
window、pre-mutation manifest、Owner authorizationを全て再freezeする。

---

## Gate C Runtime R3: execution

### 18. start conditions

- all-off authenticated
- fresh READY preflight exit 0
- source/migration/artifact/deployment lineage exact
- endpoint exactly 1
- env 26/26
- Production/Preview/LINE baseline
- deadlock/timeout baseline
- collector/scanner active
- private boundary valid
- 3 reviewers ACCEPT
- human execution authorization valid

### 19. execute window

eight statesをexact orderで実行する。stateを飛ばさない。各mutation後にreadbackし、次へ進む前にreceiptをfreezeする。
both_on_business_cycle中に2 cyclesとcomparison collectionを行う。

budgets:

- p95 shadow overhead <= 25ms
- accepted events <= 2,000
- cardinality <= 20
- observation duration >= 30 minutes
- completed attributable comparisons >= 1,000
- success rate >= 99.9%
- exactly 1,000ならsuccesses >= 999
- cycles exactly 2 required kinds
- max change window <= 2 hours
- all zero budgets remain zero

breach時は新規actionを止め、60 seconds以内にrollback開始、10 minutes以内にfinal all-offへ戻す。abort runをPASSへ使わない。

### 20. runtime closure

成功時:

1. final all-off authenticated readback
2. endpoint exactly 1 and current deployment digest match
3. fresh READY preflight exit 0
4. Production/Preview/LINE unchanged
5. provider expected=actual/duplicate 0
6. v1 fallback PASS
7. additive runtime verifier exit 0
8. privacy scanner/negative control PASS
9. canonical staging observation生成
10. 3 reviewer runtime cross-review ACCEPT
11. summaryへ全非署名evidenceをhash-link
12. runtime aggregateをobservationとexact copy
13. normal audit exit 0

期待状態:

- deterministicReady=true
- bindingAuthorizationReady=true
- runtimeReady=true
- runtimeEvidenceReady=true
- signatureGovernanceReady=true
- signaturesReady=false
- gateReady=false
- HOLD理由はfinal signaturesだけ

---

## Gate C final manifest and attestations

### 21. non-circular manifest freeze

全非署名evidence確定後:

    npm run print:vip-floor-v2-gate-c-signature-manifest

manifest print直前にnormal auditを再実行し、その完了からprintまでevidence quiescenceを強制する。manifestはevidence entriesの
sorted path/SHAから計算し、summary自身を含めない。署名fileはmanifest計算から除外する。manifest freeze後に追加できるのは
除外対象のfinal signature evidenceだけ。他evidenceが変われば3 attestationsを全て取り直す。

manifest freeze後のOwner/Floor Manager partial attestation fileをsummary.evidenceへ追加しない。3件揃うまではrepository外の
private 0600 transient journalだけに保持し、3件を1つのfinal signature evidenceへ合成する。
summary.signaturesEvidencePathはfinal signature fileだけを指し、これはmanifest計算から除外される唯一のentryとする。
post-sign normal audit、manifest reprint、require-passの出力はterminal audit receiptとしてmanifest外に保存する。追加が必要に
なった場合はmanifestを再freezeし、3署名を全取得し直す。

### 22. human attestations

同一人物から別メッセージ・別timestampで順に得る。

1. Owner / OWNER_BUSINESS_RISK_ACCEPTANCE
2. Floor Manager / FLOOR_MANAGER_OPERATIONAL_READINESS
3. Engineer / ENGINEER_TECHNICAL_SECURITY_ACCEPTANCE

全て:

- same real name
- same exact evidence manifest SHA
- Decision=PASS
- samePersonMultiRoleAcknowledged=true
- manifest freeze後
- Owner < Floor Manager < Engineer
- AI proxy/placeholder/history転用なし

binding批准、budget批准、runtime authorizationをfinal attestationへ転用しない。
いずれかのroleがFAILならGATE C FINAL ATTESTATION FAILとし、PASS用signature evidenceを作らない。

### 23. Gate C PASS

signature evidence v2を作り、active governanceをexact copyする。summaryへhash-linkし、3 recordsをexact copyし、
decision=PASS、blockers=[]にする。

次を直列実行する。

    npm run audit:vip-floor-v2-gate-c
    npm run print:vip-floor-v2-gate-c-signature-manifest
    npm run audit:vip-floor-v2-gate-c -- --require-pass

manifest再printがpre-sign SHAと一致し、normal/require-pass両方exit 0で初めて
GATE C PASS / PHASE D0 UNLOCKEDとする。

Gate C packageをfreezeし、status/logを更新し、provider evidence sessionを終了する。UIは新しいWave/sessionで開始する。

Gate C PASSはfrozen Gate C source/migration/artifact lineageに対するhistorical PASSである。D0開始時にそのPASS package SHAを
ancestorとして新しいPhase D manifestを開始する。UI変更後に旧Gate C summaryを書き換えず、新sourceへ旧require-pass結果が
そのまま適用されると主張しない。

---

## Phase D0: UI contract freeze

### 24. hard boundary

Gate C require-pass exit 0前にUI sourceを変更しない。

.Codex/docs/DESIGN.mdは現在欠落している。親workspaceの別fileを黙って使わない。

選択肢:

1. provenanceが確認できる正式local DESIGN.mdを復元する。
2. 復元不能なら次のexact SHA bundleをdesign authority proposalとして作り、Owner本人が別messageで承認する。

bundle:

- website/AGENTS.md
- website/docs/ui/UI_TOOLKIT.md
- parity-matrix.md
- component-spec.md
- behavior-inventory.md
- current venue media/floor geometry manifest
- globals.cssのGHOST token subset digest
- v1 desktop/mobile fallback screenshot manifest

Owner承認SHAなしでD0をPASSにしない。

代替design authorityを選ぶ場合は、Owner本人から別メッセージで次を得る。

    Role: Owner
    Decision: APPROVE
    Role code: OWNER_DESIGN_AUTHORITY_ACCEPTANCE
    Authority bundle SHA: exact SHA
    directHumanMessage: true
    aiProxy: false
    approvedAt: timezone ISO

### 25. D0 subagents

- Agent A: v1 source/screenshots/floor media/parity
- Agent B: Next 16 Server/Client/auth/DAL/DTO/URL/privacy
- Agent C: board decoder/capability/status/a11y/performance/test strategy
- root: shared contract/page/flags/package/global tokens

### 26. freeze contracts

既存website/src/lib/vipFloorV2Contract.tsを唯一の正本としてversionedに拡張し、競合するUI-only domain typeを作らない。

freeze:

- fail-closed runtime board decoder
- lifecycle finite vocabulary
- service status finite vocabulary
- payment/provider evidence vocabulary
- strict table/block/assignment/note/customer summary DTO
- invalid enum、duplicate ID、broken reference、time inversion、geometry range rejection
- safe typed 401/403/409/422/429/5xx errors
- initial summary DTOとcapability-gated detail DTO
- capability/control/API/RPC matrix
- v1/v2 read/mutation/fallback
- URL parser/canonicalizer
- reducer state
- design tokens/z-index/focus/motion/safe-area
- responsive/component ownership
- test framework decision

URL:

    date=YYYY-MM-DD
    view=floor|chart|list
    reservation=<publicCode>
    table=<publicResourceCode>
    panel=reservation|table|block|walk-in
    section=<allowlisted>
    filter=<allowlisted>
    sort=<allowlisted>
    zoom=15m|30m
    from=HH:mm

UUID、PII、note、provider IDをURLへ入れない。invalid/duplicate/irrelevant parameterをcanonical URLから除去する。
date/view/entity selectionはpush、rapid filter/zoom changesはreplaceを基本案としてdecision recordに固定する。

capability matrixはvisible/disabled/executable/API capability/RPC capabilityの5列を持つ。UI非表示をsecurity boundaryにしない。
全API routeがserver-side capability/flagsを再検証する。

既存v1 .vip-floor-board/.vfb-*は白青consoleだがfallbackなので変更しない。v2は別CSS Modules scopeで、
black-violet lacquer、champagne hairline、実floor geometry、receipt/ticket detailを使う。

禁止:

- AI glassmorphism
- purple/blue orb
- bokeh/blob
- floating translucent stack
- nested cards
- white/gray/blue SaaS v2
- excessive radius
- decorative explanation copy
- color-only status

D0 decision SHA、authority SHA、contract SHA、v1 fallback screenshot SHAをfreezeし3 reviewers ACCEPT。

---

## Phase D1: read-only shell

### 27. architecture

recommended paths:

    src/app/admin/vip-floor/page.tsx
    src/lib/server/vipFloorV2Page.ts
    src/components/admin/vip-floor-v2/
      contract/
      state/
      api/
      shell/
      floor/
      chart/
      list/
      reservation/
      dialogs/
      mobile/
      fixtures/
      VipFloorV2.module.css

page.tsxはasync Server Component。

- Next 16 searchParamsをawait
- serverでcookie session/role/read flag/capabilityを検証
- flag offならcurrent VipFloorDashboardを完全にそのままrender
- flag onだけpure server DALからsanitized snapshotを取得
- self API loopback fetch禁止
- existing response-producing loaderをpure loader + route/page adaptersへ分離
- auth/session readをrequest内dedupe
- independent readsをparallel start
- clientへ最小serializable DTOだけ
- server-only moduleをclient import不能にする

Client boundary:

- date/view/selection/panel/filter/pending/reconcileだけ
- initial server snapshotをfirst renderに使う
- obsolete fetchをAbortControllerでcancel
- chart/listはClient wrapper内からdynamic import
- filter/searchのnon-urgent updateはtransition/deferredを検討
- mutation flag offならcommand controlsを非表示またはdisabled

### 28. D1 deliverables

- GHOST Osaka VIP operations shell
- business day previous/next/today
- floor/chart/list switch
- search/compact filter
- status rail
- board revision/stale/refresh
- real floor geometry
- distinct table/reservation selection
- read-only detail
- loading/empty/unauthorized/403/error/feature-disabled
- skip link/landmarks/focus/live region
- mobile dedicated composition

D1 Gate:

- 1440x900
- 1024x768
- 768x1024
- 390x844
- first viewportでvenue/day/state/view/floor/primary actionを理解できる
- body horizontal overflow 0
- keyboard-onlyでdate/view/search/selection
- reload/back/forward URL restore
- v1 fallback visual/behavior unchanged
- client payload privacy scan 0
- reference/actual/diff screenshots
- 3 reviewers ACCEPT

---

## Phase D2: Floor / Chart / List

### 29. parity scope

D2開始前にparity matrixのD2 in-scope IDsをfreezeする。Phase E/F/G itemをD2 PASSへ混ぜない。
mutation flag offのままread/visual parityを通す。

### 30. Floor

- desktop 66/34 map + reservation rail、rail min 360px
- tablet landscape >=900pxは60/40、rail 320-360px
- 768-899 portraitはmobile IA
- actual GHOST floor geometry
- maximum three turns
- multi-table
- unassigned
- blocks/restrictions/memo/staff cue
- reservation/finished/block tabs
- waitlist/staffはfeature-disabled shellのみ
- table accessible nameへcode/time/pax/status
- non-color status

### 31. Chart

- semantic table x time grid
- row 32-40px
- zoom 15/30 minutes
- current-time line
- reservation/block bars
- unassigned/no-show/cancelled/deleted trays
- overnight/turnover/collision
- scrollはtimeline container内だけ
- mobile chart deep linkはgrid/listへ変換
- 500 bars fixtureでwindowingを計測

### 32. List

- desktop semantic table、card pile禁止
- sticky header
- fixed important columns
- start/pax/tables/customer/memo/created/lifecycle/service/payment
- search/sort/filter
- stable row height/tabular nums
- 50 rows超はmeasurement後にcontent-visibilityまたはvirtualization
- 1,000 rows fixture
- intentional table container以外horizontal scroll 0

### 33. cross-view Gate

- same normalized board
- same selection
- same board revision
- date/filter/valid selection保持
- back/forward restore
- multi-turn/unassigned/block/overnight/extension一致
- core parity 100%
- screenshots/diffs/reviewer ACCEPT

---

## Phase D3: field operations

### 34. risk order

1. confirm
2. assign/reassign/add/remove/unassign
3. check-in/service status
4. schedule/duration/seat extension
5. walk-in
6. non-recurring block create/update/cancel
7. server-persisted note
8. cancel/refund decision
9. authorized customer update

### 35. command envelope

全command:

- server capability + flags
- expectedVersion
- Idempotency-Key
- request ID
- actor/reason
- pending state
- typed error
- read-after-write board reconciliation
- same user-visible retry=same idempotency key
- destructive optimistic commit禁止
- offline auto queue/replay禁止
- 409でattempted values保持、server diff、reload、explicit retry
- 3 viewsがsame revisionへ収束

confirm/check-inだけでなくassignment/schedule/cancel/notes/blocks/walk-in/extension/customer updateのroute-layer capabilityを
RPCと一致させる。

### 36. detail/forms

- customer/reservation two panes
- reservation/payment/images/audit/POS tabsをcapability/data availabilityで制御
- masked customer summary
- visible labels
- correct type/inputmode/autocomplete
- field errors/first-error focus
- dirty/unsaved guard
- conflict diff/input preservation
- unauthorized PII/provider detailをDOMへ送らない

### 37. drag/resize

- pointer/touch/keyboard
- button/form exact alternative
- same command envelope
- collision warning/drop preview
- contained auto-scroll
- text selection suppression
- live announcement
- Escape cancel/focus return

dependencyを推測しない。現packageにはPlaywright、axe、dnd-kit、virtualization libraryがdirect dependencyとしてない。
追加が必要ならGate C後、rootだけがpackage/lockfileを変更し、理由、version、bundle impactをdecision recordへ残す。

### 38. cancel/refund

- impact summary
- structured reason classification/note
- payment/refund posture
- explicit confirmation
- synchronous Stripe call禁止
- refund case/worker handoffだけ

### 39. D3 quality Gate

- drag/button/keyboard同一command
- 401/403/409/422/429/5xx/offline recovery
- focus trap/Escape/focus restore
- non-color status
- prefers-reduced-motion
- long Japanese/English labels
- important touch target >=44px
- body horizontal overflow 0
- LCP <=2.5s
- INP <=200ms
- CLS <=0.1
- 80 tables
- 500 chart bars
- 1,000 list rows
- bounded initial client bundle
- no independent-read waterfall
- v1 fallback/rollback rehearsal

E2E:

- desktop floor -> detail -> assign -> confirm -> check-in -> cancel
- mobile list-first -> drawer -> walk-in -> back/forward
- keyboard-only main operations
- conflict/retry
- flag off v1 fallback

### 40. Floor Manager human rehearsal

AIが代行しない。同一人物がFloor Manager roleとしてstagingで次を本人確認する。

- search
- floor/list/chart
- reservation selection
- assignment
- confirm/check-in
- schedule/extension
- walk-in
- block/note
- cancel/refund handoff
- 409 recovery
- keyboard/touch path
- v1 fallback/rollback

role、real name、timestamp、scenario results、evidence SHA、PASS/FAILをdirect messageで得る。さらにrole code=
FLOOR_MANAGER_D3_OPERATIONAL_REHEARSAL、directHumanMessage=true、aiProxy=false、samePersonMultiRoleAcknowledged=true、
reviewed D3 evidence manifest SHA=exact SHAを必須にする。未取得ならD3 UI IMPLEMENTED / FLOOR MANAGER REHEARSAL HOLDとする。

---

## Phase D4: dedicated mobile / tablet operations

### 41. mobile IA

desktop layoutの単純な縦積み、縮小、overflow隠しで済ませない。

- 375/390px table grid、fixed-row reservation list、detail bottom drawer
- sticky date/view/status、selection-driven primary action
- 4-item bottom navigation
- step-based reservation form、Back/Next、入力state保持
- chart deep linkはmobile grid/list representationへ変換
- mobile PIN login、session expiry、retry、logoutを実操作
- current v1の390px blank PIN screenとclipped previewを再発させない
- important touch target 44px以上、target spacing 8px以上
- safe area、landscape、200% zoom、long Japanese/English labels
- page-wide horizontal overflow 0

### 42. tablet ownership

- 768-899px portraitはmobile IA
- 900px以上landscapeは約60/40 split
- reservation railは320-360px minimum
- orientation changeでdate/view/selection/form stateを失わない
- desktop map/chartをportraitへ無理に圧縮しない

D4 Gateではmobile/tabletのsearch、select、assign、confirm、check-in、walk-in、cancel handoff、409 recovery、
reauthentication、v1 fallbackをE2Eで通す。

---

## Phase D5: visual / accessibility / performance quality

### 43. visual Gate

- black-violet lacquer、champagne hairlines、real floor geometry、LED rhythm、ticket/receipt details
- status rail、split pane、table、queue、timeline中心
- generic white/gray/blue SaaS、glassmorphism、purple/blue orb、bokeh、nested cards、large radiusを禁止
- first viewportでGHOST Osaka、営業日、現在状態、主要view、real floor、主要actionを理解できる
- reference/actual/diffを375、390、768、900、1024、1200x721、1440x1024で保存する
- automated diffだけでなくrootが全viewportを目視する

### 44. accessibility Gate

- semantic button/link/table/form
- keyboard-only search/detail/assign/status/cancel
- visible focus、dialog focus trap、Escape、focus restore
- icon-only accessible name、non-color status、concise live region
- prefers-reduced-motion、screen-reader order、200% zoom
- visible label、field error announcement、first-error focus、dirty guard
- pointer/touch/keyboardが同じcommand envelopeを使う

### 45. performance Gate

- 80 tables、500 chart bars、1,000 list rows
- LCP <=2.5s、INP <=200ms、CLS <=0.1
- board read p95 <=800ms target
- ordinary mutation p95 <=1,000ms target
- drag feedback <=100ms target
- drag中にboard全体をrerenderしない
- measurement-based virtualizationまたは`content-visibility`
- chart/list/advanced featureをdynamic loadし、initial client bundleをboundedにする

Floor Manager本人がD4/D5 evidence manifestへmobile/tablet/desktop、a11y primary path、performance、fallback、
rollbackを再確認する。AIが代行しない。PASS後の状態は
`D5 CORE UI PASS / ADVANCED OPERATIONS PENDING`である。

---

## Phase E: advanced operations

UIより先にadditive data、RLS、RPC、API、outbox、retentionを実装する。

### 46. E0 contract freeze

- service period、day memo、online acceptance
- waitlist add/contact/accept/seat/cancel lifecycle
- recurring block materialization
- notification lifecycle、retry、dead-letter
- staff assignment、operational profile、capability
- encrypted customer dossier、contact activity
- attachment metadata、scan、retention

### 47. E1 data/runtime

- additive schema、RLS、version、audit
- strict RPC/API parser、idempotency、typed errors
- transactional outbox。DB triggerからexternal providerを呼ばない
- raw contact/provider payloadをoutbox/log/evidenceへ保存しない
- notification failureでもwaitlist stateを失わない
- recurring block materialization再実行でduplicate 0
- admin capabilityとstaff operational profileを分離
- LINEは別Gate、default off
- dossier/contact/attachmentはencryption、redaction、scan、retentionをfail closed化

### 48. E2 UI

- waitlist/notify/seat queue
- service period、online acceptance、recurring block
- staff assignment/overlay
- dossier/contact/attachment status
- feature-disabled、loading、empty、stale、error、retry、permission state

fake dataで未実装機能を有効に見せない。provider未設定は安全なdisabled/not configuredを表示する。

---

## Phase F: placement suggestions / export / print / POS

### 49. placement optimizer

- deterministic candidate generator
- hard constraint violation 0
- suggestion-onlyから開始し、自動commit禁止
- managerだけがbatch apply可能
- apply時にversionを再検証し、stale suggestionを拒否
- score reason、採用/拒否、actor/reasonをaudit
- manual assignmentへ常に戻れる

### 50. CSV / Excel / print

- current filter、capability、redactionを同じcontractで使用
- CSV formula injection、encoding、locale、timezoneを検証
- Excel/printにmasked PIIとpermissionを引き継ぐ
- export/printの実行者、時刻、scopeをaudit

### 51. vendor-neutral POS adapter

- provider-neutral interfaceとoutbox/retry/dead-letter/reconcile
- provider未設定はsafe `not configured`
- provider payloadをboard DOM/evidenceへ渡さない
- POS障害中もboard core operationsを継続
- duplicate push 0、idempotent reconcile

---

## Phase G: realtime / multi-device / recovery hardening

### 52. realtime

- entity payloadでなくday revision notification
- reconnect、visible stale state、polling fallback
- coalesced refresh、out-of-order revision rejection
- server snapshotをauthorityにする

### 53. multi-device and disconnect

- two-device conflictはone winner、loserはtyped diff/reload/explicit retry
- offline mutation auto replay禁止
- disconnect中のdangerous actionはfail closed
- same user-visible retryはsame idempotency key
- session expiry、reauthentication、back/forward state restoration

### 54. full-load and cross-platform Gate

- 80 tables、500 chart bars、1,000 reservations、100 waitlist、30 staff、500 audit events
- Chrome/Safari相当
- 375x812、390x844、768 portrait、900 landscape、1024、1200x721、1440x1024
- keyboard/pointer/touch parity
- full P0/P1 operator rehearsal
- v1 fallback/rollback rehearsal
- D0-G in-scope parity matrix 100%

PASS後は`STAGING FULL PARITY PASS / RELEASE HOLD`とし、productionを自動で開始しない。

---

## Phase H: staging → canary → production

### 55. release authority

production mutation前にexact release manifest、change window、rollback operator、canary scope、budget、final flagsへ
Owner本人の新しい明示承認を得る。Gate C signature、D5 rehearsal、一般的な「進めて」をrelease authorizationへ
流用しない。未取得ならrelease HOLD。

### 56. rollout order

1. local reset/shadow
2. staging all flags off
3. staging v2 read-only
4. Floor Manager release-candidate read-only rehearsal
5. staging mutation + dual-write
6. signed webhook/refund/external worker test mode
7. staging rollback rehearsal
8. production additive deployment、all flags off
9. production shadow
10. Owner/Floor Manager read-only canary
11. one terminal/one shift mutation canary
12. staff staged rollout
13. advanced operations staged rollout
14. approved stability window

各stageでimmediate、15分、2時間、営業終了後、24時間後を記録する。より長い事前承認windowがあれば長い方を使う。

### 57. release Gate

- D0-G all PASS
- all in-scope parity rows PASS
- WAF authenticated readback
- WAF経由signed webhook PASS
- public availability/hold/admin fallback PASS
- provider duplicate 0
- Node/DB flag alignment
- privacy/secret/provider ID leak 0
- Owner/Floor Manager/Engineerのrole-specific final Go records
- rollback operator present、rollback rehearsal PASS
- canary budget内、exact release manifest一致
- stability windowの成功条件、incident基準PASS

### 58. immediate rollback

次のいずれかで即rollbackする。

- assignment/inventory mismatch
- version/revision anomaly
- duplicate reservation/refund/notification
- signed webhook failure increase
- public availability mismatch
- PII/secret/provider leak
- Node/DB flag misalignment
- operatorがprimary workflowを完了不能
- sustained budget breach

rollback順:

1. v2 UI/read off
2. mutation off
3. Node public v8 route off
4. v1 availability/hold/admin verify
5. DB dual-write off
6. additive migration/rows/audit retain
7. offline reconcileとnew authorization後だけresume

### 59. legacy cleanup

stability window完了後、Ownerの別承認がある場合だけ実施する。usage 0、rollback window closed、backup/restore rehearsal、
data retention、v1 route removal planを再監査する。未承認なら
`FULL REPRODUCTION COMPLETE / LEGACY CLEANUP DEFERRED`を正しい完了状態とする。

---

## Validation matrix

既存script名をpackage.jsonから再確認し、存在しない成功を捏造しない。最低限:

    npm run verify:vip-floor-v2-schema
    npm run test:vip-floor-v2-rpc
    npm run test:vip-floor-v2-api
    npm run test:vip-floor-v2-api-contract
    npm run test:vip-floor-v2-dual-write
    npm run test:vip-floor-v2-public-dual-write
    npm run test:vip-floor-v2-dual-write-races
    npm run test:vip-floor-v2-rollback
    npm run test:vip-floor-v1-v2-compare
    npm run test:vip-customer-crypto
    npm run test:stripe-replay
    npm run test:stripe-unbound
    npm run test:reservation-saga
    npm run test:vip-static
    npm run test:vip-floor-v2-gate-c-bootstrap
    npx tsc --noEmit
    npm run lint
    npm run build

UI harnessが存在しない場合、D0後にrootがcomponent/reducer tests、browser E2E、visual regression、
automated accessibility、load/performance harnessを追加する。direct dependencyを追加する前にpackage/lockfileをreviewし、
runtime bundleへtest packageを混ぜない。

各Waveで保存:

- task/agent ledger
- dirty manifest
- input/output SHA
- real commands/exits
- positive/negative fixtures
- privacy scan/negative control
- screenshots
- fallback/rollback
- human checkpoint
- open risks/next authorized action

## Final report

sanitized factsだけを報告する。

- terminal outcome
- completed/remaining tasks
- Gate C readiness and real audit exits
- runtime metrics/budgets/provider effects/eight states/rollback
- final manifest and three role results
- design authority
- D0-D5、E-G Gate results
- in-scope parity IDs and deferred/not-applicable items
- changed files
- desktop/tablet/mobile/a11y/performance results
- Floor Manager rehearsal
- release/canary/WAF/signed webhook/final Go/rollback results
- final flags/DB posture
- production/Preview/LINE boundary and final posture

secret、URL、query、provider/account/project/deployment/object ID、PII、private path、raw logsを報告しない。

本プロンプトはPhase Hまでを計画するが、human checkpointとrelease authorityを自動で越えない。
legacy cleanupはstability後の別Owner承認がない限り開始しない。

## Prompt ends

---

## 作成時点の安全境界

本書更新時点ではOwner numeric budget approvalの記録とprompt/evidence file作成、read-only research/validationだけを行った。
Engineer approval、runtime toolchain実装、flag/DB/provider runtime mutation、final signatures、UI source変更、
production/Preview/LINE mutationは行っていない。
