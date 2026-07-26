# GHOST Osaka VIP Floor — V15 catalog identifier remediation → fresh review → Gate C authority reissue execution prompt

以下の `BEGIN PROMPT` から `END PROMPT` までを、新しい primary implementation session へそのまま渡して実行する。

## BEGIN PROMPT

あなたはGHOST workspaceのrepo rootで作業するprimary implementation coordinatorです。目的は、V13 terminal、accepted V14 manifest/review、およびV14 contract HOLDをbyte-immutable historyとして保持し、新lineage `gate-c-to-e-continuation-v15-catalog-identifier-remediation` でidentifier validatorをadditive修正し、real seeded catalog fixtureを追加し、single exact manifestをfresh runtime/security reviewへ渡し、同一manifestが2/2 ACCEPTの場合だけGate C authorityとcompanion pre-bootstrap authorityを新manifest/reviewへexact再bindすることです。

このpromptではGate C runtime、private config初期化、credential read、provider API、deployment、external mutationを実行しません。最終到達点は、2/2 ACCEPT時の `READY_FOR_V15_GATE_C_PREBOOTSTRAP_EXECUTION_UNDER_REISSUED_AUTHORITY`、または1名でもREJECT時の `V15_REMEDIATION_REVIEW_HOLD_REQUIRES_NEW_DIRECT_OWNER_AUTHORITY` です。

## 0. 開始時の絶対ルール

1. 最初にrepo rootの `AGENTS.md`、`docs/AI_CURRENT_STATUS.md`、`docs/AI_WORK_LOG.md` 最新行、`docs/AI_AGENT_SYNC.md`、`website/AGENTS.md` を読む。
2. Stripe contractを保持するためinstalled `stripe-best-practices` skillとsecurity referenceを読む。test-only restricted key、API version `2026-04-22.dahlia`、raw-body webhook signature verification、idempotency、秘密非出力を後退させない。
3. dirty worktreeは利用者のもの。無関係な変更を修正、削除、stash、reset、checkout、上書きしない。
4. evidence/historyはadditive-only。V14以前のtooling、manifest、review、authority、terminal、HOLD、fixture、researchを変更・削除・rename・再生成しない。
5. V15は新しいversioned fileだけで構成する。accepted V14のdeclared bytesを直接patchしない。
6. secret、token、cookie、JWT、customer PII、provider object ID、private URL、private absolute path、raw webhook body、deployment URLをchat、stdout、public evidence、diffへ出さない。
7. pre-reviewから最終checkpointまでprivate candidate read0、secret/credential read0、provider/runtime API0、external call0、external mutation0、deploy0。network-capable CLI、web search、remote browser、package resolution、update checkは禁止。
8. `npx`は禁止。既存local Nodeと明示local binaryだけを使う。package install/update、lockfile変更、application buildを行わない。
9. application source、migration、package.json、lockfile、artifact、candidate、private pointer、DB catalogは変更しない。migration/seedはread-only fixture inputとしてだけ読む。
10. manifest freezeは最大1、review roundは最大1、runtime reviewer 1名、security reviewer 1名、dispatch合計2。同一manifest SHAの2/2 ACCEPTが必要。1名でもREJECTなら追加修正・refreeze・再reviewをせずHOLDする。
11. future PASS、review結果、human attestation、provider stateを合成しない。事実不足はHOLD。
12. commentaryを60秒以上途切れさせず、authority verification、fixture PASS、manifest freeze、review結果、authority reissueの各checkpointを共有する。

## 1. exact authorityとimmutable history

`website/` を基準に、次をJSON parse、SHA-256、相互参照までexact検証する。1 byteでも異なる、canonical V14 terminalが存在する、またはV13 terminalが唯一でない場合は実装前に停止する。

| 種別 | path | SHA-256 |
|---|---|---|
| V15 direct Owner directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v15-catalog-identifier-remediation-owner-directive-v1-20260722T203000+0900.json` | `d006931ca9edc1c37368d90f89407a898db4d571d65332645edd8922108bdc8d` |
| V15 exact proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v15-catalog-identifier-remediation-authorization-proposal-v1-20260722.json` | `aa688154cbbc942896fbdfdfd362778858ff2fdb15d3a6a2186eeed7b9d92d48` |
| V15 direct Owner authorization | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v15-catalog-identifier-remediation-owner-authorization-v1-20260722T204000+0900.json` | `16d23f5c56a6e8d87970ed03c3568a31d7b7775dc848cf3ec08c4d9bd5a0ebaa` |
| V13 immutable terminal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-v13.json` | `575671d7a21341cb24daaf8df69dab7d8b61069742d7f83b00b8cb33961304fc` |
| accepted V14 manifest | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-manifest-v14r6-20260722T180000+0900.json` | `70fe30aa267d603cad8cb0984299792e361565f628511431d7f3f4c61d57afc0` |
| accepted V14 review | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-tooling-review-v14r6-accept-20260722T184500+0900.json` | `4749eeacfef3538a1a17b8bb7ae55dbadf4530b31ca795ab2215bfe532aacdbd` |
| V14 contract HOLD | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-pre-bootstrap-initialization-contract-hold-20260722T202000+0900.json` | `db2bacc37f617a8af8a536c81cb72da9cdef165f06c23eef693a6f4a3cf6da4c` |

historical Gate C/pre-bootstrap authorityもread-only検証する。

| 種別 | path | SHA-256 |
|---|---|---|
| V14 Gate C directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-gate-c-external-owner-directive-v1-20260722T190000+0900.json` | `cd99602469535d2a9ec20c91df4be63b07de329c97bd8e1fd0d1af14adfb098e` |
| V14 Gate C proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-gate-c-external-authorization-proposal-v1-20260722.json` | `254f540bf92437bda8040516f4b2ffbe9e197c2427791e6a42c024fbad50475b` |
| V14 Gate C authorization | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-gate-c-external-owner-authorization-v1-20260722T190000+0900.json` | `df157dd183526dc9a987117045acd787b94fac63b1289758f29c8020a3ccacf8` |
| pre-bootstrap directive | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-pre-bootstrap-initialization-owner-directive-v1-20260722T200000+0900.json` | `19d4d8567f6b1817b173ad3f7b3e3a584b66c072c82747da9774c19381d7200b` |
| pre-bootstrap proposal | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-pre-bootstrap-initialization-authorization-proposal-v1-20260722.json` | `e89d4ca04f9198ec093c1c32778f815b38c8b635d6f2e429d6fa46430a4229e1` |
| pre-bootstrap authorization | `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v14-pre-bootstrap-initialization-owner-authorization-v1-20260722T201000+0900.json` | `0241d1b155ef47ccb9bef180b4d96a80251ec539aa9ee93510f660f34dd3f9c9` |

V14 canonical terminal `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-v14.json` は不在でなければならない。V15 remediation/reviewではterminalを作らない。

## 2. exact blocker contract

次のimmutable inputsをSHA検証してから修正設計を確定する。

| contract | path | SHA-256 |
|---|---|---|
| reviewed runtime | `scripts/lib/vip-floor-gate-c-runtime-v14.mjs` | `45a7bb5bbd5b94abc92bea70dbd3ffed65deb720da4aebd0a709fdeff99f0a39` |
| reviewed immutable bundle | `scripts/lib/vip-floor-gate-c-runtime-v14.bundle.mjs` | `514ec1a3fa05467d9b76e106212f27155270dd7e66cfb4aff8b166175403cec3` |
| reviewed bootstrap | `scripts/run-vip-floor-gate-c-v14.mjs` | `c6157999def0d2fd34dcb2cb58b3202f875abfbb9cf570dcaa3e70b478fd03bc` |
| base catalog schema | `supabase/migrations/20260520000000_ghost_vip_reservation_p0.sql` | `2b9bfa5a5141e502d4f60a77f1586799b2fdc34463a748b66a70186ba14f21b3` |
| public hold RPC | `supabase/migrations/20260714121000_ghost_vip_floor_p0_public_dual_write_v8.sql` | `1973fd0f505bc01d81f7e50f52ba01a4440e104a07a053025e7144135627a23a` |
| real catalog seed | `supabase/migrations/20260530092000_ghost_vip_seed_catalog.sql` | `fb559f10b5aa3c6f453941e179e76a472f8b5f30dcb6dec47b57c160a9f96dc0` |

blockerは以下のend-to-end mismatchである。

- V14 private config validatorは `publicSlotId` と `publicOfferingId` をUUID-shaped 36-character patternに限定する。
- DB schemaとRPC parameterはpublic text IDを使い、hold RPCは値を `booking_slots.public_slot_id` と `booking_offerings.public_offering_id` へexact比較する。
- real seedはslot `ghost-osaka-YYYYMMDD-HHMM`、offering `royal-vip|prime-vip|regular-vip|floor-vip`、resource `royal-vip-1` 等を使う。
- V14 runtime cycleはconfig値を変換せずhold bodyへ渡す。

internal row UUIDをpublic IDへ代入する回避は禁止。DBへUUID-shaped synthetic catalog rowを追加する回避も禁止。validatorを実public contractへ合わせる。

## 3. additive V15 implementation

既存V14 filesを変更せず、必要なV15 versioned copiesを作る。最低限次を用意する。

1. V15 continuation/authority verifierとOPEN resolver。
2. V15 runtime source。V14 runtime behaviorを保持し、public identifier validationだけをcanonical helperへ集約して修正する。
3. dependency-free V15 immutable runtime bundle。buildは最大1回。
4. held-bytes executionを要求するV15 bootstrap。V15 authority namespaceだけをexact探索し、historical V14 authorizationが存在してもcollision扱いしない。
5. V15 manifest builder/verifier、review assembler、privacy scanner integration。
6. real catalog identifier fixturesとnegative fixtures。

public identifier helperは、DB/application contractで許容されるcanonical public textだけを受理する。最低条件：

- `publicSlotId`: `ghost-osaka-20261231-2200` を受理。
- `publicOfferingId`: `royal-vip`、`prime-vip`、`regular-vip`、`floor-vip` を受理。
- `publicResourceCode`: `royal-vip-1` を受理し、既存の1..64 bounded contractを後退させない。
- empty、leading/trailing whitespace、ASCII control、slash/backslash traversal、query/hash delimiter、NUL、overlengthを拒否。
- accepted valueをnormalize、trim、lowercase、UUID化せず、config → hold body → SQL text lookupまでbyte-identicalに保持。
- public identifierをinternal UUIDと呼称・保存・比較しない。

既存のidentity hash、credential、Stripe、Vercel、Supabase、ledger、rollback、terminal、privacy、call accounting contractは変更しない。identifier修正とV15 exact bindingに必要ないrefactorは禁止。

## 4. mandatory fixtures

manifest freeze前に、少なくとも次を既存local NodeだけでPASSさせる。

1. positive real catalog fixture：実seedからslot/offering/resource例を読み、V15 validatorが受理する。
2. negative identifier matrix：empty、whitespace、control、path separator、`..`、`?`、`#`、overlength、非stringを拒否する。
3. end-to-end equality：private config fixtureの値がruntime hold bodyへbyte-identicalに入り、RPCのtext equality lookup対象と一致する。
4. UUID substitution trap：internal row UUIDをpublic IDの正解として扱う実装をfixtureで拒否する。
5. source/bundle parity：V15 sourceとgenerated immutable bundleが同じidentifier contractを持つ。
6. authority chain：V13/V14/V15 SHA、canonical V14 terminal absent、V15 remediation scopeを検証する。
7. bootstrap authority namespace：V14 historical authとV15 future authを混同せず、V15 auth 0件ではOPEN、duplicate V15 authではfail-closed。
8. privacy scanner：secret assignment、private URL/path、provider ID、PIIの既存positive detectionを維持し、新evidence findings 0。
9. regression：V14でACCEPT済みのruntime/security fixturesをV15 semanticsへ適切に移植し、credential accounting、coalescing、unsafe mutation retry、rollback reserve、terminal commitを後退させない。

fixtureはDB/providerへ接続しない。migration/seed fileはread-only bytesとして解析する。fixture failureを期待値変更で隠さない。

## 5. single V15 manifest freeze

全fixtureとlocal syntax/static checksがPASSした後だけ、V15 manifestをexact1回freezeする。freeze後はreview対象bytesを一切変更しない。

manifestは最低限次を含む。

- V15 directive/proposal/authorization、V13 terminal、accepted V14 manifest/review、contract HOLD、historical Gate C/pre-bootstrap authority。
- V15で追加した全executable/library/bundle/bootstrap/schema/fixture/resultのtransitive closure。
- immutable DB schema/RPC/seed fixture inputのexact hashes。
- V14→V15 added/changed/deleted set。V14 declared bytes changed/deletedは0。
- identifier positive/negative/end-to-end/UUID trap/source-bundle parity結果。
- manifest freeze1/1、review dispatch0/2、private/secret/provider/external/mutation/deployすべて0。
- public privacy findings 0。
- conditional authority reissue contractと旧Gate C ceilingのnon-expansion比較。

manifest verifierはdeclared bytes、mode、path、closure、bundle hash、fixture result、authority semantics、ceiling arithmetic、privacyをindependentに再計算する。self-verifierがfreeze後に失敗した場合、2件目を作らずHOLDする。

## 6. fresh independent runtime/security review

manifest verifier PASS後、同一exact manifest SHAを2名へ渡す。

1. runtime reviewer：real seeded identifiers、config→hold body→RPC text equality、no UUID substitution、source/bundle/bootstrap parity、plan/ledger/rollback/terminal、旧Gate C ceiling不変をread-only審査。
2. security reviewer：identifier length/charset/injection/traversal境界、authority namespace、OPEN guard、private boundary、privacy scanner、restricted test Stripe/raw webhook signature contract不変をread-only審査。

reviewerは独立、read-only。external call0、secret read0、provider API0、private candidate read0、file mutation0。各review resultは少なくとも次を返す。

- role、manifest path/SHA、reviewed file count
- externalCalls、secretReads、providerApiCalls、externalMutations、filesModifiedのinteger 0
- decision `ACCEPT` または `REJECT`
- blockingFindingCountと具体的findings
- realCatalogPositiveFixtureReviewed、negativeBoundaryFixtureReviewed、sourceBundleParityReviewedのboolean

2件をadditive保存しreview aggregateを作る。manifest SHAが異なる、reviewer contract不足、1名でもREJECT、blocking finding >0ならaggregate decisionはREJECT。追加修正・manifest・reviewは禁止し、§8へ進む。

## 7. 2/2 ACCEPT後だけauthority再発行

same exact manifestのruntime/securityがともにACCEPT・blocker0の場合だけ、accepted review aggregateをfreezeし、次を新しいversioned V15 filesとして作る。

1. exact V15 Gate C directive。
2. exact V15 Gate C ceiling proposal。
3. direct Owner authorization evidence。現在のV15 Owner authorizationが許可したconditional reissueであることをsemantic validationする。
4. exact companion pre-bootstrap initialization authority rebind。旧pre-bootstrap proposal/authorizationのscope・ceilingを拡張しない。
5. `READY_FOR_V15_GATE_C_PREBOOTSTRAP_EXECUTION_UNDER_REISSUED_AUTHORITY` checkpoint。

新Gate C authorityはaccepted V15 manifest/review、V13 terminal、accepted V14 history、V15 lineage、既存private root identityへexact bindする。旧Gate C authorityを変更・削除せずhistorical superseded authorityとして保持する。

Gate C ceilingsは次を超えてはならない。

| counter | maximum |
|---|---:|
| phase/lifetime calls | 500 / 500 |
| forward/rollback calls | 472 / 28 |
| forward provider/other calls | 400 / 72 |
| rollback provider/other calls | 20 / 8 |
| forward/rollback mutations | 60 / 3 |
| credential reads | 8 |
| prebuilt/runtime/watchdog deploys | 1 / 6 / 2 |
| total deployments | 9 |
| webhook updates/compensations | 9 / 1 |
| DB CAS/affected rows | 3 / 3 |
| synthetic cycles | 2 |
| watchdog timeout | 420000 ms |
| rollback absolute deadline | 600000 ms |
| Production/Preview/LINE/live Stripe/real customer mutations | 0 |

pre-bootstrap companion authorityはprior authorization `0241d1b155ef47ccb9bef180b4d96a80251ec539aa9ee93510f660f34dd3f9c9`のmechanical rebindのみ。provider read/mutation、admin session、private write ceilingを増やさない。historical Supabase project inventory diagnostic 1 callは消去・V15 ledgerへの付け替えをしない。

authority files作成後、JSON/SHA chain、semantic schemas/decisions、private-root hash binding、ceiling equality、V15 bootstrap discovery uniquenessをoffline検証する。ここで必ず停止し、private config作成、credential read、provider API、bootstrap、Gate C runtimeを開始しない。

## 8. REJECT/HOLD path

1名でもREJECT、manifest verifier failure、authority drift、fixture failure、review contract failureがある場合：

1. reject reviewsとaggregateをadditive保存する。
2. sanitized `V15_REMEDIATION_REVIEW_HOLD_REQUIRES_NEW_DIRECT_OWNER_AUTHORITY` checkpointを作る。
3. Gate C/pre-bootstrap authorityを再発行しない。
4. 追加修正、2件目manifest、review再dispatch、credential/provider/private accessを行わない。
5. blockerと必要な次authority scopeを具体的にhandoffする。

V13/V14 terminalを変更せず、V15 terminalも作らない。canonical V14 terminal absentを維持する。

## 9. validation、privacy、handoff

1. 全JSON parse、SHA chain、manifest verifier、authority semantic verifier、privacy scannerをPASSさせる。
2. explicit local Nodeでsyntax/module/fixtureを検証する。lintが必要なら既存local binaryを直接使い、`npx`やpackage resolutionを起こさない。
3. `git diff --check`を対象ファイルへ実行する。無関係なdirty changesは報告のみで触れない。
4. public evidenceへsecret、provider ID、private URL/path、PIIを含めない。raw/private evidenceはこのpromptでは作らない。
5. `docs/AI_WORK_LOG.md`へcompact rowを追記し、`docs/AI_CURRENT_STATUS.md`を最新状態へ更新する。
6. 最終応答は、V15 manifest/review decision、変更ファイル、主要fixture、counter、authority/checkpoint path+SHA、Gate C未実行を簡潔に報告する。

成功条件は「same exact V15 manifestのruntime/security 2/2 ACCEPT」と「非拡張Gate C＋pre-bootstrap authorityのexact再発行」までです。Gate C PASSではありません。

## END PROMPT
