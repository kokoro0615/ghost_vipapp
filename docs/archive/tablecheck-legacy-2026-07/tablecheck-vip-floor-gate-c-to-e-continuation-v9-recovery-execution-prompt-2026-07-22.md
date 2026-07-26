# GHOST Osaka VIP Floor — Gate C artifact recovery → Gate D → Gate E v9 execution prompt

以下の `BEGIN PROMPT` から `END PROMPT` までを、新しい primary implementation session へそのまま渡して実行する。

## BEGIN PROMPT

あなたは現在の GHOST workspace repo root の primary implementation coordinator です。目的は、v8 の truthful Gate C HOLD terminal を改変せず immutable ancestor として受け入れる `gate-c-to-e-continuation-v9-recovery` lineage を開始し、credential-bearing artifact risk と v7r5 の全 blocker を閉じ、真正な Gate C PASS 後だけ Gate D、Gate D PASS 後だけ Gate E を実装・検証することです。

これは実装、検証、許可済み custom-staging 実測、rollback、証跡化まで行う execution prompt です。ただし、authority・scope・identity・credential・lineage・ceiling の不一致、または未確認事実を推測で埋めてはいけません。未来の人間 attestation は AI が作成・代筆・事前充足できません。

## 0. 開始条件と絶対ルール

1. 最初に repo root の `AGENTS.md`、`docs/AI_CURRENT_STATUS.md`、`docs/AI_WORK_LOG.md` の最新行、`docs/AI_AGENT_SYNC.md` を読む。
2. `website/` を扱う前に `website/AGENTS.md` を読み、UI 実装へ到達した場合だけ `.Codex/docs/DESIGN.md`、`website/docs/ui/UI_TOOLKIT.md`、closest existing page/component を追加で読む。
3. dirty worktree は利用者のもの。無関係な変更を修正、削除、stash、reset、checkout、上書きしない。
4. evidence は additive-only。既存 JSON、manifest、review、freeze、terminal、research note を変更・削除・再生成しない。
5. secret、token、cookie、JWT、customer PII、ciphertext、provider object ID、private URL、private absolute path、raw webhook body を chat、stdout、public evidence、git diff、snapshot、screenshotへ出さない。
6. Production、Preview、LINE、live Stripe、real customer data の mutation は 0。deployment delete、manual alias mutation、secret creation/rotation/content mutation、Gate C migration、package lock、down/destructive migrationも 0。
7. この節と §1 の authority/terminal 検証が完了するまで実装しない。terminal resolver より前に secret、credential、private artifact、provider/runtime API へ触れない。
8. pre-review の唯一の secret-read 例外は §3.2 の exact-value HMAC leak scan 1回だけ。その他の credential/provider/runtime access は fresh manifest の exact 3/3 ACCEPT 後だけ。
9. 各 external mutation は `journal → exact identity/scope/ceiling check → mutation → authenticated readback → postcondition → counter update` で実行する。unknown outcome は ceiling を消費し、blind retryしない。
10. Gate 順序は `C recovery → authentic signed C PASS → D → truthful D PASS → E`。条件未達の後段を scaffold、実装、表示、deployしない。
11. 事実が不足する場合は HOLD。警告や不明値を PASS に変換しない。

## 1. exact v9 authority と immutable ancestor

`website/` を基準に、次の3ファイルの存在、JSON parse、SHA-256、相互参照を exact 検証する。1 byteでも異なる場合は実装前に停止する。

| 種別 | path | SHA-256 |
|---|---|---|
| direct Owner directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v9-recovery-owner-directive-v1-20260722T050716+0900.json` | `d95cf507c48b544d261f3313fe602b6a9cb31ca7f29e92abfffdbbe70f8b9520` |
| exact v9 proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v9-recovery-authorization-proposal-v1-20260722.json` | `a141d4ed56fc2cba63fb31adf9fa2d59de8aaaa4efb9967cf53dbfa9b2ae0980` |
| exact Owner authorization | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v9-recovery-owner-authorization-v1-20260722T050745+0900.json` | `44ceb50f5c064aeb010f2777ade5cf4635a157cfec80a28c129d6e9409c3f476` |

この authorization は proposal を expansion なしで exact 採用する。future PASS、future human signature、Production release、live provider、real customer、ceiling 拡張は許可しない。

次を immutable ancestor として exact 検証し、v9 の全 hash chain へ含める。

| 種別 | path | SHA-256 |
|---|---|---|
| v8 truthful terminal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-hold-v8-20260722T045500+0900.json` | `75a9914d8fb74ed635c00d8c372f09f493df84c6db513ae44f41a66ef802793a` |
| v7r5 source/artifact freeze | `docs/evidence/vip-floor-v2/gate-c-continuation-runtime-source-artifact-freeze-v7r5-20260722T041500+0900.json` | `94ce681e82b98fd7982bbb3170a8dca0818f34dfad595083599bd0bde1b65717` |
| v7r5 rejected manifest | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-manifest-v7r5-20260722T042000+0900.json` | `3c49667327001175fa6f93c0c0912f202a05c94c3934cb4e80b3a93673ae4a1f` |
| v7r5 rejected 3-review result | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-review-v7r5-reject-20260722T042500+0900.json` | `840a860801c49459acf75a5a62137b636f21e8ef1911c089b2c96620f253df63` |
| v7r6 artifact HOLD finding | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-artifact-credential-candidate-hold-v7r6-20260722T045300+0900.json` | `1cf5162d50bfe43cfbec3344afa1fd336ba745e2bf4f0619c2eca497d96a08c3` |

v7r5 freeze の ancestor 値は `source=66da26c4a792712a8823cb51755521848685e2c67cd2f7568aa14c152b93ac16 / 225 files`、`migration=c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272 / 31 files`、`artifact=df9c5ee0782e8b0c00b7b76a395104db1fa4184dbc60186f5aebbc6f69c225e2 / 1505 files`、`providerComparable=e173965231e41c1a30cad709e28d117d694bc11a5675c08b7e33a2430bc9acd6 / 1827 files`。これらを remediation 後の current 値として流用しない。

### 1.1 v9 terminal resolver

新 lineage 名は exact `gate-c-to-e-continuation-v9-recovery`。

- v8 terminal は truthful immutable ancestor であり、編集・削除・置換・2つ目の v8 terminal 作成は禁止。
- v9 の全 privileged entrypoint は、secret read、private artifact read、API call、mutationより前に同じ fail-closed resolver を通る。
- resolver は exact v8 terminal SHA を v9 ancestor として受理し、他の terminal、lineage collision、ancestor drift、既存 v9 terminal、複数 terminal を拒否する。
- booby-trap fixture で collision 時の `secretReads=0 / externalCalls=0 / externalMutations=0` を実証する。
- v9 terminal は全工程を通じて最大1件。Gate C signed PASS と Gate D PASS は non-terminal decision record。真正な post-evidence attestation 待ちは `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` non-terminal checkpoint。
- 回復不能な breach、または最終 Gate E PASS/HOLD に到達したときだけ、exact 1 terminal を same-filesystem atomic publish する。

## 2. 実装前 baseline と変更 allowlist

作業前に current `git status --short`、関連 file hashes、Node/npm/Postgres/tool versions を sanitized freeze する。既存 dirty work と自分の変更を明確に区別する。

Gate C recovery の source 変更 allowlist は次だけ。

1. `next.config.ts`: provider-upload output-file tracing から environment payload filename を除外する設定。
2. `v7r7` 以降の新しい versioned Gate C recovery scripts、runtime tooling、validators、schemas、fixtures、evidence。
3. 18 blocker を正直に閉じるために不可欠で、proposal の narrow Gate C control scope に収まる既存 recovery tooling/runtime control の変更。変更理由と exact ancestor diff を closure ledger に記録する。

予約 business semantics、payment flow/public response、UI、migration bundle、package lock、一般機能、既存 v7r5/v7r6 evidence の変更は禁止。必要になった場合は実装を止め、scope expansion HOLD とする。

`next.config.ts` は installed Next 16.2.10 docs と local type definition を一次資料として再確認する。既存設定を保ったまま top-level `outputFileTracingExcludes` の route-global key `/*` へ、project-root 基準で root と nested の `.env*` を覆う glob を merge する。曖昧な broad source exclusionや business/runtime module exclusionを追加しない。

## 3. Phase C0 — credential-safe artifact recovery

### 3.1 v7r7+ version discipline

v7r5 と v7r6 は immutable。新規 tooling/evidence の version floor は `v7r7`。修正ごとに version を上げ、reject reviewやfailed candidateを上書きしない。

最初に source freeze plan、build attempt ledger、candidate/adoption ledger を作り、次の hard ceiling を executable guard にする。

- isolated credential-free local build attempts: max 3
- source boundary freeze: max 1
- candidate artifact freezes: max 2
- exact adopted artifact boundary record: max 1。必ず candidate 1件の exact bytesを参照し、3つ目の artifact build/freezeにしてはならない
- second candidate: 第1 candidate が external access/mutation より前に rejected の場合だけ
- historical evidence rewrite/delete: 0

### 3.2 private environment-file security exception

v7r6 finding が識別した単一の ignored environment file だけを対象に、resolver 通過後、次を private process 内で行える。

1. current owner、regular file、non-symlink、link count 1、exact path identity を content read 前に確認する。
2. mode が 0600 でなければ permission tightening を exact 1回まで行い、readbackする。content modify/delete は 0。
3. secret valueを stdout、shell trace、argv、environment、temp log、public evidenceへ出さず、content readを exact 1回だけ行う。
4. ephemeral private run-key で各 non-empty secret valueの HMAC fingerprint を作り、candidate/provider-upload全 regular file bytesの exact-value match を検査する。run-key と raw value は保存・公開しない。
5. public evidence へは target file identity hash、permission/read counts、scanned value count、match count、pass/fail だけを記録する。secret value、digest dictionary、raw filename/value pairは記録しない。

この1回以外の pre-review credential read、provider API、runtime API、external mutation は 0。

### 3.3 isolated credential-free build

- `mktemp -d` 等の exact private temporary directory を使い、workspace rootや home を削除対象にしない。
- tracked/current sourceを isolated copyへ構成し、root/nested の全 `.env*`、credential files、private evidence、untracked secretsを copy inputから除外する。
- build child processへ secret-bearing host environmentを継承しない。必要な非secret build settingは allowlistし、値を public evidenceへ出せるものに限定する。
- build前に copy manifest、excluded-path class counts、source hashを記録する。actual secret path/valueを public outputへ出さない。
- build後に exact provider upload manifestを生成し、`.env*` path 0、credential candidate 0、HMAC exact-value match 0、symlink 0、path escape 0を必須にする。
- input、artifact、provider-comparable の各 entryについて regular file、owner、link count、mode、resolved path containmentを検証する。private raw artifact/evidence は directory/fileとも owner-only 0600相当にする。
- build attemptが失敗しても ceilingを消費する。原因不明の同一 retryは禁止。3回で安全な candidateを得られなければ HOLD。

sourceは最終 allowlist diff を確定した時点で1回だけ freezeする。candidate artifactは immutableにfreezeし、採用 recordは exact candidate SHA、source SHA、migration SHA、provider-comparable SHAを結ぶ。migration hash/countは ancestorと exact equalityでなければ失敗。

## 4. Phase C0 — 19 blocker closure

各 finding について `findingId → root cause → changed files → executable implementation → positive test → real negative fixture → reviewer evidence` の closure ledger を作る。文字列存在、self-asserted boolean、unwired counter、dependency-only synthetic entrypointで閉じてはならない。

### 4.1 provenance 4件

1. `PROV-V7R5-01`: authorized ceilingsを exact `prebuilt 1 + runtime 6 + watchdog 2 = total 9`、webhook update 9へ直し、manifest schema/verifier/runtime counterが同じ値を fail-closed bindする。
2. `PROV-V7R5-02`: 全 privileged executable と actual source runtime loader pathの closureを実 import/traceする。main runnerは preflightだけでなく全 state machine actionへ到達可能であることを示す。
3. `PROV-V7R5-03`: closure ledgerの全 fixtureが resultへ存在し、各 guardを実際に破壊する。terminal collisionは callable secret/API hooksをbooby trapにする。
4. `PROV-V7R5-04`: immutable ancestorと current の complete path/hash set、全 before/after hash、added/changed/deleted setを比較し、allowlist外差分と omissionを拒否する。

### 4.2 runtime 8件

1. `RUNTIME-V7R5-01`: deploy/webhook ceilingsを proposal exact値へ縮小し、manifest/verifier/runnerで一致を強制する。
2. `RUNTIME-V7R5-02`: readiness、reconciliation、journaled mutation、cycle runner、observation collector、rollback worker、evidence assembler、terminal publisherを main runnerから executableにする。
3. `RUNTIME-V7R5-03`: 全 operational entrypointの real loader closureを取り、direct SDK importだけの synthetic traceを closure evidenceとして使わない。
4. `RUNTIME-V7R5-04`: Vercel/LINE invariant acquisitionを cursor exhaustionまで実装し、private run-key HMAC producerで value-sensitive before/afterを比較する。取得不能を unchangedにしない。
5. `RUNTIME-V7R5-05`: exact synthetic row IDsを pre-frozen ledgerへ bindし、route auth、DB claim CAS、worker、request/provider metadata、idempotency、provider readbackを実 consumer fixtureで通す。foreign/non-synthetic/unscoped claimを拒否する。
6. `RUNTIME-V7R5-06`: `(cycleOrdinal, actionOrdinal, phaseOrdinal)` の contiguous monotonic sequence、global cycle binding、exact `intent → receipt → readback`、rollback event orderと全 compensation stepを強制する。
7. `RUNTIME-V7R5-07`: DB CAS requestへ expected revision、same-request `RETURNING` receipt、authenticated idempotency reconciliation、ceiling consumption、unknown-outcome HOLDを実装する。before/after差から affected rowsを推定しない。
8. `RUNTIME-V7R5-08`: exact staging catalog extractorと authenticated observation collectorを実装し、duration、unique attributable count、success rate、p95、critical/race/privacy/duplicate thresholds、rollback integrationを strict enforcementする。

### 4.3 security 6件

1. `SEC-V7R5-01`: manifestの全 ceilingを exact authorityへ bindし、拡張値、missing/null/string/negativeを拒否する。
2. `SEC-V7R5-02`: journal、namespace、ceiling、provider state machineを含む runtime security boundaryを executable/frozenにする。
3. `SEC-V7R5-03`: terminal collision fixtureで real callable API/secret-reader trapが0回のまま停止することを示す。
4. `SEC-V7R5-04`: privacy scannerを provider identifiers、opaque/high-entropy credentials、expanded PII/ciphertext、nested object、URL/header/query、escaped/base64-decoded classificationへ拡張する。fixtureは明白な dummyだけ。
5. `SEC-V7R5-05`: input/artifact pathを content read前に resolveし、symlink、non-regular、wrong owner、link count、mode、escapeを各 fileで拒否する。artifact symlinkは0。
6. `SEC-V7R5-06`: synthetic adminを role capability、namespace、actual admin/worker/Turnstile consumerまで認証し、negative pathsを実行する。任意の valid sessionやself-asserted booleanを合格にしない。

### 4.4 artifact blocker 1件

`ARTIFACT-V7R6-01`: isolated source copy + `outputFileTracingExcludes` + exact provider manifest検証により、provider upload内の environment payload path、credential candidate、known-secret HMAC matchを全て0にする。旧 artifactを削除・改変せず、new source/candidate/adoption hashesを additiveに結ぶ。

## 5. fresh manifest と exactly three read-only reviews

current bytesから fresh v7r7-or-later manifestを1件 freezeする。最低限、次を含める。

- exact v9 directive/proposal/authorization、v8 terminal、v7r5/v7r6 ancestor hash chain
- current source/migration/candidate/adopted artifact/provider-comparable hashesとcounts
- complete ancestor/current diffと allowlist判定
- 全 executable/library/schema/fixture/package transitive/import loader closure
- 19-finding closure ledgerと全 positive/negative result
- terminal/resume、journal、state machine、pagination、CAS、cycle、observation、rollback contracts
- artifact credential/path/HMAC/symlink/mode scan結果
- exact ceilings、initial counters、pre-review exception accounting
- public privacy scan 0 finding

verifierは self-referenceを除く全 declared bytesを再hashし、undeclared privileged entrypoint、missing/extra executable load、symlink/path escape、mode violation、authority ceiling drift、fixture/result mismatchを拒否する。

同じ exact manifest bytesへ、exactly 3件の独立 read-only reviewを行う。

1. provenance: hash chain、complete diff/closure、fixture実体、artifact adoption、terminal lineage。
2. runtime: 全 entrypoint load、state machine、pagination、catalog、cycle attribution、CAS、observation、rollback。
3. security: credential/artifact boundary、booby trap、privacy scanner、synthetic auth、scope/ceiling fail-closed。

各 review JSON は `independent=true`、`readOnly=true`、`externalCalls=0`、`externalMutations=0`、`secretReads=0` を required integer/boolean として持つ。reviewerは code/manifestを変更しない。3/3 ACCEPT、blocker 0、同一 manifest SHAでなければ後続の credential/provider/runtime accessへ進まない。REJECTを保存し、versionを上げて fresh manifest/reviewをやり直す。

## 6. 3/3 ACCEPT後の private readiness と all-off bootstrap

post-review hard ceiling:

- private credential reads: max 8
- authenticated read-only provider/runtime API calls: max 4096
- raw private evidence: owner-only 0600
- public evidence: sanitized counts、booleans、scopes、timestamps、HMAC identitiesだけ

最初に resolver と authority countersを再検証する。次に credentialを値非表示で loadし、authenticated principal/team/project/custom-staging identity、Production/Preview/LINE invariants、Vercel deployments/aliases/environment/custom-environment全pagination、Stripe test endpoint/key capability、Supabase project/database/migration/catalog、current countersを read-onlyで取得する。

fresh remediation sourceの readiness endpointは remote deployment前には存在しない可能性がある。したがって、3/3 ACCEPT後に限り、次の特例 sequenceを使う。

1. provider identity、project、custom-staging scope、production isolation、artifact identityを既存 authenticated read-only APIで確認する。
2. exact adopted artifactから feature flags/DB dual-write/runtime mutationを全て off にした `all_off_bootstrap` custom-staging deploymentを、prebuilt deploy ceiling内で最大1回 journalして作成する。
3. provider-assigned staging URL/aliasだけを exact deployment identityへ bindして分類する。manual aliasは0。
4. deployment receiptと authenticated provider readbackを取得する。
5. 新 readiness endpointを authenticated accessし、artifact/source/runtime identity、all-off flags、exact catalog、synthetic consumer capabilityを確認する。

bootstrap/readinessが失敗したら deploymentは inert/all-offのまま保持し、deleteせず HOLD。readinessを通すための2回目 bootstrapや manual aliasは禁止。

### 6.1 synthetic admin fallback

existing valid authorized admin sessionを read-onlyで先に探す。存在するなら新規作成しない。存在せず、fresh readinessの actual admin consumer検証に不可欠な場合だけ exact synthetic namespaceで次を行える。

- least-privilege manager principal create max 1
- manager session create max 1
- auth consumerによる session `last_seen_at` touch max 16
- session retire max 1
- principal disable max 1
- audit rows retained
- existing real admin/staff/customer mutation 0

各操作を journal/readbackし、public evidenceへ actual credential/session/principal IDを出さない。role/capability/namespace/expiry/disabled stateを sanitized proofにする。

## 7. Gate C bounded custom-staging execution

runnerへ次の ceilingを hard-codeではなく authority manifestから exact bindし、拡張値を拒否する。

| 操作 | 上限 |
|---|---:|
| prebuilt custom-staging deploy | 1 |
| runtime-state custom-staging deploy | 6 |
| watchdog rollback custom-staging deploy | 2 |
| total new custom-staging deploy | 9 |
| provider-assigned URL/alias classification | 9 |
| existing Stripe test webhook target update | 9 |
| authenticated webhook compensation | 1 |
| DB setting CAS / affected rows | 3 / 3 |
| synthetic business cycles | exact 2, max 2 |
| deployment delete/manual alias/project config/persistent env/schema | 0 |

Stripeは test mode、least-privilege restricted key、API version `2026-04-22.dahlia`。key creation/rotationは0。webhookは endpoint-specific secret、raw body、`Stripe-Signature`、timestamp toleranceで検証する。logical operationの idempotency keyを retry/reconciliationで変えない。secretやraw bodyを log/evidenceへ残さない。

### 7.1 exact state sequence

次を省略・並べ替えず、各 state に `intent → mutation receipt → authenticated readback` を持たせる。

1. `all_off_bootstrap`
2. `db_only`
3. `db_shadow`
4. `both_on_business_cycle`
5. `node_rollback`
6. `restored_all_off`
7. `node_only_invalid` — fail-closed proof
8. `final_all_off`

availability と begin-hold を同時切替し v1 shapeを維持する。Node/DB misalignment、identity/alias/env drift、readback不一致は即 abort。

### 7.2 exact two synthetic cycles

pre-frozen synthetic namespaceと exact row-ID ledgerだけを使い、各 cycleで availability、hold、applicable test payment/setup、signed webhook、duplicate/replay/idempotency、retry/failure/conflict、namespaced worker claim、provider side-effect count、DB reservation/payment/assignment/audit/revision readbackを実行する。foreign/non-synthetic/real customer rowsは claimしない。

unknown Stripe outcomeは同じ idempotency identityで read-only reconciliationし、確定不能なら retryせず HOLD。provider duplicateは0。

### 7.3 observation acceptance

- duration ≥ 1,800,000 ms
- unique attributable accepted comparisons ≥ 1,000
- shadow success rate ≥ 0.999
- p95 overhead ≤ 25 ms
- critical mismatch = 0
- snapshot race = 0
- privacy violation = 0
- duplicate provider effect = 0

strict schema/authenticity/correlationを通った unique comparisonだけを数える。duplicate collapse、request count、foreign cycle、unknown writer/classificationを水増しに使わない。expected divergenceは pre-frozen ruleとの exact matchだけ。

### 7.4 abort と rollback

最初の abort predicate成立を monotonic clockで immutable記録し、60秒以内に rollback開始、600秒以内に authenticated `all_off` completionを実測する。

1. v2 UI/read off
2. v2 mutation off
3. Node public dual-write off
4. v1 availability/hold/admin health確認
5. DB dual-write CAS off
6. migrations/rows/audit保持、down migration 0
7. webhook targetを authenticated before値へ compensate
8. provider/DB/runtime/Production/Preview/LINE exact readback

unknown outcomeは該当 ceilingを消費。blind retry、evidence削除、deployment delete、manual aliasによる回避は禁止。SLA超過または不明 readbackは Gate C HOLD/FAIL。

## 8. Gate C evidence、audit、future human attestation

fresh Gate C summary/manifestは clean PG16、全 migration、mandatory/race/rollback、writer coverage、catalog/reconciliation、2 cycles、1,000 comparisons、Stripe/webhook/refund、flags before/after、v1 fallback、privacy scan、全 counters、rollback timing、current hashesを linkする。normal audit と require-pass auditの両方を exit 0にする。

その後だけ final manifest SHAを freezeし、Owner / Floor Manager / Engineerの post-evidence role attestationを人間から取得する。既存 `docs/evidence/vip-floor-v2/gate-c-signature-governance-amendment-v2-20260715.json` が exactに有効な場合、同じ実在人物が3役を担えるが、同じ final manifest SHA、Owner → Floor Manager → Engineerの distinct timezone-bearing timestamps、role-specific codes、strong-MFA provenanceが必要。

AIは name、timestamp、MFA、signatureを合成しない。この v9 Owner authorizationを final PASS attestationへ転用しない。真正な3 role recordが無ければ `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` non-terminal checkpointを publishし、Gate Dを開始せず停止する。揃った場合だけ `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED` non-terminal decisionを atomic publishする。

## 9. Gate D — authentic signed Gate C PASS後だけ

開始条件は exact `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED`。開始時に repoのUI instruction、GHOST design authority、UI toolkit、closest existing v1 sourceを読み直す。

scopeは v8 authorizationから変更しない。

- VIP Floor v2 server-gated admin UI
- floor/chart/list、detail/form、core commands
- dedicated mobile IA、accessibility、performance
- one-action immediate v1 fallback
- Production flags default off
- custom staging deploy max 6 + watchdog rollback max 2 = total max 8
- schema mutation 0、real customer 0、external payment/notification effect 0

first viewportで GHOST Osaka VIP reservation operations、business date、primary operational actionが即理解できること。black-violet lacquer、champagne metal hairline、LED rhythm、real floor geometry、dense operational scanningを使う。generic hero/card dashboard、AI glass、purple/blue orb、bokeh、floating translucent/nested cards、SaaS white/gray/blue、過剰な角丸は禁止。

Server Componentで auth/capability/flagを解決し、flag off時は現行 v1をそのまま表示する。URLへ PII/internal UUID/provider IDを入れない。390pxでprimary action、44px重要 touch target、長い日本語/英語 label、keyboard/focus/reduced-motion/contrastを検証する。

read-only shell → three-view parity → core operations → mobile/quality の順で進み、revision convergence、capability、conflict、idempotency、audit、fallback、visual regression、performance、floor-manager rehearsalを evidence化する。全 acceptanceが truthful PASSの場合だけ `GATE_D_PASS_PHASE_E_AUTHORIZED` non-terminal decisionを publishする。

## 10. Gate E — truthful Gate D PASS後だけ

scopeと ceilingは v8 authorizationから変更しない。

- data-first service periods、waitlist、blocks、staff operations、exception recovery
- customer dossier/contact activity、attachments、online acceptance、outbox
- data/API PASS後の dense operations UI
- local additive migrationのみ
- staging migration bundle apply max 1、destructive/down 0
- custom staging deploy max 6 + watchdog rollback max 2 = total max 8
- synthetic customer records max 50、real customer 0
- LINE/SMS/live notification 0、Stripe mutation 0
- notificationは deterministic fake/sink adapterだけ
- Production flags default off

E0 contract freeze → E1 schema/RPC/API data gate → E1b dossier/attachments → E2 UIの順序を守る。RLS/ACL、race、idempotency、revision、outbox retry/dead-letter/reconcile、masked/capability states、audit、fallbackを検証する。external failureが reservation transactionを壊さないことを fixtureと stagingで証明する。

Gate E全 acceptanceがPASSなら final stateを安全に確認して exact one terminal `GATE_E_PASS_GATE_C_TO_E_CONTINUATION_COMPLETE` を atomic publishする。未確認または失敗なら flags-off/fallback/readbackを行い、truthful `GATE_E_HOLD` terminalを exact one publishする。

## 11. stop conditions

次のいずれかで新 mutationを止め、既に許可された rollback/compensationだけを行う。

- authority、ancestor SHA、lineage、terminal invariant不一致
- secret/PII/provider ID/private URL/pathの public leak
- build/freeze/review/read/API/mutation counterの ceiling到達または超過
- scope/identity/project/team/environment/Stripe mode/database/catalog drift
- 3/3 review未達、review後の relevant bytes変更
- artifact credential candidate、environment payload、known-secret HMAC match、symlink/path escape/mode violation
- Production/Preview/LINE/live Stripe/real customer invariant不明または変化
- journal/readback欠落、unknown result、idempotency reconciliation不能
- observation threshold未達、critical/race/privacy/duplicate > 0
- rollback initiation >60秒または completion >600秒
- authentic Gate C attestation不在のまま Gate Dへ進もうとした場合
- Gate D PASS不在のまま Gate Eへ進もうとした場合

ceiling拡張、新しい credential権限、manual alias、deployment delete、secret rotation、destructive migration、Production releaseが必要なら、この authorizationでは許可されないため HOLDして direct Owner decisionを求める。

## 12. evidence hygiene、validation、handoff

1. private raw evidenceは owner-only 0600、public evidenceは sanitized additive JSON/Markdownに分離する。
2. 全 JSON parse、SHA chain、manifest verifier、privacy scannerを実行する。
3. scopeに応じ node syntax/module load、target ESLint、TypeScript、unit/fixture/API/DB/race/rollback/buildを実行する。
4. secret-like key nameだけで漏えい判定せず value/path/encoding/identityを検査する一方、unknown high-entropy/private identifierは fail closedする。
5. evidenceを書き換えた後に作られた attestationは無効。re-freezeと fresh human reviewが必要。
6. files、commands、exit codes、counts、hashes、remaining ceilings、known limitationsを checkpointごとに記録する。
7. `docs/AI_WORK_LOG.md`へ compact rowを追記し、active state/next actionが変われば `docs/AI_CURRENT_STATUS.md`を更新する。
8. external researchを行った場合は primary/official sources、access date、inferenceを research noteへ記録する。

最終応答は、到達 gate/state、PASS/HOLD、変更ファイル、主要検証と結果、external counters/remaining ceilings、terminal/checkpoint path+SHA、後続に必要な authentic human actionを簡潔に報告する。実装途中でも commentaryは60秒以上途切れさせない。

## END PROMPT
