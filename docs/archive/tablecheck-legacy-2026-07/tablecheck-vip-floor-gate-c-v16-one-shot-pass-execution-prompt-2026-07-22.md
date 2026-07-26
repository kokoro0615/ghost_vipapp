# GHOST Osaka VIP Floor — V16 Gate C one-shot remediation, execution, attestation, and PASS prompt

以下の `BEGIN PROMPT` から `END PROMPT` までを、新しいprimary implementation sessionへそのまま渡す。

実行には、Owner本人が事前または実行sessionのauthorization checkpointで次の2行をdirect messageとして返す必要がある。prompt転送だけをauthorizationへ推論しない。

`OWNER_VIP_FLOOR_V16_GATE_C_ONE_SHOT_EXECUTION_AUTHORIZATION_V1`
`1eb258df331a88b8c96b36006919b3a3a800785bcf5a26e1b6fc5572ef27e974`

## BEGIN PROMPT

あなたはGHOST workspaceのrepo rootで作業するprimary implementation coordinatorです。目的は、V13/V14/V15 historyをbyte-immutableに保持した新lineage `gate-c-to-e-continuation-v16-gate-c-pass` で、V15のcatalog identifier blockersを根治し、fresh exact reviewを通し、private pre-bootstrapからcustom staging Gate C runtime、rollback、post-evidence human attestation、`--require-pass` audit、atomic terminalまでを完遂して、truthfulな `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED` を得ることです。

「必ず通過」は証拠を捏造する意味ではありません。外部credential不在、provider outage、人間attestation不在などのrecoverable prerequisiteではterminalを発行せず、必要な値を表示させないhuman checkpointとしてpauseし、同じexact authorityで再開します。認可上限のhard exhaustion、production境界違反、秘密漏洩、または不可逆なunknown outcomeだけがterminal HOLD候補です。

Gate D/Eはこのpromptで開始しません。

## 0. Startup and absolute rules

1. 最初にrepo rootの `AGENTS.md`、`docs/AI_CURRENT_STATUS.md`、`docs/AI_WORK_LOG.md` 最新行、`docs/AI_AGENT_SYNC.md`、`website/AGENTS.md` を読む。
2. installed `stripe-best-practices` skillとsecurity referenceを全文読む。Stripe API version `2026-04-22.dahlia`、sandbox restricted key、raw-body webhook signature、idempotency、secret非出力を維持する。
3. dirty worktreeは利用者のもの。無関係な変更を修正、削除、stash、reset、checkout、上書きしない。
4. evidence/historyはadditive-only。V15以前のsource/tooling/manifest/review/authority/terminal/HOLD/fixture/researchを変更・削除・rename・再生成しない。
5. source、migration、artifact、provider closureのcanonical boundaryを変更しない。V16はversioned Gate C tooling/evidenceだけを追加する。境界変更が必要ならterminalではなくnew-authority checkpointでpauseする。
6. secret、token、cookie、JWT、customer PII、provider object ID、private URL、private absolute path、raw webhook body、deployment URLをchat、stdout、public evidence、diffへ出さない。
7. `npx`、package install/update、lockfile変更、remote package resolution、automatic update checkは禁止。既存local Node/binaryだけを使う。
8. Production、Preview、LINE、live Stripe、real customer mutationは常に0。custom staging、Stripe sandbox、namespaced synthetic customerだけを対象にする。
9. future PASS、provider state、人間attestationを合成しない。AI proxy signatureは禁止。
10. commentaryを60秒以上途切れさせず、authority、offline seed proof、catalog readback、各review round、pre-bootstrap、deploy、cycle、observation、rollback、attestation、terminalのcheckpointを共有する。
11. AGENTS.mdのimplementation coordinationに従い、独立reviewはprovenance/runtime/securityの3 roleで行う。各reviewerはread-onlyで同一manifestだけを審査する。
12. recoverable checkpointでは終了宣言をせず、必要なhuman actionを値非共有で一つだけ依頼し、応答後に同じphaseから再開する。

## 1. Exact authority checkpoint

`website/`基準で次をJSON parse、SHA-256、相互参照までexact検証する。

| kind | path | SHA-256 |
|---|---|---|
| V16 Owner directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v16-gate-c-pass-owner-directive-v1-20260722T223000+0900.json` | `30c03fec9889c83c0d2466c1f6a03655abd9e84fb17a89d68fd8f2120cc65f6f` |
| V16 pass strategy | `docs/research/tablecheck-vip-floor-gate-c-v16-pass-strategy-research-2026-07-22.md` | `f3e5539bfbc3b77bf44069c1b9028e167bb1437bd32e4d4468df468e130fe970` |
| V16 exact proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v16-gate-c-pass-authorization-proposal-v1-20260722.json` | `1eb258df331a88b8c96b36006919b3a3a800785bcf5a26e1b6fc5572ef27e974` |
| V13 terminal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-v13.json` | `575671d7a21341cb24daaf8df69dab7d8b61069742d7f83b00b8cb33961304fc` |
| accepted V14 manifest | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-manifest-v14r6-20260722T180000+0900.json` | `70fe30aa267d603cad8cb0984299792e361565f628511431d7f3f4c61d57afc0` |
| accepted V14 review | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-review-v14r6-accept-20260722T184500+0900.json` | `4749eeacfef3538a1a17b8bb7ae55dbadf4530b31ca795ab2215bfe532aacdbd` |
| V15 manifest | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-manifest-v15r1-20260722T214500+0900.json` | `0dff01ca1a1f018d17546ba273d8faf3c9df1c980d16c66f0913c6e460b8e4e1` |
| V15 reject review | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-review-v15r1-reject-20260722T221500+0900.json` | `6f299ec8069dbcd6a14c29739742d946932e5beae0e68e94d50e45fd10f3b636` |
| V15 HOLD | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v15-remediation-review-hold-20260722T222000+0900.json` | `8cd1416e1e49cd4761015241b346a730ceb7b064d67aecfe6a0a21488ba72cec` |

canonical V14/V15 terminalは不在、current terminalはV13 exactly oneでなければならない。

Owner authorization fileがまだ無ければ、次のexact 2行をOwner本人へ要求し、terminalを作らずpauseする。

`OWNER_VIP_FLOOR_V16_GATE_C_ONE_SHOT_EXECUTION_AUTHORIZATION_V1`
`1eb258df331a88b8c96b36006919b3a3a800785bcf5a26e1b6fc5572ef27e974`

direct response受領後だけ、source message、principal、directive SHA、proposal SHA、exact adoption、全ceilingを持つversioned V16 Owner authorization JSONをadditive freezeする。AI proxy、別SHA、scope拡張、曖昧な承認は不可。authorization SHAを以降の全manifest/ledger/terminalへbindする。

## 2. Freeze the canonical application boundary

次をexact再検証し、private candidateのdescriptor-bound rehashは既存authority内の最大1回だけ行う。値やprivate pathは出力しない。

- source SHA `7f6b2dc10710c679496fcf4e8c253aab598529179df932a9900ec2243c267626`
- migration bundle SHA `c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272`
- artifact SHA `5796deeea2f6b250d66ec388c66f1fa8d4588bb153536d5d1adb2c1bd7aad5f9`
- provider comparable SHA `038f01c5a36b0387d27a2ebc6d5fde30308c94a233af134da32f856a304712cf`
- artifact 2380 files、provider 2701 files、candidate 2702 files / 1050 dirs / 2,492,495,223 bytes

source/migration/package/lock/artifact/provider/candidate driftがあれば流用せず、sanitized non-terminal authority checkpointで停止する。

## 3. Correct the V15 root cause offline

V15 filesは変更せず、V16 versioned resolver、authority verifier、identifier helper、runtime、bundle builder、bundle loader、bootstrap、manifest builder/verifier、review assembler、privacy scanner integration、fixturesを追加する。

### 3.1 Public identifier contract

canonical public identifierはlowercase ASCIIのbounded hyphenated textとし、normalize/trim/lowercase/UUID変換しない。config → catalog snapshot → hold body → SQL text lookupでbyte-identicalに保持する。

次のcase-insensitive shapeをすべて拒否する。version/variant bitを限定してはいけない。

`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`

最低negative matrix:

- nil UUID
- v1、v4、v6、v7、v8
- RFC variant外
- uppercase hex
- all-zero以外のarbitrary 8-4-4-4-12 hex
- empty、leading/trailing whitespace、tab/newline/NUL/control
- slash、backslash、dot traversal、query、hash
- uppercase non-UUID public slug
- 65 bytes以上、non-string

`actorAdminId`等のinternal UUID fieldは既存UUID contractを維持し、public identifier helperと混同しない。

### 3.2 Authoritative schedule seed proof

V15が省略した次のimmutable migrationをmanifest inputへ追加する。

- `supabase/migrations/20260530093000_ghost_vip_seed_event_days.sql` SHA `1dbca6f3ef7a74abbeeb8d0b7695ad4636fadc1d6ae06bc64fc5e912e5ad150b`
- `supabase/migrations/20260530095000_ghost_vip_seed_event_days_q4.sql` SHA `c1ffa4472e628232650f35a68db917a8d728d3cf4439c21c640d48e1f9e634cf`

static regexだけで実在を主張しない。disposable PostgreSQL 16へ31 migrationsをfilename順・`ON_ERROR_STOP`でapplyし、次をSQL queryで証明する。

- `event_days.business_date='2026-12-31'` exactly one
- `booking_slots.public_slot_id='ghost-osaka-20261231-2200'` exactly one
- slotが当該event dayへ属し、active=true、admin_only=false
- offering `royal-vip` exactly one、active=true
- resource `royal-vip-1` exactly one、active=true
- public IDsはtextでありinternal UUIDではない
- migration transaction failure/residue 0

fixtureはtransaction rollbackまたはdisposable cluster破棄で終了し、public evidenceにはpublic identifiers、booleans、counts、SHAだけを出す。internal row UUIDを出さない。

### 3.3 Review assembler correction

V15 assemblerはleading `--` key mismatchを持つ。V16は次のどちらか一つへ統一しpositive/negative fixtureを持つ。

- `--runtime=...` をparse時に `runtime` へcanonicalizeする、または
- consumerがexact `--runtime` keyを読む。

unknown key、duplicate key、missing key、empty value、path traversal、wrong manifest SHAはnetwork/file mutation前に拒否する。

### 3.4 Catalog-bound runtime

private configへ手入力slotを真実として置かない。configはbusiness date、guest count、offering allowlist、resource allowlist、synthetic namespaceを持てるが、cycleのexact public IDsはcontent-addressed catalog snapshotから取得する。

snapshot recordは次だけを許可する。

- business date / venue timezone
- public slot ID / start / end / bookable-until / active / admin-only
- public offering ID / guest bounds / active
- public resource code / capacity bounds / active
- capturedAt、query SHA、project identity hash、row-set SHA

internal UUID、customer、payment、provider ID、URL、credentialを含めない。selectionはstable sortで決定論的にし、cycle直前readbackとsnapshot hashが一致し、slotがfuture/bookable/activeの場合だけ進む。

## 4. Pre-manifest adversarial audit

manifest freeze前に最大3 roundのroot-owned adversarial auditを行う。最低限:

1. V15 runtime/security findingsをexact regression fixture化。
2. source/bundle export、identifier、catalog selection、ledger、rollback、terminal parity。
3. full transitive closureとdynamic route closure。
4. manifest self-reference、mode、symlink/hardlink、TOCTOU、0600 private boundary。
5. call/credential/mutation/deploy counter arithmeticとreserve。
6. production/Preview/LINE/live Stripe/real customer booby traps。
7. secret/private URL/path/provider ID/PII scanner positive fixtures。
8. assembler actual CLI invocation end-to-end。

failureはfixture期待値を緩めずadditive V16 implementationを直す。各audit resultはversioned保存する。

## 5. Bounded authoritative staging catalog snapshot

offline discovery toolingとprivacy fixturesがPASSし、V16 Owner authorizationがexactな場合だけ実行する。catalog discoveryはGate C lifetime 500 callsとcredential reads 8に含め、private durable ledgerをnetwork前に作る。

1. credential file boundaryをowner/0600/regular/non-symlink/nlink1/private parentで検証。値を表示しない。
2. exact custom staging Team/project identityをread-only確認。Production/Previewなら即abort。
3. fixed projectionだけでcatalogを読む。既存reviewed application read pathが完全なprojectionを返す場合はそれを優先し、不足時だけSupabase database-read scopeのread-only SQL queryを使う。
4. `SELECT`/read-only transaction以外をbooby trapで拒否する。queryはtable/column allowlist、single statement、no function call、no comments、no wildcardを要求する。
5. 0930/0950 migration由来のeligible rowとstaging rowをpublic identifier/business dateで照合する。
6. sanitized content-addressed snapshotをpublic evidenceへ保存し、private raw responseは0600で保持後、prompt既定のretention/cleanup contractに従う。

eligible rowが無い場合だけproposalのfallbackを使える。exact empty readbackとstaging identityを先に保存し、1 transactionでnamespaced event day最大1＋slot最大2を作る。offering/resourceは既存rowを変更しない。affected rowsは最大3。作成後exact readbackし、全mutationをforward mutation totalへ記帳する。Production/Previewなら構造上実行不能にする。

## 6. Rolling manifest and exact three-role review

最大6 round。各roundでbundle build最大1、manifest freeze最大1、provenance/runtime/security各1 dispatch。rejected roundのbytesを変更せず、次roundは新しいversioned files/manifestにする。

manifestは最低限次を含む。

- V13/V14/V15 immutable history、V16 directive/proposal/authorization。
- application boundary source/migration/artifact/provider/candidate exact identity。
- 0920/0930/0950 catalog seedsとdisposable PG proof。
- sanitized staging catalog snapshotとprivate raw snapshot descriptor hash。
- V16 executable/library/bundle/bootstrap/manifest/review/fixture transitive closure。
- V15→V16 added/changed/deleted。V15以前のdeclared bytes changed/deleted 0。
- pre-network ledger、counter ceilings/reserve、rollback plan、one-terminal resolver。
- privacy findings 0。

各reviewerは同一exact manifest SHAをread-only審査し、external call/secret read/provider API/file mutationを0とする。

Provenance review:

- authority/hash/manifest/closure/artifact identity
- actual executable entrypoints and held-bytes execution
- catalog snapshot provenance and disposable PG proof
- no hidden/deferred files or missing runtime route bytes

Runtime review:

- catalog selection → hold body → RPC text equality
- all call/credential/mutation/deploy accounting paths
- cycle, observation, webhook/refund, rollback, terminal completeness
- retry/coalescing/unknown outcome/watchdog behavior

Security review:

- all UUID-shaped traps and injection/traversal boundaries
- credential/private state/TOCTOU/public evidence privacy
- custom-staging-only enforcement and production booby traps
- restricted Stripe sandbox key and raw webhook signature contract

3/3 ACCEPT・blocker0ならaccepted aggregateをfreezeして§7へ進む。REJECTならfindingを具体的fixtureへ変換してadditive修正し次roundへ進む。最大6 roundを使い切るまではterminalを発行しない。

## 7. Pre-bootstrap initialization

accepted exact manifest/reviewへauthorityをrebindし、private config、synthetic ledger、admin session/actor bindingを初期化する。

- private root identity/hashを既存approved rootへexact bind。
- configはcatalog snapshot descriptorを参照し、invented public IDsを持たない。
- namespaced synthetic customerは `example.invalid` と予約済みtest phoneだけ。
- admin sessionはcustom staging/synthetic actorに限定し、strong-MFA human principal bindingを記録。
- Stripe keyは `rk_test_` restricted sandbox keyだけ。`sk_test_` fallback禁止。
- webhook signing secretはendpoint-specificで、API keyとは別credentialとして扱う。
- all flagsの初期状態はoff、DB dual-writeもfalse。

initialization後にheld bytes、permissions、nlink、hash、schema、catalog snapshot freshness、ledger zero-stateをreadbackする。

## 8. Custom staging Gate C execution

accepted V16 bootstrapをheld bytesから一度だけ起動する。driverはsingle lock、single plan、single durable ledger、single terminal namespaceを持つ。

### 8.1 Preflight

- Vercel exact Team/project/custom staging/environment identity。
- Production/Preview alias/domain/env/LINE fingerprints不変。
- artifact/provider/source/migration exact。
- Supabase exact staging project、migration head/bundle、catalog rows exact。
- Stripe sandbox exact account、restricted key class/least permissions、webhook endpoint/event set/signing secret binding。
- runtime source SHA、9 flags raw/configured disabled、DB dual-write=false。
- public and admin readiness authenticated; raw secrets/provider IDsを返さない。

### 8.2 Deployment

frozen `.vercel/output`だけをcustom stagingへprebuilt deployする。system environment依存を事前reviewし、source rebuildは禁止。provider-assigned custom-staging URL/aliasはprivate stateでexact分類し、Production/Preview alias mutationは0。

deploy responseがtimeout/unknownならretryしない。authenticated reconciliationでdeployment identity、READY state、file closure、runtime SHA、env/flag stateを確定する。

### 8.3 Runtime flag sequence

approved seven-state/all-off sequenceを維持し、Node flagとDB settingを各stepでreadbackする。不一致、unexpected enabled flag、Production/Preview driftで即rollbackする。

### 8.4 Two synthetic cycles

exactly two:

1. card setup cycle
2. refundable deposit cycle

各cycleでcatalog rowを直前readbackし、public hold、card/setup flow、signed test webhook、worker、admin confirm/check-in/cancel/refund pathを既存contractどおり実行する。test objectだけ。customer PII、raw provider payload、Stripe secretをevidenceへ出さない。

idempotent replay、webhook retry/failure、refund worker duplicate防止、provider-effect readback、DB version/revision、assignment/status projectionを検証する。

### 8.5 Shadow observation

- completed unique attributable comparisons >= 1000
- sample success rate >= 0.999
- critical mismatch 0
- privacy violation 0
- snapshot race 0
- unexplained missing/error 0
- p95 shadow overhead <= ratified budget
- log volume/cardinality <= ratified budget
- observation cursor/route/schedule/completion markers exact

comparison不足ならceiling内でwatcherを継続し、同じrequestを重複countしない。provider outageやrate limitはbackoffし、unsafe mutationを自動retryしない。

## 9. Mandatory rollback and final readback

PASS判定前にrollback rehearsalを行う。

1. mutation/read/dual-write/customer-profile flagsをapproved orderでoff。
2. DB dual-write setting false。
3. public hold/availability v1 fallback readback。
4. webhook endpointをbaselineへ戻し、compensation/readback。
5. synthetic catalog fallbackを使った場合だけnamespaced rowsをcleanup/deactivateし、最大1 transaction/3 rows。既存catalog rowは触らない。
6. test objectsとsynthetic business dataはretention contractに従ってclose/markし、real dataへ影響0。
7. Production/Preview/LINE/live Stripe/real customer fingerprints不変。
8. final all-off runtime、DB、Vercel、Stripe、Supabase readback。

rollback absolute deadlineは600000ms。deadline超過、unknown mutation、compensation failureはterminal前にexact reconciliationする。

## 10. Machine evidence assembly and audits

single exact final evidence manifestを作り、次を相互hash-linkする。

- accepted V16 tooling manifest/review
- authority/private initialization
- catalog proof/snapshot
- preflight/deployment/reconciliation
- two cycles
- observation/performance/log budget
- signed webhook/refund/provider readback
- flag timeline/rollback/final fingerprints
- all counters and privacy scan

既存Gate C auditとV16 auditをnormal modeで実行し、machine evidenceが完全なら `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION` をnon-terminal publishする。ここではGate C PASS terminalを作らない。

## 11. Post-evidence direct-human attestations

最終manifest SHA確定後にだけ、Owner本人へ3 roleのexact attestation payload/codeを順番に提示する。値、URL、ID、PIIは含めない。

必要role:

1. Owner
2. Floor Manager
3. Engineer

各attestationは異なるtimestamp、directHumanMessage=true、aiProxy=false、same-person multi-role acknowledgement、strong-MFA provenance、final manifest SHA、evidence change invalidation、role-specific decision/codeを持つ。

未来の署名を現在のexecution authorizationから推論しない。Ownerがまだ返信していなければterminalを発行せずpauseし、direct response後にversioned evidenceへfreezeする。AIは名前、時刻、role responseを代筆しない。

3件がexactならsignature evidenceをassembleし、normal auditと `--require-pass` auditを再実行する。

## 12. Atomic PASS terminal

次の全条件がtrueの場合だけ、同一filesystem上のtemp file + fsync + atomic rename + directory fsyncでsingle V16 terminalをpublishする。

- exact authorization valid
- final tooling review 3/3 ACCEPT/blocker0
- machine Gate C evidence PASS
- rollback/final readback PASS
- privacy/secret/provider ID findings 0
- post-evidence human attestations 3/3 valid
- normal audit PASS
- require-pass audit PASS
- terminal namespace existing count 0
- Phase D/E started false

decisionは `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED`。publish後にbytes/SHA/directory entryをreadbackし、resolverがcurrent terminal exactly one、V13 ancestor chain exact、V14/V15 terminal absentを確認する。

PASS terminal後はGate Dを開始せず停止する。

## 13. Hard HOLD policy

次だけがterminal HOLDを許す。

- manifest/review round 6/6 exhaustion
- call/mutation/deploy/credential hard ceiling exhaustion with incomplete rollback
- secret/private/provider identifier leak into retained public output
- Production/Preview/LINE/live Stripe/real customer mutation or uncertain outcome
- irreconcilable artifact/source/migration drift requiring new authority
- atomic terminal publication failure after durable side effects

credential login、provider一時障害、catalog read permission、human attestation待ちはrecoverable non-terminal checkpointであり、HOLD terminalを発行しない。

## 14. Validation, records, and handoff

1. 全JSON parse、SHA chain、manifest verifier、authority semantic verifier、privacy scannerをPASS。
2. local syntax、target ESLint、TypeScript、VIP/API/OIDC/source-lineage/identifier/catalog/runtime/rollback/terminal fixturesをPASS。
3. `git diff --check`を対象fileへ実行。無関係なdirty changesは触らない。
4. `docs/AI_WORK_LOG.md`へcompact rowを追記し、`docs/AI_CURRENT_STATUS.md`を最新状態へ更新。
5. 最終応答はGate C decision、terminal path/SHA、final manifest/review、cycles/comparisons/success rate/p95、rollback、attestations、counter、Production等mutation0を簡潔に報告。

成功条件はtooling ACCEPTではなく、`GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED` terminalのatomic publishと `--require-pass` audit PASSです。

## END PROMPT
