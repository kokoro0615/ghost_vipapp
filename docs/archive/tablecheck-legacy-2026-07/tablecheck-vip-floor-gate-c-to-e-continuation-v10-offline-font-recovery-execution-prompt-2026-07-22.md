# TableCheck VIP Floor Gate C→D→E v10 offline-font recovery execution prompt

作成日: 2026-07-22 JST  
目的: v9 terminal後にOwnerが直接承認したexact v10 lineageを実行し、credential-safe candidate、fresh 3/3 review、Gate C、真正なsigned PASS後のGate D、truthful Gate D PASS後のGate Eまでを条件付きで完遂する。  
この文書はstandalone execution promptである。推測によるauthority拡張、旧terminal改変、未来のPASS/人間署名の合成を禁止する。

## START PROMPT

あなたは `/home/kokoro/projects/clients/ghost` のprimary implementation agentである。次のexact authority chainをbytesで再検証してから作業する。

1. Owner directive
   - `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v10-offline-font-recovery-owner-directive-v1-20260722T055051+0900.json`
   - SHA-256 `465940d6b9fe21299b53b209b60f5049f742a04dfe32d737b7b12a35d2838fe3`
2. exact proposal
   - `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v10-offline-font-recovery-authorization-proposal-v1-20260722.json`
   - SHA-256 `260b9ace36ce08da4b17a7999d0574a870ecd2dcd096b1fc51f6224959da240e`
3. Owner authorization
   - `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v10-offline-font-recovery-owner-authorization-v1-20260722T055230+0900.json`
   - SHA-256 `643917e9b1004d2800504bb3ab9abe843b7c54e08cd009939dd26653f39276b4`
4. immutable v9 ancestor terminal
   - `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-terminal-hold-v9-20260722T053600+0900.json`
   - SHA-256 `878bce32b62be92eb34ac9b76e09123cd3302f38d806d4e2db05ee98ea1587fd`
5. additive causal correction
   - `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-build-attempt-3-root-cause-correction-v7r11-20260722T054500+0900.json`
   - SHA-256 `ff64acf7faa72f06a70a51692d4ba4c73cf433dc219f87334e51487a56736aef`
6. frozen v9 application boundary
   - `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-source-freeze-plan-v7r7-20260722T052811+0900.json`
   - SHA-256 `0e715bcf16f5d69b73fba7e3b8ca73b948def30504bf308bed900a1052823a6d`
7. carried v9 proposal / authorization / prompt
   - proposal SHA-256 `a141d4ed56fc2cba63fb31adf9fa2d59de8aaaa4efb9967cf53dbfa9b2ae0980`
   - authorization SHA-256 `44ceb50f5c064aeb010f2777ade5cf4635a157cfec80a28c129d6e9409c3f476`
   - prompt SHA-256 `bb220077bf7fe1a2846b9f0adac09d25016664c7fe5dc2118ae0efc8e71ba71c`

SHA、JSON parse、role、referential adoption、proposal adoption、lineage、ancestor、ceiling、carry-forward modeのどれかが不一致なら、secret read/API/build/mutation前に停止する。authority JSONを修正して合わせてはならない。

## 1. shared workspace protocol

開始時に次を読む。

- `docs/AI_CURRENT_STATUS.md`
- `docs/AI_WORK_LOG.md` の最新行
- `docs/AI_AGENT_SYNC.md`
- root `AGENTS.md`
- `website/AGENTS.md`

既存dirty worktreeは他者の作業として保存する。旧evidence、terminal、authority、reviewを削除・上書きしない。変更はv10以降のadditive tooling/evidenceだけにする。application source、migration、package、lockfileは変更しない。

UIへ到達するのはauthentic signed Gate C PASS後だけである。その時点で `.Codex/docs/DESIGN.md`、`website/docs/ui/UI_TOOLKIT.md`、`website/src/app/globals.css`、closest v1 UIを全文再読する。

## 2. exact v10 terminal resolver

additive v7r12-or-later resolverを実装する。resolverはsecret reader、provider adapter、build child、mutation hookを呼ぶ前に必ず実行する。

- exact ancestorはv9 terminal SHA `878bce32...a1587fd` 1件だけ。
- v9 lineage terminalはexact1件で、追加terminalを許さない。
- v10 lineage IDは `gate-c-to-e-continuation-v10-offline-font-recovery`。
- v10 terminalは開始時0、最終的に最大1。
- ancestor/current collision、複数current terminal、history rewrite、authority driftを拒否する。
- negative fixtureはreal callable secret/API/build/mutation trapsを0 callのまま停止させる。

terminalが既に存在する場合は、そのtruthful stateを報告して新しいbuild/API/mutationを行わない。

## 3. immutable application and toolchain preflight

build前に次をexact再計算する。

- source SHA `7f6b2dc10710c679496fcf4e8c253aab598529179df932a9900ec2243c267626` / 225 files
- migration SHA `c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272` / 31 files
- `package.json` SHA `ed10192f422c17c0b0e7eefd698d0a5354e8b0fd63037fd49c31f56890732e75`
- `package-lock.json` SHA `f8b5cf7e29d53beb81291461db1916a945e9728d248d22ee0dd12293c74d6aa3`
- `next.config.ts` SHA `c96c1e93714a9bb43bf3f0a22f8336351cfdba26355da29e8d212f9b32823426`
- Next.js `16.2.10`
- Google CSS fetch module SHA `7b279a573e0d7830c009de535e9289a8040fd37f22282b78373815a7b4eed95d`
- font file fetch module SHA `c9476e7ff5b1baf16b07262c1891e8c22da205638ac65ab552ee978d7b925539`
- Google font loader SHA `45e38a6da7efde1a8f53c29619af2eb8f202d352119dbc91c7714db07db385f4`

Nextのinternal mock seamをpublic APIと表現しない。installed test-only implementation seamとしてexact version/hashへbindする。どれかがdriftしたらbuildせずHOLD。

## 4. private prior-artifact font verification

旧v7r5 successful artifactをread-only入力として扱う。private absolute pathはpublic evidence、commentary、final responseへ出さない。

expected aggregate:

| family | face/font count | bytes | canonical manifest SHA-256 |
|---|---:|---:|---|
| Barlow Condensed | 12 | 114456 | `49778823a554e4c7de029e8fb020a2ef5b081367c0e275cba151b7364c706567` |
| Bodoni Moda | 4 | 136412 | `0515ab8ee8ad44f160e9e4b36ad33e10f58053da4baf9b1a010c4bf35ac30b7e` |
| Inter | 7 | 218888 | `7a23bda5da31c441fccdac44fd0fc50bd7d5f4bc0d6d31c9fe28c1cf5ebd927f` |
| Noto Sans JP | 124 | 5221836 | `d0ebfeb6b5222ce51c87a255857155f23de60a9512171259104549e642d9e995` |
| Shippori Mincho | 488 | 15206524 | `152ee747a3eb77dc56552bdb111fd16d8622e4b97c7093a7ca7f3f1734383117` |

totalは635 files / 20,898,116 bytes、family summary SHA `cdd8e99064406996e8b623efe3e890a4a7abcdb4a3fa9a1cf39fec3de2ea7cbd`。全fileについて次をcontent使用前に検証する。

- resolved pathがimmutable artifact root内
- regular file、owner、link count 1
- symlink 0
- expected byte count/SHA
- first 4 bytesがWOFF2 signature
- CSS `src` pathがexact1 fileへ解決
- missing、duplicate ambiguity、path escape、unexpected familyは0

旧artifactのpreloaded `.p.woff2` referenceは6 files、manifest SHA `84b0c8ebc0ee1d8979f396a016970ef6f8ae1e934154e4f358419bd52ebef68d`。この集合もexact再計算する。

## 5. deterministic private fixture — maximum 1

private fixture materializationは全v10で最大1。directory `0700`、全file `0600`、effective user owner、regular、link count 1、symlink 0。原子的に作り、途中失敗したdirectoryを成功fixtureとして再利用しない。materialization intentをprivate journalへ先に記録する。

fixture generatorはinstalled Next validation/URL generatorを実行してexact five request keysを得る。raw request URLをpublic evidenceへ出さず、sorted SHA setを次へ一致させる。

- `1203b58e6fcf6396fff74da8b7e0f42759155683b61ae16401f84355f662c787`
- `308b253e1af73c888742ee1ca2434232a4ec09b6502f440b8e59582e227efa14`
- `572f77bc03af3a47e835920909f7f0292ab95aca512ac29df9bb069ea5911cc4`
- `9d75111304d022d67c8213ef3b62ccc707c545c2837f53fd847fbd395143a72c`
- `ded12e7a6b0cd77bfa0ae800fdcd565934174af4e4983ab65658fbb89edd53bd`

各familyの旧built CSSからexact `@font-face` blocksだけを抽出する。family、style、weight、display、unicode-rangeを保持し、`src`だけをprivate fixture内へcopyしたexact WOFF2 absolute pathに置換する。各blockを独立lineにする。

preload semanticsは旧artifactで`.p.woff2`だったexact6 blocksの直前だけ `/* latin */` を置き、その他はpreload対象外のcommentにする。Nextの`findFontFilesInCss`が、current sourceでpreload=trueのBodoni Moda、Barlow Condensed、Interについてexact6だけをpreloadと分類することをunit testする。Noto Sans JPとShippori Minchoはsourceでpreload=false。

fixture moduleはfive exact request keysからCSS stringへのplain mappingだけをexportする。credential、environment payload、provider identifier、private artifact original path、network fallbackを含めない。build専用processへ `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` として渡し、親environmentへ永続設定しない。

fixture materialization後、次をfreezeする。

- generator/tool version and SHA
- input artifact SHA and five family manifests
- 635 copied WOFF2 SHA/byte/signature manifest
- five request-key SHA set
- CSS block count/weight/style/unicode-range/preload manifest
- fixture module SHA
- mode/owner/link/containment summary
- secrets/provider/private pathを含まないsanitized public plan

fixture内容やabsolute pathをpublic evidenceへ出さない。fixtureをprovider uploadへ含めない。

## 6. isolated builds — maximum 2

build attemptはsetup failureも含めて最大2。blind retryは禁止。2回目は1回目と異なるclassified root causeを修正できる場合だけ許す。

各attempt前にresolver、authority、source/toolchain、fixture、counterを再検証し、private journalへintentをfsyncする。

isolation requirements:

- isolated source copy
- credential environment inheritance 0
- `.env*` copy 0
- Vercel environment pull 0
- provider API 0
- network namespace disabled
- private fixture/font rootだけread-only mount
- home/provider credential roots masked
- temp/build outputはisolated writable root
- `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`以外のfixture path exposure 0
- all runtime feature flags off

build child command、exit、duration、sanitized classification、private stdout/stderr SHAをjournalする。public evidenceへraw log/pathを出さない。

build成功時はcandidateをimmutable private rootへcopyし、artifactとprovider-comparable manifestを生成する。candidate freezeは最大2、adoption最大1。candidateごとにregular/owner/mode/link/containment、source/migration/package identity、environment payload path 0、credential candidate 0をsecret content read前に検査する。

2 attemptでsafe candidateが無ければ、exact one v10 `GATE_C_HOLD` terminalをatomic publishして停止する。

## 7. artifact safety and adoption

safe candidateに対して、carried v9 exceptionの範囲でのみ locally identified ignored environment fileを扱う。

- permission tightening to 0600 maximum 1
- content modification/deletion 0
- exact-value HMAC leak scan secret read maximum 1
- HMAC keyはephemeral/private、value/key/match materialをoutputしない
- other credential read before review 0

candidate artifact/provider upload全entryをscanし、environment payload path、credential candidate、known-secret exact-value HMAC match、symlink/path escape、wrong owner/mode/linkを全て0にする。1件でもあればcandidateをadoptせず、remaining ceilingがあって原因が異なる場合だけ第2candidateへ進む。

adoption recordはsource/migration/package/Next contract/fixture/candidate artifact/provider-comparable SHAとcountsをexactに結ぶ。adoption後にbytesを変更しない。

## 8. v7r5 19 blockers and fresh manifest

v9で実装済みのv7r7+ toolingを継承するが、current v10 manifestへ無条件に流用しない。v9 promptの19 blocker closureを、current exact source、adopted candidate、v10 authority、fixture boundary、terminal resolverへ再bindする。

fresh manifestは少なくとも次を宣言し、self-reference以外を再hashできるようにする。

- v10 directive/proposal/authorizationとv9 ancestor/correction/carry-forward chain
- source/migration/package/Next loader hashes
- private fixture sanitized manifestとbuild attempt counters
- candidate/adoption artifact/provider-comparable manifests
- complete privileged executable/library/fixture/schema/package closure
- 19-finding closure ledgerとreal positive/negative results
- terminal/journal/resume/build/artifact/HMAC/readiness/state machine/CAS/cycle/observation/rollback contracts
- exact authority ceilings and consumed/remaining counters
- public privacy findings 0

undeclared privileged entrypoint、missing/extra executable load、symlink/path/mode violation、authority drift、fixture/result mismatch、counter mismatchをverifierで拒否する。

## 9. exactly three fresh read-only reviews

同じexact manifest bytesへexactly three independent reviewを行う。

1. provenance
2. runtime
3. security

各reviewはread-only、secret read 0、external call 0、external mutation 0。reviewerはmanifest/codeを変更しない。実行環境のagent policyで独立reviewerを用意できなければ独立性を捏造せずHOLD。

3/3 ACCEPT、blocker 0、same manifest SHAだけが後続credential/provider/runtime accessを開く。1件でもREJECTならreviewを保存し、後続へ進まない。修正にはnew version、new manifest、fresh exactly-three reviewが必要。

## 10. post-review Gate C carry-forward

3/3 ACCEPT後だけ、v9 proposal/promptの次をexact ceilingで実行する。

- private credential reads max 8
- authenticated read-only provider/runtime API calls max 4096
- all-off bootstrap custom-staging deployment max 1 when fresh readiness routes are absent
- exact identity/project/environment/Production/Preview/LINE/Stripe-test/Supabase readback
- existing valid authorized admin session優先、必要時だけnamespaced synthetic manager fallback
- custom-staging total deploy max 9 = prebuilt 1 + runtime 6 + watchdog 2
- existing test webhook update max 9、compensation max 1
- DB setting CAS/affected rows max 3/3、schema mutation 0
- exact synthetic cycles 2
- observation ≥ 1,800,000 ms、unique attributable comparisons ≥ 1,000、success ≥ 0.999、p95 ≤ 25 ms
- critical mismatch/race/privacy/provider duplicate = 0
- rollback initiation ≤ 60,000 ms、completion ≤ 600,000 ms
- final all-off

全external mutationはintent journalを先にfsyncし、receiptとauthenticated readbackを取る。unknown outcomeはceilingを消費し、same idempotency identityでread-only reconcileする。blind retryしない。

Production、Preview、LINE、live Stripe、real customer、manual alias、deployment delete、persistent provider env、project config、destructive/down migrationは0。

## 11. authentic Gate C attestation boundary

fresh final Gate C manifestがtruthful PASS evidenceを持った後だけ、Owner / Floor Manager / Engineerのstrong-MFA post-evidence role attestationsを人間から取得する。AIはname、timestamp、MFA、signature、role recordを合成しない。このv10 authorizationをPASS attestationへ転用しない。

真正な3 role recordsが無ければ `READY_FOR_GATE_C_POST_EVIDENCE_ATTESTATION_HOLD` non-terminal checkpointで停止し、Gate Dへ進まない。揃った場合だけ `GATE_C_PASS_SIGNED_PHASE_D_AUTHORIZED` をpublishする。

## 12. conditional Gate D

exact signed Gate C PASS後だけ開始する。v9 scope/ceilingを変更しない。

- VIP Floor v2 server-gated admin UI
- floor/chart/list、detail/form、core commands
- dedicated mobile IA、accessibility、performance
- immediate v1 fallback
- Production flags default off
- custom staging deploy max 6 + watchdog max 2 = total max 8
- schema mutation 0、real customer 0、external payment/notification effect 0

GHOST Osakaのvenue-specific black-violet lacquer、champagne metal、LED rhythm、real floor geometry、dense admin operationsを使う。AI glass、gradient orb、bokeh、generic SaaS card pile、過剰な角丸を禁止する。390px、44px touch targets、長い日英label、keyboard/focus/reduced motion/contrastを検証する。

全Gate D acceptanceがtruthful PASSの場合だけ `GATE_D_PASS_PHASE_E_AUTHORIZED` をpublishする。

## 13. conditional Gate E

truthful Gate D PASS後だけ開始する。v9 scope/ceilingを変更しない。

- service periods、waitlist、blocks、staff operations、exception recovery
- dossier/contact activity、attachments、online acceptance、outbox
- data/API PASS後のdense operations UI
- additive migration only、staging bundle apply max 1、destructive/down 0
- custom staging deploy max 6 + watchdog max 2 = total max 8
- synthetic customer max 50、real customer 0
- LINE/SMS/live notification 0、Stripe mutation 0
- deterministic fake/sink notification only

E0 contract → E1 schema/RPC/API → E1b dossier/attachments → E2 UIの順序を守る。RLS/ACL、race、idempotency、revision、outbox retry/dead-letter/reconcile、audit、fallbackを検証する。

## 14. terminal and stop rules

v10 terminalはexactly oneだけ。全Gate E acceptanceまでPASSなら `GATE_E_PASS_GATE_C_TO_E_CONTINUATION_COMPLETE`、それ以外でlineageを閉じる時はtruthful stage-specific HOLDをatomic publishする。

次のどれかでnew work/mutationを停止し、許可済みrollback/compensationだけを行う。

- authority/ancestor/terminal/source/toolchain/fixture hash drift
- private path、secret、PII、provider identifier/URLのpublic leak
- build/fixture/candidate/adoption/read/API/mutation ceiling到達または超過
- network/provider access during isolated build
- safe candidate不在
- artifact environment/credential/HMAC/symlink/path/mode finding
- fresh 3/3 ACCEPT未達または独立reviewer不在
- environment/project/identity/Production/Preview/LINE/live Stripe/real customer invariant不明または変化
- journal/readback/idempotency reconciliation欠落
- observation/rollback threshold未達
- authentic Gate C attestation不在のままGate D開始
- truthful Gate D PASS不在のままGate E開始

ceilingや権限の追加推論は禁止。必要ならtruthful HOLDと新Owner decisionを求める。

## 15. validation and handoff

scopeに応じてJSON parse、SHA chain、privacy scanner、syntax/module load、target ESLint、TypeScript、fixtures、artifact verifier、build、API/DB/race/rollback/auditを実行する。狭いtestで広いPASSを主張しない。

checkpointごとに変更files、commands、exit codes、hashes、counts、consumed/remaining ceilings、external countersを記録する。private raw evidenceはowner-only、public evidenceはsanitized additiveのみ。

作業またはvalidation/research/stateが変わったturnでは `docs/AI_WORK_LOG.md`へcompact rowを追記し、`docs/AI_CURRENT_STATUS.md`を更新する。work logがroughly 100 rowsを超えたらolder rowsを`docs/archive/`へ移す。

final responseはcurrent gate/state、PASS/HOLD、主要changed files、validation、external counters、terminal/checkpoint path+SHA、必要なauthentic human actionを簡潔に報告する。

## END PROMPT
