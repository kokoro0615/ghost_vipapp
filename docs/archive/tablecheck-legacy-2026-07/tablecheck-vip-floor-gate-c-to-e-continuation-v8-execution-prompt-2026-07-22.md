# GHOST Osaka VIP Floor — Gate C → Gate D → Gate E continuation v8 execution prompt

以下の `BEGIN PROMPT` から `END PROMPT` までを、新しいprimary agent sessionへそのまま渡して実行する。

## BEGIN PROMPT

あなたは `/home/kokoro/projects/clients/ghost` のprimary implementation coordinatorです。目的は、既存のGate C HOLDを証跡完全性を損なわずに解消し、真正なGate C PASS後だけGate DのVIP Floor v2 UIを実装し、Gate D PASS後だけGate Eの高度運用・例外処理・顧客・スタッフ運用をdata-firstで実装・検証することです。

これは調査レポート作成だけの依頼ではありません。許可範囲内で実装、検証、custom staging実測、rollback、証跡化まで継続してください。ただし、未実施の検証をPASSと記録したり、人間の将来署名をAIが代筆したり、scope/ceilingを推論拡張してはいけません。

## 0. 絶対ルール

1. 最初にrepo rootの `AGENTS.md`、`docs/AI_CURRENT_STATUS.md`、`docs/AI_WORK_LOG.md` の最新行、`docs/AI_AGENT_SYNC.md` を全文確認する。
2. `website/`を扱う前に `website/AGENTS.md`、`website/docs/ui/UI_TOOLKIT.md`、適用される上位 `.Codex/docs/DESIGN.md`、このpromptが列挙する正本を読む。repo直下に `.Codex/docs/DESIGN.md` が無い場合は、探索結果と採用した上位authorityを証跡へ記録する。無断で代替デザインを発明しない。
3. dirty worktreeは利用者のもの。関係ない変更を直す、削除する、stashする、resetする、checkoutで戻す、上書きすることを禁止する。
4. evidenceはadditive-only。既存のJSON、review、manifest、terminal、ログを削除・変更・再生成しない。
5. secret、token、cookie、JWT、customer PII、ciphertext、provider object ID、private URL、private absolute path、raw webhook bodyをchat、public evidence、git diff、test snapshot、screenshotへ出さない。
6. Production、Preview、LINE、live Stripe、real customer dataへのmutationは0。deployment delete、manual alias mutation、secret rotation、down/destructive migrationも0。
7. external mutationは、同一bytesのfresh manifestに対するprovenance/runtime/securityのexact 3/3 ACCEPT後だけ実行する。review自体は `externalCalls=0`、`externalMutations=0`、`secretReads=0` を必須フィールドとして持つ。
8. 各external mutationは、実行前journal、exact scope/identity/ceiling照合、実行、authenticated readback、postcondition、counter更新を一つの状態機械で処理する。unknown outcomeは該当ceilingを消費し、blind retryしない。
9. Gate順序は厳格に `C → signed C PASS → D → D PASS → E`。条件未達の後段をscaffold、実装、表示、deployしてはいけない。
10. 事実が不足する場合はHOLDにする。警告を無視してPASSへ進めない。

## 1. 新authorityとterminal lineage

作業開始前に次の3ファイルの存在、JSON parse、SHA-256をexact検証する。1 byteでも違えばexternal read/mutation前に停止する。

| 種別 | path（`website/`基準） | SHA-256 |
|---|---|---|
| Owner directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-owner-directive-v1-20260722T032544+0900.json` | `f44ee4ae94f64fc5ed2b017bd27d167ac54a9483e3fb45c838183c461e316835` |
| bounded proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-authorization-proposal-v1-20260722.json` | `506a5787382a4ce21188785ad25361b58110c2eecbadb2428f11ed49a20731d6` |
| Owner authorization | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-owner-authorization-v1-20260722T032900+0900.json` | `fa5aeef5a101a3da94a94d82415ec61ae03cc995520bc5f646a4d313faf6c23a` |

このauthorizationはproposal内のbounded custom-staging作業を許可するが、未来のPASS事実や未来の人間署名を先取りしない。ceiling拡張、Production release、real customer、live provider mutationを許可しない。

### 1.1 immutable ancestors

以下をexact検証し、変更禁止のancestorとしてhash chainへ含める。

| 種別 | path | SHA-256 |
|---|---|---|
| freeze v5 | `docs/evidence/vip-floor-v2/gate-c-runtime-source-artifact-freeze-v5-20260722T003003+0900.json` | `051df72f622716791a16877a82b7c013f1141a96fcf921a5f573eddce118e871` |
| prior current terminal | `docs/evidence/vip-floor-v2/gate-c-new-lineage-terminal-hold-v7r3-20260722T023635+0900.json` | `9560dd0060408e985e802c58d99d929aed5e072796ce92d3c8b403a1d7934899` |
| rejected tooling manifest | `docs/evidence/vip-floor-v2/gate-c-new-lineage-tooling-manifest-v7r4-20260722T030316+0900.json` | `1e68b1bd4f8efd3281bdff0c533e451b13e3c4fd5713bbc8a0e4abd2171a3a1e` |
| rejected 3/3 review | `docs/evidence/vip-floor-v2/gate-c-new-lineage-tooling-review-v7r4-reject-20260722T030948+0900.json` | `161e3f84098ae4f441220c565f95f4072dcb872bd0472c16aa7530be60fb0cac` |

freeze v5が記録する旧lineageは `source=43dd4d6e…03eca`、`migration=c2e751f1…3272`、`artifact=fe3ee0d7…a22d`、`provider=543d66a3…53c3` である。これらはancestor値であり、今回のnarrow source remediation後のcurrent値として偽装してはならない。

### 1.2 terminal resolver

新lineage名は `gate-c-to-e-continuation-v8` とする。

- v7r3 terminalは旧lineageのtruthful terminalとして残す。
- 旧lineageへ2つ目のterminalを追加しない。
- 新lineageの全entrypointは、credential/readiness/external callより先にterminal resolverを実行する。
- resolverは全terminalをpagination/glob omissionなく走査し、`lineageId`、`ancestorTerminalSha256`、`supersedesForContinuation`、`terminal=true|false`を検証する。
- 新lineageには最終的にexactly one terminalだけをpublishする。Gate C/Gate Dの正常な中間判定はnon-terminal decision recordにする。
- post-evidence human attestation待ちは `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` checkpointであり、再開可能なnon-terminalとする。Gate Dはその間開始しない。
- 回復不能なscope/identity/privacy/ceiling breach、またはユーザーが終了を指示した場合だけ、truthful terminal HOLDをatomic publishする。

## 2. 正本と調査

最低限、次を全文または該当scope全体で読む。SHAをmanifestへ記録する。

- `docs/research/tablecheck-vip-floor-phase-c-gate-c-ui-implementation-plan-2026-07-14.md` — `2cfd73b6d134064c82356b81a19165a700b652a6069ed17d6d13472a69497d31`
- `docs/research/tablecheck-vip-floor-end-to-end-implementation-plan-2026-07-14.md` — `64b04fd801eecc419712a8a2dcce248b118c1d825a05118799e0e9bcdc341022`
- `docs/research/tablecheck-vip-floor-reproduction-spec-2026-07-14.md`
- `docs/evidence/vip-floor-tablecheck/parity-matrix.md` — `42964ea4c2da5f509def3a66d9f476b853609667033a68e45617bd296455aee0`
- `docs/evidence/vip-floor-tablecheck/component-spec.md` — `6637f8885a1b39d4cf685b8bbf5e1f6a34e65fc0900dec9304861715314f4e7f`
- `docs/evidence/vip-floor-tablecheck/behavior-inventory.md` — `d91d06b4d59b11d955820e22b79898219e2dbee37f039b43d0a487d77e1801d5`
- current `src/app/admin/vip-floor/page.tsx`、`src/components/admin/VipFloorDashboard.tsx`、関連v1 components/logic/types
- `src/app/api/admin/v2/**`、`src/lib/vipFloorV2Contract.ts`、`src/lib/server/vipFloorV2*.ts`、feature flags、current migrations/tests
- installed Next 16 docs: Server/Client Components、production checklist、lazy loading、page `searchParams`、accessibility。UI実装ではweb上の記憶より `node_modules/next/dist/docs` を優先する。

技術判断は一次資料で照合し、調査時点とURLをresearch noteへ残す。少なくとも以下を確認する。

- Vercel REST/auth/team scoping/deployments/custom environments: `https://vercel.com/docs/rest-api`、`https://vercel.com/docs/deployments/environments`
- Stripe keys/restricted keys: `https://docs.stripe.com/keys`、`https://docs.stripe.com/keys-best-practices`
- Stripe webhook signature/raw body/replay: `https://docs.stripe.com/webhooks`、`https://docs.stripe.com/webhooks/signature`
- Stripe idempotency: `https://docs.stripe.com/api/idempotent_requests`
- WCAG 2.2 target/focus: `https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html`、`https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance`

Stripe実装・検証ではrepoの `stripe-best-practices` skillを読む。React/Next実装では `vercel-react-best-practices`、admin UIでは `ckm:ui-styling`、public booking surfaceに触れる場合だけ `design-taste-frontend` を使う。generic skill例よりGHOST固有ルールを優先する。

## 3. Phase C0 — v7r5+ remediation（外部接続前）

`v7r1`〜`v7r4`を変更せず、`v7r5`以降の新ファイルだけで修正する。reviewで追加blockerが出た場合も同じくversionを上げる。既存reject reviewをPASSに書き換えない。

### 3.1 16 blockerを一件ずつ閉じる

各findingについて `findingId → root cause → changed files → positive test → real negative fixture → reviewer evidence` のclosure ledgerを作る。以下は最低条件で、単なる文字列存在テストは禁止する。

#### Provenance 3件

1. `PROVENANCE-V7R4-01`: 実行時に実際にloadされる依存の完全closureを取る。static import、dynamic import、package export、transitive dependencyを解決し、少なくともSupabase経由の `iceberg-js` と `tslib` を含む。package名だけでなくresolved file bytes、package version、integrity、tree hashをfreezeする。import tracingの実測closureとmanifest closureが完全一致しなければFAIL。
2. `PROVENANCE-V7R4-02`: mandatory negative-fixture matrixを全行具体化する。継承placeholder、`not-applicable`の水増し、常にtrueのfixtureをPASS countへ含めない。各fixtureは1つのguardを実際に壊し、期待したfail-closed codeで失敗し、元に戻したcontrolがPASSすることを証明する。
3. `PROVENANCE-V7R4-03`: §1.2のnew continuation resolverを実装し、旧terminalを削除せずancestorとして受理する。旧lineageへのterminal追加はfixtureで拒否し、新lineageのone-terminal invariantを検証する。

#### Runtime 9件

4. `RUNTIME-V7R4-01`: `assertPrivateDirectory`のexport/import contractを修正する。`node --check`だけでなく、全entrypointを実importするmodule-load smoke test、`--help`/dry-run、fixture sandboxでのinitialization testを行う。top-level side effectは0。
5. `RUNTIME-V7R4-02`: terminal collision/resume resolverをmain module import直後かつcredential/environment/private artifact/readinessより前に実行する。既存terminal fixtureで `externalCalls=0 / externalMutations=0 / secretReads=0` のまま止まることを証明する。
6. `RUNTIME-V7R4-03`: subaction artifactに単調増加ordinalを持たせ、assemblerは `(cycleOrdinal, actionOrdinal, phaseOrdinal)` で `intent → receipt → readback` を厳密に組み立てる。lexical filename順へ依存しない。欠落、重複、順序逆転、別cycle混入を拒否する。
7. `RUNTIME-V7R4-04`: rollback SLAは最初のabort predicate成立時刻 `abortDetectedAtMonotonic` から測る。rollback worker開始、各compensation、all-off readback完了を同一monotonic clockで記録し、initiation ≤60秒、completion ≤600秒を実測する。後段orchestrator開始時刻へ差し替えない。
8. `RUNTIME-V7R4-05`: webhook/refund workerをcurrent synthetic `executionId/cycleId/namespace`へbindする。claim query、request metadata、idempotency、provider metadata、readbackが同じnamespaceを持ち、他cycle・非synthetic・unscoped rowをclaimできないことをDB/API/worker fixtureで証明する。現行sourceがglobal claimしか持たない場合は、この目的だけのnarrow runtime source remediationを行う。実顧客queueを空だと仮定して安全性の代替にしない。
9. `RUNTIME-V7R4-06`: deployment、alias、environment、custom environment、Production/Preview/LINE invariantを全page取得する。page countではなくcursor exhaustionとdeduplicated identity setを記録する。値に敏感な比較は、secret値をstdout/public evidenceへ出さず、private 0600 process内で同一run-keyによるHMAC fingerprintをbefore/after比較する。key名、scope、target、type、updatedAt、provider identityも比較し、取得不能を「不変」と推定しない。
10. `RUNTIME-V7R4-07`: DB CASは `expected revision` と `RETURNING` によるactual affected rowsを同一transaction/request ledgerへ保存する。response不明時にbefore/after差からaffected rowsを推定しない。authenticated idempotency ledgerから同じrequest IDの確定結果を取得できなければ、ceilingを消費してHOLDとする。
11. `RUNTIME-V7R4-08`: observationはversioned strict NDJSON/JSON schemaにする。`executionId`、`cycleId`、`requestId`、unique `comparisonId`、route、writer、sample decision、v1/v2 digest、latency、classification、schema version、authenticity tagを必須化する。duplicate ID、missing correlation、unknown writer、invalid signature、foreign cycleを拒否し、重複をMapで黙ってcollapseしない。1,000 comparisonsは1,000 unique attributable accepted recordsのみ数える。
12. `RUNTIME-V7R4-09`: readiness schemaを `count >= 80` 等で判定しない。current remediation source/migration freezeからcatalog contract（tables/functions/triggers/RPC signatures/privileges/migration head）をcanonicalizeしてhash化し、stagingのexact equalityを要求する。追加・欠落・signature driftはFAIL。

#### Security 4件

13. `SECURITY-V7R4-01`: blocker 5と同じpre-readiness terminal/resume guardをsecurity fixtureでも実証する。呼ばれてはいけないAPI/secret readerをbooby trapにして0回を確認する。
14. `SECURITY-V7R4-02`: 3 reviewer JSON schemaに `externalCalls`、`externalMutations`、`secretReads` をrequired integerとして定義し、全てexact 0でなければreview aggregationをREJECTする。欠落/null/string/negativeも拒否する。
15. `SECURITY-V7R4-03`: public evidence scannerをSupabase anon/service-role/JWT、Vercel token/bypass/OIDC/admin session、Stripe secret/restricted/client secret/webhook secret、cookie/bearer、LINE token、database URL/password、private URL/path、raw provider IDs、PII/ciphertextへ拡張する。prefixだけでなくJWT shape、高entropy、URL query/header/object nesting、base64/escaped formをfixture化する。fixture値は明白なdummyのみ使い、real secretをscanner testへコピーしない。
16. `SECURITY-V7R4-04`: synthetic credentialsをreadinessで実認証する。admin credentialは生成・検証・consumerで同一32-byte以上のcontractを使い、principal/capability/synthetic namespaceをsanitized authenticated endpointで確認する。Turnstile等はofficial test credentialまたはserver-side capability probeを使う。token長だけで認証済みとしない。secret本文は保存・表示しない。

### 3.2 narrow source amendmentと再freeze

16 blockerをtoolingだけで正直に解けない場合に限り、Gate C runtime sourceを変更できる。許可範囲はworker namespace binding、authenticated readiness、exact observation attribution、fail-closed readbackだけであり、予約business semantics、payment flow、public response shape、migration bundle、package lockを変更しない。

変更した場合:

1. current source treeとancestor freezeのdiffをallowlist化する。
2. deterministic/race/rollback/API/static/crypto/Stripe/VIP suitesを再実行する。
3. `npm run lint`、TypeScript、clean authenticated custom-staging buildを行う。
4. local buildは最大3回。artifact refreezeはexact 1回。
5. source/migration/artifact/provider comparable closureを新しいadditive freezeへ記録する。ancestor SHAをcurrent SHAとして流用しない。
6. 同一source buildが非決定的なら、最終採用artifact bytesをprivate persistent storageへfreezeし、なぜ再build比較が使えないかを記録する。

## 4. Gate C tooling freezeとfresh review

### 4.1 manifest

current bytesからcomplete manifestを生成する。最低限含めるもの:

- authority/directive/proposal/authorizationと全ancestor SHA chain;
- current source、migration、artifact、provider comparable hashes/counts;
- 全実行entrypoint、library、fixture、schema、package transitive closure;
- exact executable import/load closure;
- exact database catalog contract;
- 16-finding closure ledger;
- positive/negative fixture results;
- external call/mutation/secret-read counters;
- public evidence privacy scan;
- mutation ceilingsとcounter initial state;
- terminal lineage/resume rules。

manifest verifierはself-referenceを除く全declared file/tree/packageを再hashし、undeclared executable load、missing file、extra privileged entrypoint、symlink escape、mode violationを拒否する。private credential/artifact directoryはowner-only、regular file、non-symlink、expected link count/modeを検証する。

### 4.2 exactly three independent read-only reviews

同一manifest bytesに対してexactly 3 reviewerを使う。

1. provenance reviewer — closure、hash chain、fixture実体、terminal lineage。
2. runtime reviewer — 全entrypoint load、state machine、pagination、cycle attribution、rollback clock、CAS、exact schema。
3. security reviewer — credential boundary、zero-call review、privacy scanner、synthetic authentication、scope/ceiling fail-closed。

reviewerはコードやmanifestを変更しない。全員ACCEPTかつblocker 0でなければreadiness、secret read、provider API、deploy、webhook、DB、runtimeへ進まない。REJECTはadditive evidenceとして保存し、修正versionを上げてfresh manifest/fresh 3 reviewを行う。

## 5. Gate C authenticated readiness（まだmutationしない）

3/3 ACCEPT後、次をsanitized read-onlyでexact確認する。

- authenticated Vercel principal、exact Team、exact project、custom staging environment;
- deployments/aliases/env/custom environment全paginationとbefore fingerprints;
- Production/Preview/LINE invariants;
- exact current artifact/provider comparable closureとruntime identity;
- Stripe test mode restricted API keyの最小capability、pinned API version `2026-04-22.dahlia`、existing test webhook endpoint/event set;
- Supabase exact project/database、PG version、migration head、exact catalog hash、DB setting revision;
- synthetic admin/worker/webhook credentialsの実認証とnamespace;
- all feature flags disabled、DB dual-write false、runtime state `all_off_bootstrap`;
- current journal/terminal/resume stateとremaining ceilings。

readiness outputは値を出さず、boolean、count、hashed identity、scope、timestampだけをpublic evidenceへ出す。Production/Preview/LINE value fingerprintに必要なsecret readはprivate process内だけで行い、read counterへ記録する。

## 6. Gate C bounded custom-staging execution

proposal ceilingをhard limitとしてコードにも実装する。

- prebuilt custom staging deploy: max 1
- runtime-state custom staging deploy: max 6
- watchdog rollback deploy: max 2
- total new staging deploy: max 9
- existing test webhook target update: max 9
- authenticated webhook compensation: max 1
- DB setting CAS / affected rows: max 3 / 3
- synthetic business cycles: exact 2、max 2
- deploy delete/manual alias/project config/persistent env config/Production/Preview/LINE/live Stripe/real customer/schema mutation: 0

### 6.1 state sequence

fresh preflightの後、次を省略・並べ替えず実行する。

1. `all_off_bootstrap`
2. `db_only`
3. `db_shadow`
4. `both_on_business_cycle`
5. `node_rollback`
6. `restored_all_off`
7. `node_only_invalid`（fail-closedを実証）
8. `final_all_off`

availabilityとbegin-holdは同時切替し、v1 shapeを維持する。各stateはintent → mutation receipt → authenticated readbackを持つ。readback不一致、Node/DB flag misalignment、unexpected alias/env driftで即abortする。

### 6.2 exact two synthetic cycles

2 cycleはpre-frozen synthetic namespaceだけを使う。各cycleで少なくとも:

- availability → begin hold → payment/setup path where applicable;
- signed Stripe test webhook raw-body verification;
- duplicate delivery/replay/idempotency;
- retry/failure/conflict path;
- namespaced webhook/refund worker claim;
- provider side-effect count readback;
- DB reservation/payment/assignment/audit/revision readback;
- cleanup or retained synthetic audit posture。

Stripe POSTは同一logical actionで同じidempotency keyを維持する。unknown resultはread-only reconciliationし、確認不能ならretryしない。webhookはraw body、`Stripe-Signature`、endpoint-specific secret、timestamp toleranceで検証する。test/live endpoint secretを混同しない。

### 6.3 runtime observation

- observation duration ≥1,800,000ms;
- unique attributable comparisons ≥1,000;
- shadow success rate ≥0.999;
- p95 overhead ≤25ms;
- critical mismatch = 0;
- snapshot race = 0;
- privacy violation = 0;
- duplicate provider effect = 0。

単なるrequest数やduplicate collapse後のcountをcomparison数にしない。expected divergenceは事前freezeしたrule ledgerとのexact一致だけ許す。未知classificationを自動でexpectedへ追加しない。

### 6.4 abortとrollback

abort predicate成立時刻を最初にimmutable記録し、60秒以内にrollback開始、600秒以内にauthenticated `all_off`完了を実測する。順序:

1. v2 UI/read（もし誤って有効なら）off;
2. v2 mutation off;
3. Node public dual-write off;
4. v1 availability/hold/admin health確認;
5. DB dual-write CAS off;
6. migrations/rows/auditは保持し、down migrationしない;
7. webhook targetを認証済みbefore値へcompensate;
8. exact provider/DB/runtime/Production/Preview/LINE readback。

rollbackを成功させるためにevidenceを削除しない。SLA超過やreadback不明はGate C FAIL/HOLD。

## 7. Gate C evidence、audit、署名

fresh Gate C summary/manifestは最低限、clean PG16、全migration、F01–F40、mandatory/race/rollback、writer coverage、reconciliation、1,000 comparisons、2 cycles、Stripe/webhook/refund、flag before/after、v1 fallback、privacy scan、mutation counters、rollback timing、current hashesをリンクする。

次を両方実行しexit 0を要求する。

- normal audit;
- require-pass audit。

その後にのみfinal manifest SHAを作り、Owner / Floor Manager / Engineerのrole-specific post-evidence attestationを取得する。既存 `single_operator_multi_role_v1` amendmentがexactに有効なら同一実在人物でもよいが、同じfinal manifest SHA、distinct timestamps、role-specific code、strong-MFA provenanceを必要とする。

AIは名前、timestamp、MFA、署名を合成しない。真正なattestationが無ければ `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` のnon-terminal checkpointをpublishし、Gate Dを開始せず待つ。署名後、`GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED` non-terminal decisionをatomic publishする。

## 8. Gate D — VIP Floor v2 UI

開始条件はexact `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED`。Gate Cの技術的PASSだけ、unsigned manifest、UI screenshot、事前Owner authorizationだけでは開始しない。

### 8.1 D0 contract/design freeze

実装前に:

- current v1の1440/1024/768/390 screenshotとbehaviorをfreezeする;
- v1 sourceを変更しないfallback boundaryを定義する;
- `VipFloorBoardV2`、command/error/capability、URL、status vocabulary、business timezone/date rolloverをfreezeする;
- capability-to-control matrix、redaction matrix、mobile primary actionをfreezeする;
- GHOST tokens（black-violet lacquer、champagne hairline、LED rhythm、compact radii、focus）をscoped token sheetにする;
- real VIP floor map geometry/mediaのsourceと権利を確認する。

抽象SVG decoration、AI glass、purple/blue gradient orb、bokeh、floating translucent cards、nested cards、SaaS white/gray/blue、過剰な角丸、説明用decorative copyを禁止する。

### 8.2 route/data architecture

`src/app/admin/vip-floor/page.tsx`はServer Componentのままにする。

- serverでauth/capabilityとv2 read flagを解決;
- flag offなら現行v1 dashboardをそのままrender;
- flag onならserver DALからsanitized initial v2 boardを取得。Server Componentから自分のRoute HandlerをHTTP callしない;
- Next 16の `searchParams` Promiseをawaitし、安全にnormalize;
- clientへ渡すpayloadを最小化し、ciphertext、provider ID、internal audit payload、不要なUUIDを含めない;
- `'use client'`はworkspace/reducer/interactive leafに限定;
- chart/large listはClient wrapperからdynamic importする;
- flag/error boundary一操作でv1へ戻せる。

URL contract:

```text
/admin/vip-floor
  ?date=YYYY-MM-DD
  &view=floor|chart|list
  &reservation=<publicCode>
  &table=<publicResourceCode>
  &panel=reservation|table|block|walk-in
```

PII、internal UUID、ciphertext、note、provider IDをURLに入れない。back/forwardでdate/view/selection/panelを復元する。

### 8.3 D1 read-only operational shell

実装するもの:

- GHOST Osaka VIP operationsがfirst viewportで即座に分かるbusiness-day bar;
- compact operations rail、date prev/next/today、floor/chart/list、search/filter;
- status rail（label/icon/pattern付き、色のみ禁止）;
- revision/refresh/stale/offline/permission/error/empty states;
- real floor geometryとreservation selection;
- read-only detail pane;
- 390pxではlist-first、sticky context、bottom drawer、persistent relevant primary action（mutation disabled）。

generic heroやcard dashboardを作らない。adminの価値は密度、scanability、例外、auditabilityに置く。

### 8.4 D2 three-view parity

Floor:

- actual table/seat positions、multiple turns、assignment、occupancy、block、payment/service、conflict;
- keyboard-selectable nodeとaccessible label;
- map dominant + rail約66/34、rail min 360px（可能なdesktop）。

Chart:

- table×time、current-time、reservation/block bars、turnover/collision、unassigned/cancel/no-show tray;
- page全体ではなくtimeline内部だけintentional horizontal scroll;
- reduced motionとkeyboard/button alternative。

List:

- dense sortable table、sticky header、filter summary;
- lifecycle/service/payment/pax/time/table/exception columns;
- laptopで概ね14–18 rows、32–40px row目標;
- measured threshold超過時に `content-visibility`、必要ならvirtualization。

3 viewは同じboard revision、fixture、selectionへ収束する。

### 8.5 D3 core operations

リスク順にconfirm、assign/reassign/add/remove/unassign、check-in/service、schedule/duration、walk-in、block CRUD、notes、cancel/refund decision handoff、authorized encrypted customer updateを接続する。

全commandに capability、expected version、request ID、idempotency key、reason/actor、pending、typed error、409 conflict recovery、server reconciliation、redacted loggingを持たせる。dangerous mutationはoptimistic commitしない。同じvisible retryは同じidempotency keyを維持する。

drag/drop/resizeにはbutton/keyboard equivalentを必須化し、どちらも同じRPC commandを発行する。cancelは影響、reason/classification、payment/refund postureを示すstructured confirmationにする。

### 8.6 D4 mobile / D5 quality

- 375/390はdesktop圧縮ではなく専用IA。floorが密ならgrid/listへ変換;
- important touch targets ≥44×44px、少なくともWCAG 2.2の24×24/spacing要件も自動監査;
- long Japanese/English labels、safe area、virtual keyboard、input zoom、no body horizontal scroll;
- visible 2px相当focus、focus return、dialog trap、screen-reader names、non-color status、concise live region;
- `prefers-reduced-motion`でtransition/current-time effectsを抑制;
- LCP ≤2.5s、INP ≤200ms、CLS ≤0.1、independent read waterfall 0、bounded initial client bundle;
- production-like `next build`/`next start`、bundle analysis、slow network/large boardで測定。

visual evidenceは1440×900、1024×768、768×1024、390×844に加え375pxを取る。実ブラウザでdesktop/mobileを検査し、screenshotだけでinteraction/a11y/performanceを代替しない。

### 8.7 Gate D validation and rollout

type/decoder、URL parser、reducer、component、route/API、E2E desktop/mobile、visual、a11y、performance、resilienceを実行する。最低E2E:

- floor → detail → assign → confirm → check-in → cancel;
- chart dragとkeyboard moveのRPC一致;
- stale revision/409で入力保持とexplicit retry;
- 401/403/429/5xx/offline;
- v2 mutation flag offでread-only;
- v2 read flag offで即v1 fallback;
- PII/Stripe/provider漏洩0。

custom stagingはD本体max 6、watchdog rollback max 2、合計max 8。Production flagはoffのまま。D0/D1/D2/D3/D4 decision evidenceを作り、floor-manager rehearsalとfallback rollbackがPASSした場合だけtruthful `GATE_D_PASS_PHASE_E_AUTHORIZED` non-terminal decisionをpublishする。

## 9. Gate E — advanced operations, exceptions, customer/staff

開始条件はexact `GATE_D_PASS_PHASE_E_AUTHORIZED`。UIから先に作らない。

### 9.1 E0 P1 contract freeze

以下をadditive contractとしてfreezeし、既存P0 entity/RPCを破壊しない。

- service period templates/instances（overnight、cutoff、business day）;
- day notes/whiteboard（version/author/audit）;
- waitlist entries/contact attempts/encrypted contact profiles/consent/retention;
- staff operational profiles（admin/PII capabilityと分離）;
- staff table assignments（service period/half-open interval）;
- online acceptance rules;
- recurring block series/materialization relation;
- table operational profiles/connection groups;
- placement suggestions（recommendation only、manager confirm）;
- customer contact activities;
- reservation attachment metadata/scan/retention;
- transactional integration outbox。

全tableにversion、actor、timestamps、audit、RLS。外部送信をDB triggerから行わない。raw contactをoutbox/logへ置かない。customer LINE/SMSを社内LINE groupへfallbackしない。

### 9.2 E1 schema/RPC/API data gate

additive migrationだけを作る。clean PG16 zero-apply、upgrade、rollback strategy（feature off + retain schema）、RLS/ACL、race/idempotencyを先に通す。

RPC/APIは少なくとも:

- waitlist create/update/cancel/notify-attempt/accept/seat/expire;
- staff assignment add/change/remove;
- service period create/update;
- online acceptance set;
- recurring block create/update/cancel/materialize idempotently;
- day note update;
- placement suggest/apply with manager confirmation;
- attachment metadata create/scan-status/access;
- outbox claim/lease/retry/dead-letter/reconcile。

全mutationにidempotency、expectedVersion、capability、actor/reason、audit、typed conflictを持たせる。worker claimはtenant/business-day/namespaceでbounded、lease expiryとsingle-consumer semanticsを証明する。

Gate E1 fixtures:

- waitlist → notify → accept → seatがassignment conflictに対してatomic;
- notification failureでもqueue stateを失わず、retry/dead-letter/reconcile可能;
- replayで二重送信0;
- expired/declined/already-seated/two-device conflict;
- staff assignmentとblockのinterval overlap/shift end;
- staff profileがadmin/PII権限を暗黙昇格しない;
- online offがnew public holdだけ止め、existing holdを破棄しない;
- overnight service period/date rollover;
- recurring materialize再実行でduplicate 0;
- external job failureがreservation transactionをrollback/破損しない;
- raw contact/PII/provider payload leakage 0。

### 9.3 E1b customer dossier and attachments

- party breakdown、source/purpose/flags、masked contact、visit/cancel/no-show aggregates、order/payment evidence、audited notes/tags/contact activity;
- staff board readはmasked、manager-only decrypt/readは毎回audit;
- encryption envelopeはkey ID、format version、nonce、auth tag、rotation/fail-closed。検索はapproved blind-index exact matchだけ;
- unknown key/tag failureはredacted fail-closed;
- attachmentはobject metadataのみDBへ保存し、MIME/size/malware gate、short-lived signed URL、retention/delete auditを持つ。file bytesをpublic evidenceへ置かない。

### 9.4 E2 dense operations UI

Gate E1 data/API PASS後に:

- waitlist queue/rail、priority、attempt count、delivery state、accept/seat/expire、recoverable exception;
- service period、online acceptance、day note、recurring block command panel;
- staff assignment、table overlay、shift filter、uncovered-table state;
- customer dossier split pane、masked/manager states、audit timeline;
- outbox/retry/dead-letter exception queue、filters、owner、age、next action、reconcile command;
- permission/conflict/expired/provider-failure states。

admin UIはtable、queue、filter、split pane、status rail、timeline、command panelを優先し、dashboard card pileにしない。exceptionは色だけでなくcode/label/icon/age/owner/next actionを表示する。

### 9.5 Gate E staged validation

external通知はdeterministic fake/sink adapterだけを使い、LINE/SMS/live Stripe mutationは0。real customerは禁止し、synthetic record max 50。additive staging migration bundle applyはmax 1、destructive/down migration 0。custom staging deploy max 6 + watchdog rollback max 2 = total max 8。

Gate E PASS条件:

- floor/chart/list/detailでadvanced stateと同じrevisionへ収束;
- failure/expiry/conflict/permission不足からoperatorが回復可能;
- waitlist/staff/block/service period/online acceptance/customer dossier/outboxのcritical E2E PASS;
- notification duplicate 0、public availability regression 0;
- owner/staff/manager capability差を実証;
- PII/secret/provider leakage 0;
- mobile 375/390、keyboard、screen reader、reduced motion、performance budgets PASS;
- flags offでP0/v1 fallbackが即時可能;
- floor-manager rehearsalとrollback evidence PASS。

Gate Eのactual acceptance evidenceを作り、未確認項目が0の場合だけ最終terminal `GATE_E_PASS_GATE_C_TO_E_CONTINUATION_COMPLETE` をatomic publishする。失敗時は最終stateを安全なflags-off/fallbackへ戻し、truthful `GATE_E_HOLD` terminalをpublishする。

## 10. Stop conditions

次のいずれかで新mutationを止め、既に許可されたcompensation/rollbackだけ行う。

- authority/hash/lineage/scope/identity/credential/schema drift;
- reviewer 3/3 ACCEPT未達;
- terminal uniqueness不成立;
- Production/Preview/LINE invariant drift;
- secret/PII/ciphertext/provider data leak;
- critical comparison、snapshot race、duplicate side effect;
- Node/DB flag misalignment;
- workerがunscoped/non-synthetic rowをclaim可能;
- unknown mutation outcomeをexact ledgerでreconcile不能;
- affected-row count不明;
- rollback SLA超過;
- v1 shape/fallback regression;
- ceiling到達または超過;
- Gate順序違反。

「たぶん成功」「UIで見えた」「row countが増えた」「再実行すれば直る」は継続根拠にならない。

## 11. Evidence hygiene and validation

各phaseで:

1. JSON parse、SHA links、file existence、lineage chainを機械検証する。
2. node syntax/module-load、target ESLint、TypeScript、unit/fixture/API/DB/race/rollback、buildをscopeに応じて実行する。
3. public evidence scannerを全新規artifactへ実行し findings 0を要求する。
4. `git diff --check` を実行する。
5. unrelated dirty filesを列挙するだけで変更しない。
6. `docs/AI_WORK_LOG.md`へcompact rowを追記し、active state/next actionが変われば `docs/AI_CURRENT_STATUS.md`を更新する。

raw private evidenceはgit管理外の0700 directory、0600 regular file、non-symlinkで保持し、public evidenceはsanitized aggregate/hashだけにする。秘密をhashする場合、低entropy値のplain SHAを公開せずrun-scoped keyed HMACを使う。

## 12. 進捗報告と最終応答

60秒以上ユーザーを無言にしない。各checkpointで、現在gate、完了条件、残blocker、external call/mutation/secret-read counters、safe final postureを短く報告する。secretやprovider IDは出さない。

最終応答は日本語で、次だけを簡潔に示す。

- Gate C / D / Eの最終status;
- 閉じたblockerと未解決blocker;
-主要manifest/decision/terminalのclickable pathとSHA;
- validation実績;
- external mutation countersと最終flags/fallback posture;
- 人間署名待ちなら、必要なexact final manifest SHAとrole codes（署名を代筆しない）;
- 次の安全な一手。

完了条件を満たすかtruthful terminal/HOLD checkpointを作るまで作業を続ける。ただし、許可されていないscope拡張や偽のPASSで継続してはならない。

## END PROMPT
