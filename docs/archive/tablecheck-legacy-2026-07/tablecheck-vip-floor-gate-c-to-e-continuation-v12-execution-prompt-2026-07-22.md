# GHOST Osaka VIP Floor — adopted candidate review → Gate C → Gate D → Gate E V12 execution prompt

以下の `BEGIN PROMPT` から `END PROMPT` までを、新しい primary implementation session へそのまま渡して実行する。

## BEGIN PROMPT

あなたは `/home/kokoro/projects/clients/ghost` の primary implementation coordinator です。目的は、V11のtruthful `GATE_C_HOLD` terminalをbyte-immutable ancestorとして受け入れる新lineage `gate-c-to-e-continuation-v12-adopted-candidate-review` を開始し、既に採用済みのcandidate 2を再buildせずexact再検証し、fresh manifestへprovenance/runtime/securityの独立3名によるread-only審査を行い、3/3 ACCEPT後だけbounded custom-staging Gate Cを実行することです。真正なstrong-MFA Gate C PASS後だけGate D、truthful Gate D PASS後だけGate Eへ進みます。

これは実装・検証・許可済みcustom-staging実測・rollback・証跡化までを行うexecution promptです。ただし、authority、ancestor、candidate、identity、credential、external-call counter、operation ceilingまたはgate conditionを推測で満たしてはいけません。未来の人間attestationをAIが作成、代筆、事前充足することは禁止です。

## 0. 開始時の絶対ルール

1. 最初にrepo rootの `AGENTS.md`、`docs/AI_CURRENT_STATUS.md`、`docs/AI_WORK_LOG.md` 最新行、`docs/AI_AGENT_SYNC.md`、`website/AGENTS.md` を読む。
2. Stripeに触れるため、installed `stripe-best-practices` skillとsecurity referenceを読む。Stripeはtest mode、restricted key、API version `2026-04-22.dahlia`、raw-body webhook signature verification、same-operation idempotencyを必須とする。
3. UI実装へ到達するまでUIファイルを変更しない。Gate Dへ到達した場合だけ `.Codex/docs/DESIGN.md`、`website/docs/ui/UI_TOOLKIT.md`、`website/src/app/globals.css`、closest existing page/componentを読む。
4. dirty worktreeは利用者のもの。無関係な変更を修正、削除、stash、reset、checkout、上書きしない。
5. evidenceはadditive-only。既存JSON、manifest、review、freeze、terminal、research note、private candidateを変更・削除・再生成しない。
6. secret、token、cookie、JWT、customer PII、ciphertext、provider object ID、private URL、private absolute path、raw webhook body、deployment URLをchat、stdout、public evidence、git diff、snapshot、screenshotへ出さない。
7. Production、Preview、LINE、live Stripe、real customer data mutationは0。deployment delete、manual alias、project config、persistent env、credential creation/rotation/content mutation、Gate C schema/package-lock/application-source mutationも0。
8. V12 resolverより前にprivate pointer/artifact、secret、credential、provider/runtime APIへ触れない。V11 resolverは既にTERMINALなので、V11のOPEN guardを迂回・改変して使わない。
9. pre-reviewおよびreview中のexternal-call ceilingはexact 0。network-capable CLI、update check、package resolution、web search、remote browser、provider APIを一切起動しない。
10. `npx` はpre-reviewで全面禁止。ESLint等は既存の明示local binary pathを使う。`stripe version`、`vercel --version` その他update checkを起こし得るCLI version commandも禁止。version inventoryはlocal package metadataとbinary SHAを実行せず読む。
11. external mutationは常に `journal → exact identity/scope/counter check → one mutation attempt → authenticated readback → postcondition → counter update`。unknown outcomeと各retryはceilingを1消費し、blind retryしない。
12. Gate順序は `V12 candidate verification/review → Gate C → authentic signed Gate C PASS → Gate D → truthful Gate D PASS → Gate E`。後段を先にscaffold、実装、表示、deployしない。
13. 事実が不足する場合はHOLD。warning、不明値、古い証跡、self-asserted booleanをPASSに変換しない。
14. commentaryを60秒以上途切れさせず、各checkpointでcurrent state、counter、停止条件を簡潔に共有する。

## 1. exact V12 authority と immutable ancestor

`website/` を基準に、次のファイルをJSON/Markdown parse、SHA-256、相互参照までexact検証する。1 byteでも異なればV12実装前に停止する。

| 種別 | path | SHA-256 |
|---|---|---|
| direct Owner directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v12-owner-directive-v1-20260722T075114+0900.json` | `06fbedecd6858980ef972daad319b843b2cf2c23ac964189ef3ff5b91956a9f5` |
| exact V12 proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v12-authorization-proposal-v1-20260722.json` | `e2320cc3cd2df59464b74b734f620d45a0cabbe6254176beb042d3516328a191` |
| exact Owner authorization | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v12-owner-authorization-v1-20260722T075421+0900.json` | `a2e113c6ef1fa3aa01c69dca4ffb9634ad7d7ce0700a928b79faa7d116b05506` |
| official-source research | `docs/research/tablecheck-vip-floor-gate-c-to-e-continuation-v12-external-call-authority-research-2026-07-22.md` | `73284b51dbf2c01b7851aba8555b79d972700511c5afadd874738637fb119c20` |
| V11 immutable terminal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-hold-v11-20260722T074042+0900.json` | `b94941d6447bd830fb08551d99b2cefaf38ea1c5cdff57b3db006119d926c42d` |
| additive terminal-boundary correction | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v11-terminal-candidate-boundary-correction-v1-20260722T074950+0900.json` | `7adf743563b6e9d43f5507256a8f3e7ffafb8b10fa30cb49ab2d505171ce10b6` |

このauthorizationはproposalをexpansionなしでexact採用する。future PASS、future human signature、Production release、live provider、real customer、ceiling拡張を許可しない。

### 1.1 canonical candidate chain

次をexact検証して全V12 hash chainへ含める。

| 種別 | path | SHA-256 |
|---|---|---|
| V11 candidate checkpoint | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v11-provider-closure-candidate-checkpoint-v7r23-20260722T065853+0900.json` | `92d439b592b3a8e70458776442717a1e6ca1ec8df945c36bce7073b84e685597` |
| V11 adoption result | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v11-candidate-adoption-result-v7r25-20260722T072600+0900.json` | `84a1b1c77585df562de6932f1a7a565140212fc8e47594d35139770602f3615b` |
| scanner fixture result | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v11-known-secret-scanner-fixture-result-v7r24b-20260722T072246+0900.json` | `45c6b8be2ed75e9297bec7bb0b5117cb08ac38f7e12504c25c19a534afc80fa3` |

canonical valuesは次のとおり。

- source `7f6b2dc10710c679496fcf4e8c253aab598529179df932a9900ec2243c267626` / 225 files
- migration `c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272` / 31 files
- artifact `5796deeea2f6b250d66ec388c66f1fa8d4588bb153536d5d1adb2c1bd7aad5f9` / 2380 files
- provider comparable `038f01c5a36b0387d27a2ebc6d5fde30308c94a233af134da32f856a304712cf` / 2701 files
- candidate tree 2702 files / 1050 directories
- known-secret exact-value match 0

V11 terminal内のembedded artifact/provider/migration digestは上記canonical evidenceと一致しない。terminal自体はtruthful HOLD ancestorとしてbyte-immutableだが、その3 fieldをcandidate canonical valueとして使ってはならない。correction recordを必ずbindし、checkpointとadoption resultに一致するprivate boundaryを1回だけ再hashする。不一致、pointer欠落、再hash不能ならHOLD。

### 1.2 V12 terminal resolver

新lineage名はexact `gate-c-to-e-continuation-v12-adopted-candidate-review`。

- V11 terminalはimmutable ancestor。編集、削除、置換、2件目のV11 terminal作成は禁止。
- additive V12 resolverを新versioned fileで作る。既存V11 resolver/library/evidenceを変更しない。
- resolverはglobal terminal inventoryを走査し、exact V11 terminal SHAが唯一のV11 terminalであること、V12 terminalが0件でOPENであること、lineage collisionがないことを確認する。
- 全privileged entrypointはprivate artifact read、secret read、external call、mutationより先に同じresolverを通る。
- booby-trap fixtureでterminal collision時に `privateArtifactReads=0 / secretReads=0 / externalCalls=0 / externalMutations=0` を実証する。
- V12 terminalは最大1件。Gate C signed PASSとGate D PASSはnon-terminal decision record。post-evidence human attestation待ちは `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` non-terminal checkpoint。
- 回復不能なbreach、authorized review round exhaustion、または最終Gate E PASS/HOLDでのみexact one terminalをsame-filesystem atomic publishする。

## 2. external-call accounting

V12 counterはexact authorization freeze後に0から開始する。V11 historical call 2とV12 preparation public-doc research tool call 2は消去せずhistorical evidenceへ保持するが、V12 executionへ二重計上しない。

### 2.1 unit definition

- top-level network-capable CLI/tool invocation: 1 unit。implicit update checkを含む。
- explicit SDK/direct HTTP request: 1 unit。
- non-loopback remote browser action that intentionally initiates traffic: 1 unit。
- retry: attemptごとに1 unit。
- timeout/unknown outcome: 1 unitを消費し、read-only reconciliation以外のblind retry禁止。
- verified egress-denied namespace内またはloopback-only operation: 0 unit。
- reviewer dispatchは別counter。reviewer自身のexternal callは0。

### 2.2 exact non-transferable ceilings

| phase | external-call maximum |
|---|---:|
| V12 startからmanifest/review完了まで | 0 |
| exact 3/3 ACCEPT後のGate C | 4224 |
| authentic signed Gate C PASS後のGate D | 128 |
| truthful Gate D PASS後のGate E | 256 |
| V12 lineage lifetime | 4608 |

各callはphase counterとlifetime counterの両方を消費する。unused unitsは後段へ移譲しない。個別operation ceilingが常に優先し、total ceilingは追加権限ではない。

call前にprivate journalへ `ordinal / phase / purpose / target class / mutation boolean / expected identity / idempotency identity if applicable / before counters / maximums` をfsyncする。call後にstatus、response completeness、sanitized identity、after countersをreceiptとしてfsyncする。provider URL/ID/raw body/credentialはpublicへ出さない。

## 3. pre-review V12 tooling allowlist

変更可能なのは次だけ。

1. 新versioned V12 resolver、authority verifier、external-call counter、manifest builder/verifier、review assembler、runtime wrappers、fixtures、schemas、evidence。
2. current V7r7 toolingをV12 authorityへbindするための新versioned copy。既存 `vip-floor-gate-c-recovery-v9-v7r7.mjs`、`vip-floor-gate-c-provider-v7r7.mjs`、V11 scripts/fixtures/evidenceは変更しない。
3. reviewer REJECT round 1を閉じるために必要なadditive tooling-only remediation。candidate/application source/migration/package/lockは変更しない。

pre-reviewではapplication source、migration、package.json、lockfile、candidate bytes、private pointer、credential file permission/contentを変更しない。build 0、candidate freeze 0、adoption 0、secret read 0、provider API 0、external call 0、external mutation 0。

installed tool inventoryはlocal filesystemだけで行う。

- Node/npm/Next/Vercel/Stripe/Supabase/ESLintのpackage metadataまたはbinary SHAをread-only取得する。
- binaryを実行してversionを得ない。
- package manager install/update/resolutionを行わない。
- `npx`を使わず、必要なlintは `website/node_modules/.bin/eslint` のようなexisting explicit pathをwebsite cwdから使う。
- local binary/metadataが欠ける場合はinstallせずHOLD。

## 4. one-shot private adopted-boundary verification

V12 resolverとauthority fixturesがexternal call 0でPASSした後だけ、V11が残したprivate adopted pointerへ進む。

hard ceilings:

- private adopted pointer metadata read: max 1
- private adopted candidate full-tree rehash pass: max 1
- secret/credential read: 0
- permission/content/path mutation: 0
- build/candidate freeze/adoption: 0
- external call/mutation: 0

content read前にpointerとrootのcurrent owner、regular/non-symlink、nlink 1、owner-only mode、realpath containmentを検証する。pointerのprivate absolute path、project binding、provider identifiersをstdout/public evidenceへ出さない。

full-tree passで各entryのpre-open/open/post identity、dev/ino/uid/nlink/mode/size/mtime/ctime stability、regular-file classification、path containmentを確認し、canonical source/migration/artifact/provider hashesとcountsへexact一致させる。symlink、hardlink、special、wrong owner/mode、path escape、hash/count driftは0必須。

このpassはknown-secret fileを再読しない。V11 adoption resultのsecret scan evidenceとcandidate bytes不変性をhash-chainで受理する。秘密値、HMAC dictionary、private pathを再生成・公開しない。

成功時はsanitized boundary verification evidenceをadditive作成する。失敗または不明ならcandidateを直さずtruthful `GATE_C_HOLD` terminalをatomic publishして停止する。

## 5. fresh executable manifest

新versioned V12 manifestをround 1としてfreezeする。最大2 manifest / 2 review rounds。最低限次を含める。

- V12 directive/proposal/authorization、V11 terminal、additive correction、V11 proposal/authorization/candidate/adoption chain。
- canonical source/migration/artifact/provider hashesとcounts、one-shot private rehash result。
- exact ancestor/current file set、added/changed/deleted diff、allowlist判定。
- 全privileged executable/library/schema/fixture/packageのtransitive import/loader closure。
- resolver、authority、external-call accounting、journal、pagination、CAS、synthetic cycle、observation、rollback、privacy、terminal publisher contract。
- exact phase/lifetime external-call ceilingsと全narrow operation ceilings。
- initial V12 countersがすべて0であること。
- public privacy findings 0。

manifest verifierはself-referenceを除く全declared bytesを再hashし、undeclared privileged entrypoint、missing/extra load、symlink/path escape/mode violation、authority/counter drift、fixture/result mismatch、terminal/correction/candidate mismatchを拒否する。

current V11 runtime fixtureはV11 OPENを期待するため、そのままPASS条件に使わない。V12用fixtureを新規作成し、V11 TERMINAL/1とV12 OPEN/0を正しく検証する。既存fixtureを改変してhistoryを偽装しない。

## 6. exactly three independent read-only reviews

Owner authorizationはV11で未消費だったdelegationをV12へcarry forwardしている。同一exact manifest bytesへexactly 3名を委任する。

1. provenance reviewer: hash chain、terminal correction、canonical candidate、complete diff/closure、fixture実体、manifest completeness。
2. runtime reviewer: executable entrypoints、external-call accounting、state machine、pagination、catalog、cycle attribution、CAS、observation、rollback、terminal flow。
3. security reviewer: private boundary、zero-call pre-review、booby traps、privacy scanner、synthetic auth、Stripe/Supabase/Vercel scope、ceiling fail-closed。

各reviewerはindependent、read-only。同一manifest SHAを受け取り、code/manifest/evidenceを変更せず、external calls 0、external mutations 0、secret reads 0、provider API calls 0で審査する。各resultは明示integer/boolean countersと `ACCEPT` または `REJECT`、blocking findingsを返す。

round 1が3/3 ACCEPTならreview aggregateをfreezeし§7へ進む。1名でもREJECTなら3件すべてを保存し、新しいtooling-only versionで全blockerを閉じる。candidate rehashを再実行しない。manifest round 2をfreezeし、同じ3 roleへfresh exact reviewを行う。

round 2も3/3 ACCEPTでなければ、reviewer dispatch max6を消費済みとしてtruthful `GATE_C_HOLD` terminalをatomic publishする。3/3前にcredential/provider/runtime accessへ進まない。

## 7. 3/3 ACCEPT後の readiness

post-review hard ceilings:

- Gate C external-call units: max4224
- authenticated read-only provider/runtime API requests: max4096
- other Gate C external-call units: max128
- private credential reads: max8
- raw private evidence: owner-only 0600
- public evidence: sanitized counts、booleans、scope、timestamps、run-keyed digestsのみ

最初にV12 resolver、manifest/review SHA、external countersを再検証する。credentialは値非表示でloadし、authenticated principal/team/project/custom-staging identity、Production/Preview/LINE invariants、Vercel deployments/aliases/environment/custom-environmentsの全pagination、Stripe test endpoint/key capability、Supabase project/database/migration/catalogをread-only取得する。

Vercel REST/Supabase responseのrate-limit headersを記録し、cursor exhaustionとresponse completenessを必須にする。429、timeout、partial page、unknown identityをunchanged扱いしない。retryするなら新call unitを消費し、mutationはblind retryしない。

### 7.1 all-off bootstrap

fresh readiness endpointがremoteに存在しない場合だけ、3/3 ACCEPT後に次を行う。

1. existing authenticated read-only APIでprovider identity、project、custom-staging scope、Production isolation、artifact identityを確認する。
2. exact adopted artifactから全feature flags/DB dual-write/runtime mutationをoffにしたprebuilt `all_off_bootstrap` custom-staging deploymentを最大1回journalして作成する。
3. このbootstrapはprebuilt deploy 1、Gate C total deploy 9の両方に含む。別枠の10件目ではない。
4. Vercel CLI stdoutのdeployment URLはprivate evidenceだけへ0600保存し、publicにはrun-keyed digestだけを出す。
5. provider-assigned staging URL/aliasをexact deployment identityへbindする。manual alias 0。
6. authenticated provider receipt/readbackとfresh runtime readinessを取得する。

bootstrap/readiness失敗時はdeploymentをinert/all-offのまま保持し、delete、manual alias、2回目bootstrapを行わずHOLD。

### 7.2 synthetic admin fallback

existing valid authorized admin sessionを先にread-only探索する。存在するなら作成しない。存在せずactual consumer proofに不可欠な場合だけ、pre-frozen namespaceで次をjournal/readback付きで許可する。

- least-privilege manager principal create max1
- manager session create max1
- authenticated consumer `last_seen_at` touch max16
- session retire max1
- principal disable max1
- audit rows retained
- existing real admin/staff/customer mutation 0

credential/session/principal IDをpublic evidenceへ出さない。role/capability/namespace/expiry/disabled stateだけをsanitized証跡化する。

## 8. Gate C bounded custom-staging execution

runnerはauthority manifestから次をexact bindし、拡張値を拒否する。

| operation | maximum |
|---|---:|
| prebuilt all-off bootstrap deploy | 1 |
| runtime-state custom-staging deploy | 6 |
| watchdog rollback custom-staging deploy | 2 |
| total new Gate C custom-staging deploy | 9 |
| provider-assigned URL/alias classification | 9 |
| existing Stripe test webhook target update | 9 |
| authenticated webhook compensation | 1 |
| DB setting CAS / affected rows | 3 / 3 |
| synthetic business cycles | exact2, max2 |
| deployment delete/manual alias/project config/persistent env/schema mutation | 0 |

Stripeはtest mode、least-privilege restricted key、API version `2026-04-22.dahlia`。key/signing-secret creation/rotation 0。webhook updateはPOST mutationとしてjournalし、logical operationごとにpre-frozen idempotency identityを使う。retry/reconciliationでkeyを変えない。webhook consumerはendpoint-specific secret、exact raw body、`Stripe-Signature`、nonzero timestamp toleranceで検証し、raw body/secretをlog/evidenceへ残さない。

### 8.1 exact state sequence

各stateで `intent → mutation receipt → authenticated readback` を省略・並べ替えない。

1. `all_off_bootstrap`
2. `db_only`
3. `db_shadow`
4. `both_on_business_cycle`
5. `node_rollback`
6. `restored_all_off`
7. `node_only_invalid` fail-closed proof
8. `final_all_off`

availabilityとbegin-holdを同時切替し、v1 response shapeを維持する。Node/DB misalignment、identity/alias/env drift、counter/readback不一致で即abort。

### 8.2 exact two synthetic cycles

pre-frozen namespaceとexact row-ID ledgerだけを使い、card setupとrefundable depositの2 cycleを行う。各cycleでavailability、hold、applicable test payment/setup、signed webhook、duplicate/replay/idempotency、retry/failure/conflict、namespaced worker claim、provider side-effect count、DB reservation/payment/assignment/audit/revisionをexact readbackする。

foreign/non-synthetic/real customer rowをclaimしない。unknown Stripe outcomeはsame idempotency identityでread-only reconciliationし、確定不能ならmutation retryせずHOLD。provider duplicate 0。

### 8.3 observation acceptance

- duration ≥ 1,800,000 ms
- unique attributable accepted comparisons ≥ 1,000
- shadow success rate ≥ 0.999
- p95 overhead ≤ 25 ms
- critical mismatch = 0
- snapshot race = 0
- privacy violation = 0
- duplicate provider effect = 0

strict schema/authenticity/correlationを通るunique comparisonだけを数える。duplicate collapse、request count、foreign cycle、unknown writer/classificationを水増しに使わない。expected divergenceはpre-frozen ruleとのexact matchだけ。

### 8.4 abort と rollback

最初のabort predicate成立をmonotonic clockでimmutable記録し、60秒以内にrollback開始、600秒以内にauthenticated `all_off` completionを実測する。

1. v2 UI/read off
2. v2 mutation off
3. Node public dual-write off
4. v1 availability/hold/admin health確認
5. DB dual-write CAS off
6. migrations/rows/audit保持、down migration 0
7. webhook targetをauthenticated before値へcompensate
8. provider/DB/runtime/Production/Preview/LINE exact readback

unknown outcomeは該当operation ceilingとexternal-call ceilingを消費する。SLA超過、readback不明、invariant driftはGate C HOLD。

## 9. Gate C evidence と authentic human attestation

fresh Gate C summary/manifestへclean PG16、全migration、mandatory/race/rollback、writer coverage、catalog/reconciliation、2 cycles、1000 comparisons、Stripe/webhook/refund、flags before/after、v1 fallback、privacy、全operation/external-call counters、remaining ceilings、rollback timing、current hashesをlinkする。normal auditとrequire-pass auditをexit 0にする。

その後だけfinal Gate C manifest SHAをfreezeし、Owner / Floor Manager / Engineerのpost-evidence attestationを人間から取得する。既存signature governance amendmentがexact有効な場合だけsingle operator multi-roleを適用できるが、同じfinal manifest SHA、Owner → Floor Manager → Engineerのdistinct timezone-bearing timestamps、role-specific codes、strong-MFA provenanceが必要。

AIはname、timestamp、MFA、signatureを合成しない。このV12 Owner authorizationをfuture Gate C PASSへ転用しない。真正な3 role recordがなければ `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` non-terminal checkpointをpublishし、Gate Dを開始せず停止する。揃った場合だけ `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED` non-terminal decisionをatomic publishする。

## 10. Gate D — authentic signed Gate C PASS後だけ

開始条件はexact `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED`。開始時にUI instructionとGHOST design authorityを読み直す。

scopeはV12 proposalが参照するV9 authorityから変更しない。

- VIP Floor v2 server-gated admin UI
- floor/chart/list、detail/form、core commands
- dedicated mobile IA、accessibility、performance
- one-action immediate v1 fallback
- Production flags default off
- Gate D external-call units max128
- custom staging deploy max6 + watchdog rollback max2 = total max8
- schema mutation0、real customer0、external payment/notification effect0

first viewportでGHOST Osaka VIP reservation operations、business date、primary actionを即理解できること。black-violet lacquer、champagne metal hairline、LED rhythm、real floor geometry、dense operational scanningを使う。generic hero/card dashboard、AI glass、purple/blue orb、bokeh、floating translucent/nested cards、SaaS default、過剰な角丸は禁止。

Server Componentでauth/capability/flagを解決し、flag off時は現行v1を表示する。URLへPII/internal UUID/provider IDを入れない。390px primary action、44px重要touch target、長い日本語/英語、keyboard/focus/reduced-motion/contrastを検証する。

read-only shell → three-view parity → core operations → mobile/qualityの順で進み、revision convergence、capability、conflict、idempotency、audit、fallback、visual regression、performance、floor-manager rehearsalをevidence化する。全acceptanceがtruthful PASSの場合だけ `GATE_D_PASS_PHASE_E_AUTHORIZED` non-terminal decisionをpublishする。

## 11. Gate E — truthful Gate D PASS後だけ

開始条件はexact `GATE_D_PASS_PHASE_E_AUTHORIZED`。scopeはV9 authorityから変更しない。

- data-first service periods、waitlist、blocks、staff operations、exception recovery
- customer dossier/contact activity、attachments、online acceptance、outbox
- data/API PASS後のdense operations UI
- Gate E external-call units max256
- local additive migrationのみ
- staging migration bundle apply max1、destructive/down 0
- custom staging deploy max6 + watchdog rollback max2 = total max8
- synthetic customer records max50、real customer0
- LINE/SMS/live notification0、Stripe mutation0
- notificationはdeterministic fake/sink adapterのみ
- Production flags default off

E0 contract freeze → E1 schema/RPC/API data gate → E1b dossier/attachments → E2 UIの順序を守る。RLS/ACL、race、idempotency、revision、outbox retry/dead-letter/reconcile、masked/capability states、audit、fallbackを検証する。external failureがreservation transactionを壊さないことをfixtureとstagingで証明する。

Gate E全acceptanceがPASSならfinal stateを安全に確認し、V12 exact one terminal `GATE_E_PASS_GATE_C_TO_E_CONTINUATION_COMPLETE` をatomic publishする。未確認または失敗ならflags-off/fallback/readback後、truthful `GATE_E_HOLD` terminalをexact one publishする。

## 12. stop conditions

次のいずれかで新mutationを止め、既に許可されたrollback/compensationだけを行う。

- authority、ancestor SHA、terminal correction、canonical candidate、lineage、terminal invariant不一致
- secret/PII/provider ID/private URL/path/raw payloadのpublic leak
- private rehash、manifest/review、credential、external-call、API、mutation counterのceiling到達または超過
- pre-review external callまたはnetwork-capable CLI/package resolutionの発生
- candidate/hash/count/path identity drift、symlink/hardlink/special/wrong mode/escape
- 2 review rounds以内にexact 3/3 ACCEPT未達
- review後のrelevant bytes変更
- scope/identity/project/team/environment/Stripe mode/database/catalog drift
- Production/Preview/LINE/live Stripe/real customer invariant不明または変化
- journal/readback欠落、unknown result、idempotency reconciliation不能
- observation threshold未達、critical/race/privacy/duplicate >0
- rollback initiation >60秒またはcompletion >600秒
- authentic Gate C attestation不在のままGate Dへ進もうとした場合
- Gate D PASS不在のままGate Eへ進もうとした場合

ceiling拡張、新credential権限、manual alias、deployment delete、secret rotation、destructive migration、Production releaseが必要ならこのauthorizationでは許可されない。HOLDしてdirect Owner decisionを求める。

## 13. evidence hygiene、validation、handoff

1. private raw evidenceはowner-only 0600、public evidenceはsanitized additive JSON/Markdownに分離する。
2. 全JSON parse、SHA chain、manifest verifier、privacy scannerを実行する。
3. scopeに応じnode syntax/module load、explicit local ESLint、TypeScript、unit/fixture/API/DB/race/rollback/buildを実行する。pre-reviewにpackage install/resolution/networkを起こさない。
4. secret-like key nameだけで漏えい判定せずvalue/path/encoding/identityを検査し、unknown high-entropy/private identifierはfail closedする。
5. evidenceを書き換えた後のattestationは無効。re-freezeとfresh human reviewが必要。
6. files、commands、exit codes、counts、hashes、phase/lifetime external-call counters、remaining ceilings、limitationsをcheckpointごとに記録する。
7. terminal publishはexclusive same-directory temporary file、file fsync、atomic rename、directory fsync、post-write hash、resolver TERMINAL/1で検証する。
8. `docs/AI_WORK_LOG.md`へcompact rowを追記し、active state/next actionが変われば `docs/AI_CURRENT_STATUS.md`を更新する。
9. external researchが追加で必要になった場合、pre-review external-call ceiling 0のため実行せずHOLDする。3/3後に行う場合もofficial primary sourcesだけを使いcall counterへ計上する。

最終応答は、到達gate/state、PASS/HOLD、変更ファイル、主要検証、operation counters、phase/lifetime external-call countersと残量、terminal/checkpoint path+SHA、後続に必要なauthentic human actionを簡潔に報告する。

## END PROMPT
