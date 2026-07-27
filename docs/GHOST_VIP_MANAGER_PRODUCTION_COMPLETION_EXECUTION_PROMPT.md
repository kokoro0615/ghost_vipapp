# GHOST VIP Manager 長時間化収束・残作業限定・Production完遂 実行プロンプト

この文書は、`GHOST_VIP_MANAGER_TRIAL_EXIT_PRODUCTION_LIGHT_UI_EXECUTION_PROMPT.md`
の最初からの再実行版ではない。2026-07-27 JST 時点で完了・検証済みの成果を
immutable baselineとして再利用し、未完了だけを一気通貫でProductionへ運ぶ
continuation promptである。

このまま新しいCodex実行sessionへ貼り付けて使用する。

---

## 0. 最上位命令

あなたはGHOST VIP Manager正式Production releaseの単独統括executorである。
調査、最小修正、validation、backup/restore、migration、deployment、
promotion、mutation canary、rollback、証跡更新までを止めずに完遂する。

Ownerは2026-07-27 JSTの次の指示により、このreleaseに必要なin-scope判断と
state changeをexecutorへ委任済みである。

> 長時間終わらない事象を徹底的に研究し、原因追究し、未完了の残りの作業を
> 洗い出し、本番でお客様が触れるレベルまで完成させ、一気通貫する。
> すでに完了済の部分を再度実装しない。実装中に再度承認を求めない。
> executorへ承認権限を与える。

したがって、この実行中にGate A/B/C/D/E、Production DB、Vercel promotion、
release flag、rollbackについてOwnerへ再承認を求めてはならない。この文書は
承認依頼ではなく、上記のstanding authorizationを記録した実行指示である。

ただし委任は無制限ではない。次はscope外であり、勝手に有効化しない。

- Stripe課金、LINE、email、SMS、webhookなど外部providerの実送信
- VIP Manager以外の無関係なpublic site改修
- customer data export、PIIの証跡保存、秘密値のログ出力
- 無関係なdependency更新、全面refactor、schema再設計
- 本releaseと無関係なrepository・project・domainへのmutation

driftや失敗があっても承認を取り直すのではなく、まずstate changeを中止し、
既知safe stateへrollbackし、原因を特定してin-scopeの最小修正を行い、
同じpreflightを再成立させた後にexecutor自身がrelease判断する。秘密情報や
物理端末など本当に外部にしか存在しないものが最後まで得られない場合だけ、
独立して完了できる全作業を終え、重複しない一件のhandoffへ集約する。

---

## 1. 起動時に必ず読むもの

最初に以下を読み、共有stateとrepository rulesを同期する。

```text
/home/kokoro/projects/clients/ghost/AGENTS.md
/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md
/home/kokoro/projects/clients/ghost/docs/AI_WORK_LOG.md
/home/kokoro/projects/clients/ghost/docs/AI_AGENT_SYNC.md

VIP worktree:
/home/kokoro/projects/clients/ghost/.worktrees/vip-manager-production-light-ui

Website worktree:
/home/kokoro/projects/clients/ghost/.worktrees/vip-manager-production-backend
```

次の正本と既存証跡も読む。ただし古い`HOLD`、`exact 24`、fresh approval要求は
現stateより古い可能性があるため、Git、deployment、databaseの直接証拠を優先する。

```text
VIP:
docs/GHOST_VIP_MANAGER_SPEC.md
docs/GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md
docs/GHOST_VIP_MANAGER_TRIAL_EXIT_PRODUCTION_LIGHT_UI_EXECUTION_PROMPT.md
docs/evidence/trial-exit-production-light-ui-2026-07-27/

Website:
docs/evidence/trial-exit-production-light-ui-2026-07-27/
scripts/verify-vip-manager-production-migration-contract.mjs
```

canonical checkoutに未commit変更がある場合は触らない。上記のclean isolated
worktreeだけで作業する。別agentの未commit変更を上書きしない。

---

## 2. 完了済みimmutable baseline — 再実装・再cleanup禁止

以下は完了済みである。read-only drift checkと最終smoke以外はやり直さない。

### 2.1 Gate A / Trial終了

- Supabase staging ref: `rsvrtaavofflkvtfzsfh`
- exact Trial run: `trial-20260726-adaa919e0001`
- baseline SHA-256:
  `08abb1dee60ee7d74f281f058b70fd253e374cfc40066a7eeaf359f840306e40`
- 28 lineage tables: `0`
- run/control rows: `0`
- orphan rows: `0`
- `T*` / `TRIAL*`: `0`
- official active tables: `VIP-1`〜`VIP-8`のexact 8
- sent provider jobs: `0`
- active Trial admin sessions: `0`

初回cleanupでunscoped `admin_pin.set` auditがFKを保持した事象も解決済みである。
original Trialを再seed、再cleanup、repair、renameしてはならない。

### 2.2 UI / runtime / contract

- warm-white、white panes、graphite、restrained champagneのlight operations UI
- List / Floor / Chart、queue、Inspector、create/edit、6 commands
- 36 states × 6 viewports = 216 screenshots
- automated a11y、overflow、44px targets、reduced motion、old purple `0`
- unit、contract、lint、build、typecheckの既存PASS
- route-state実不具合は修正済み:
  `updateRoute`はstale `useSearchParams`ではなく`window.location.search`からmerge
- runtime source commit: `bee12db`以降のcandidateへ含まれる
- regression test:
  `tests/unit/workspace-route-sync.test.mjs`

このUIを再設計、全面refactor、別design systemへ置換してはならない。

### 2.3 Staging migrations / safety

- v18:
  `20260726205147_ghost_vip_floor_audit_iso_timestamp_guard_v18.sql`
- v18 SHA-256:
  `4bf5609b1c8f3f9f49d927465b9fecf4682d535404f557a8f6546cc4c954260e`
- staging migration historyへ適用済み
- helper MD5:
  `293c4641fc2fb18c07ed79a80b0378e5`
- exact timestamp accept、phone/email/secret reject、privilege preservation PASS
- PostgreSQL 16 clean/inactive-history portable migration + dump/restore PASS

Production allowlistは25件である。Trial-only v16/v17は除外する。24件へ戻さない。

### 2.4 現在のdeployment anchor

実行開始時に`vercel inspect`で再確認するが、2026-07-27のfreezeは次である。

| Role | Deployment | URL / state |
|---|---|---|
| VIP fixed maintenance | `dpl_6zRMGjhUo7HLwAcuWAKRMVKxZg7C` | `https://ghost-vipapp.vercel.app`, READY |
| VIP latest unpromoted candidate | `dpl_CtvV5cnxVqF9XXaa4jgt2HLaJgrz` | `ghost-vipapp-31ocr4yys-kokoro06152002-7861s-projects.vercel.app`, READY |
| Website staging candidate | `dpl_3BbLAnDyra2RiRTYRY3Vr7Eznk8C` | `ghost-a89t1uiub-kokoro06152002-7861s-projects.vercel.app`, READY |
| Website current Production | `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP` | `https://ghost-ruby-one.vercel.app`, READY |

VIP isolated branchのprompt作成時HEADは`1ecd3e2`、Website isolated branchは
`397f191`でcleanだった。runner-only commitはruntime redeployを要求しない。
実行開始時にbranch tip、tree、deployment sourceを再freezeし、変化があれば
差分の意味を判断する。単にSHAが進んだだけで完了済みを再実装しない。

---

## 3. 長時間化の原因

長時間化は「主要機能が未実装だから」ではない。主因は次の4層である。

### 3.1 process control failure

PR-5がseed → API → UI → verifier → cleanupを一つの長いlifecycleとして持ち、
局所的なharness不具合のたびに全fixtureを最初から作り直した。各runは安全に
cleanupされたが、問題箇所に到達するまで毎回同じ前半を繰り返した。

### 3.2 harness assumption defects

既に修正された代表例:

- normalized guest labelで検索していたがpublic codeが正しかった
- relative URLをpage requestへ渡した
- async route sync前にfilterをassertした
- tablet railが閉じたままqueue可視を期待した
- expectedなPIN/session `401`、logout `401`、offline errorをconsole failure扱いした
- realtime pageで`networkidle`を待ち続けた
- delayed metricsとcleanupがraceした
- cleanup後にfinal verifier retryを重ね、成功し得ない再試行をした

これらを再び「アプリ本体の全面不具合」と解釈しない。

### 3.3 実アプリ不具合

route updateがstale search paramsからURLを再構築し、filter/queryをclobberする
実不具合が一件あった。これは修正・test・candidate deploy済みである。

### 3.4 現在残る唯一のPR-5 contract gap

最後のfull lifecycleは最終verifierまで到達し、次で停止した。

```text
release_candidate_lifecycle_failed:
verify-vip-manager-release-candidate_mjs:
exit_1:
unknown:
release_candidate_audit_coverage_missing:customer_profile_upserted
```

直接原因:

- runnerは`PATCH .../customers/:id/attributes`を実行し
  `customer_profile.attributes_updated`を生成する
- runnerの結果JSONは`customer_profile.upserted`を検証済みと誤って自己申告する
- verifierは`customer_profile.upserted`と
  `customer_profile.attributes_updated`の両方を要求する
- Websiteには既存の
  `PATCH /api/admin/v2/customers/[customerId]`があり、
  `upsert_admin_customer_profile_v8`と
  `customer_profile.upserted`を実装済み
- VIP proxy/UIは現状attributes updateとrelinkを提供し、base-profile upsertは
  呼んでいない

これはDB drift、cleanup不良、再seed不足ではない。spec/API/UIのcoverage境界と
runnerの操作が一致していないdeterministic contract mismatchである。

---

## 4. anti-loop実行規約

以下を全Waveへ強制する。

1. 同じfailure classを、変更なしで2回を超えて再実行しない。
2. full PR-5は一つのcode deltaにつき最大1回。
3. full PR-5の前にtargeted contract testまたはfocused staging probeを通す。
4. focused probeは一度seedしたfixtureを使い、対象endpoint/actionだけを検証し、
   `finally`でexact cleanupする。別runのdataを再利用しない。
5. realtime pageに`networkidle`を使わない。bounded
   `domcontentloaded` + application-ready assertionを使う。
6. expected `401`、offline error、logout invalidationをfailureから除外するが、
   unexpected `4xx/5xx`を広く無視しない。
7. retryはtransient network/observability delayだけ。contract mismatch、
   checksum drift、auth policy error、missing audit actionはretryしない。
8. 失敗後は必ず独立clean verifierを一度だけ実行し、DBがzeroなら再cleanupしない。
9. validationは変更の影響範囲だけを先に実行する。最終Gateで一度だけfull CIを行う。
10. timerを眺め続けない。各commandへtimeout、phase名、safe stderr classificationを
    付ける。60秒以上の実行は進捗を出す。
11. 証跡はimmutable resultを再利用する。時刻だけ更新するための再runは禁止。
12. secret、PII、customer row raw payloadをconsole、Markdown、Gitへ出さない。

---

## 5. 実行Wave

### Wave R0 — read-only re-freeze

state change前に次を一度だけ取得し、redacted manifestへ記録する。

- Git branch、HEAD、tree、clean status、remote tracking
- VIP fixed URLがmaintenance `dpl_6zR...`か
- VIP/Website candidatesのdeployment ID、READY、target、exact host
- Website Production aliasのcurrent deploymentとrollback ID
- staging/production Supabase refをhostから独立照合
- staging original Trialと最後のRCの28 lineage/control/orphan/provider zero
- official active table `VIP-1`〜`VIP-8` exact
- production migration head、backup inventory、PITR/physical backup状態
- runnerとlifecycle scriptsのcurrent SHA-256
- temporary bypass、temporary credential fileの実在有無

読み取り結果が上のfreezeから変わっても、直ちに最初からやり直さない。差分を
`expected progress`、`safe tooling-only change`、`release-affecting drift`へ分類する。
release-affecting driftだけを原因追跡する。

R0中にstale evidenceを更新する。

- Gate Aを`PASS`にする
- PR-5を現在のaudit coverage gapへ更新
- runtime candidateとrunner SHAを更新
- Production migrationをexact 25へ統一
- v18 staging/portable restore証跡を反映
- 古いfresh approval待ちをstanding authorizationへ置換

### Wave R1 — `customer_profile.upserted` gapの最小収束

最初に正本仕様、UI customer workflow、既存Website v2 route、RPC、audit verifierを
読み取り、次の順で判断する。

1. PR-5の「customer search/write/relink」がbase profile writeを含む契約か確認。
2. 既存Website endpointがProduction対象APIとして実装・flag・idempotency・version
   conflict・PII encryptionを満たすか確認。
3. 満たす場合は、runnerへ既存endpointを一回呼ぶ最小操作を追加する。
   新しいschema/RPC/UIは作らない。
4. base profile writeが正本scope外だと直接証拠で判明した場合だけ、verifierの
   required audit setをaccepted UI workflowへ狭める。
5. actionを発火していないのに`verifiedAuditActions`へ書くだけのfake passは禁止。
6. `customer_profile.upserted`を無条件で削除してgreen化するのも禁止。

推奨解は、既存Website v2 profile PATCHが既に正式APIなら、synthetic customerへ
idempotentな最小profile updateを行い、version、audit、cleanupを検証すること。
VIP customer-edit UIの不足を新機能として追加するのは、正本が明示要求する場合だけ。

追加するtargeted tests:

- runnerが実際にprofile endpointを呼ぶ、またはrequired set変更に正本根拠がある
- success actionとconflict/idempotency
- secret/PIIがoutputされない
- audit actionをfake resultから推測しない
- failureでもcleanupが走る

targeted static test後、fresh `trial-rc-*`を一件だけseedし、対象profile action、
audit delta、cleanup zeroだけをfocused staging probeで確認する。

### Wave R2 — PR-5を一度だけ完走

R1のfocused probeがPASSしてから、fresh RC IDでfull PR-5をexact一回実行する。
既存clean済み`trial-rc-20260727-0559-v18-pass`を再利用しない。

必須flow:

- Basic + PIN login、session expiry、re-login、logout
- current/alternate business date、search、全filter
- List/Floor/Chart、queue、Inspector
- reservation create 8 steps、edit
- check-in、arrival、service status、assignment、extension、note
- Walk-in、Waitlist create/call/seat、block create/update/cancel
- staff assignment、customer search/write/relink
- realtime gap recovery、offline read-only、conflict recovery
- SLO/attention、audit/revision/metric

PASS条件:

- required audit actionsが実データに存在
- runnerの自己申告ではなくDB verifierが証明
- 28 lineage/control/orphanがcleanup後zero
- official `VIP-1`〜`VIP-8`不変
- baseline hash不変
- sent provider jobs `0`
- deployment logsのprovider delivery `0`
- unexpected console error `0`
- unexpected `5xx` `0`
- temporary sessions `0`

failureならfull PR-5をそのまま再実行しない。cleanup zeroを一度確認し、新failure
classへR1と同じtargeted processを適用する。

PASS後、release用temporary bypassをrevokeし、repo外temporary credential/
manifest filesをsecure deleteする。既に存在しなければ「absent」を証跡化し、
再作成して削除実績を作らない。

### Wave R3 — Production logical backup / isolated restore / exact 25 migrations

Production refは既存evidenceの`cpfsrwctjymhmwvsbwdi`をread-onlyで再照合する。
staging refやservice-role JWTをDB passwordとして使わない。

現行Supabase公式手段を実行時に再確認し、利用可能な既存secure credentialまたは
supported connection flowでlogical backupを作る。password resetが必要な場合は、
先に全consumerとrotation影響を棚卸しし、接続断を起こさない安全な手順を選ぶ。
値をGitやshell historyへ残さない。

最低限のbackup:

- roles
- schema
- data
- migration history
- Storage object本体はDB backup外であることを明記

artifactはrepo外、mode 600、暗号化、SHA-256付きとする。次をisolated PostgreSQL
またはisolated Supabase projectへrestoreしてからProduction migrationへ進む。

- restore command成功
- critical row counts/hash
- official active 8
- known inactive history 2と参照2+2の保全
- FK validated / orphan zero
- RLS
- critical RPC/function countとprivilege
- public booking read path
- Trial controls absent
- provider sent baseline

restored snapshotへ次のexact 25 allowlistをchecksum一致で順番に適用する。

```text
20260714090000
20260714090500
20260714091500
20260714093000
20260714094500
20260714095000
20260714100000
20260714103000
20260714110000
20260714120000
20260714120500
20260714121000
20260726150000
20260726160000
20260726161000
20260726161500
20260726170000
20260726171000
20260726172000
20260726173000
20260726174000
20260726174100
20260726174200
20260726175000
20260726205147
```

除外:

```text
20260726180000  # Trial safety v16
20260726181000  # Trial cleanup v17
```

restore rehearsal PASS後だけProductionへ同じ25件をapplyする。各migrationはhistory、
checksum、postconditionを確認する。途中失敗時は無理にrerunせず、transaction状態を
確認し、必要ならbackupからrollback/recoveryする。

Production postcondition:

- active/UI official 8
- inactive history/refs preserved
- T/TRIAL/control table不在またはproduction-safe expected state
- orphan zero
- RLS/privilege/FK intact
- provider sent delta zero
- public booking read smoke PASS
- unexpected 5xx zero

### Wave R4 — aliasless Production candidates

PR-5とR3がPASS後、最新pushed sourceから新しいaliasless candidatesをbuildする。
既存candidateをblind promoteせず、environmentとsourceがexactなら再利用してよい。

Website candidate:

- exact Production Supabase ref
- Trial mode / staging lineage protectionをProduction設定へ
- provider delivery全OFF
- customer/admin mutation flagsは最初read-only
- permanent Production secrets
- public booking read pathと既存public site regression

VIP candidate:

- exact Production Website origin
- `GHOST_VIP_TRIAL_MODE=false`
- staging originなし
- temporary protection bypassなし
- permanent Basic/PIN
- fail-closed auth
- List/Floor/Chart read-only smoke

candidate hostでdesktop、WebKit/iPad landscape emulation、320/375 mobileを確認する。
実機iPadが接続・利用可能なら10分以内の固定checklistを実行する。実機が外部にしか
なく利用できない場合は延々待たず、WebKit emulation evidenceを完成させ、
実機witnessだけを一件のnamed handoffにする。これを理由に完了済みUIを作り直さない。

各candidateについてpromotion前にrollback先deployment ID、rollback command、
post-rollback smokeをmanifestへ固定する。

### Wave R5 — Website → VIP promotion

executorがmanifestをreviewし、条件一致なら再承認を求めず実行する。

順序:

1. Website Production candidateをpromote
2. public booking/read-only smoke
3. error/provider logs
4. VIP Production candidateを`ghost-vipapp.vercel.app`へpromote
5. Basic/PIN、List/Floor/Chart、logoutのread-only smoke
6. error/provider logs

Vercelの現行公式`promote`/`rollback`手順を実行時に再確認する。promotion後は
fixed aliasがexact deploymentへ向いたことを`inspect`で独立確認する。

rollback trigger:

- auth bypassまたはauth loop
- wrong Supabase/Website origin
- public booking regression
- unexpected 5xx
- official tablesが8以外
- RLS/permission regression
- provider delivery
- customer-visible stale/maintenance state

trigger時は先にrollbackし、復旧smoke後に原因追跡する。rollbackの承認を求めない。

### Wave R6 — mutation canary / customer-ready

provider deliveryをOFFのまま、最小flagから一Waveずつ有効化する。各Waveは
一つのsynthetic future reservationだけを対象にし、cleanup可能なIDを先に記録する。

推奨順:

1. admin read + session/auth
2. v2 reservation write
3. six commands
4. Walk-in / Waitlist / block
5. staff assignment
6. customer attributes/profile/relink
7. realtime/gap recovery/observability

各Waveで:

- preflight exact deployment/ref/flags/provider OFF
- one synthetic mutation
- UI readback
- audit/revision/version/idempotency
- expected conflict `409`
- cleanup
- orphan/control/provider/5xx zero

一つでもfailしたらそのWaveのflagだけOFFへ戻し、前Waveまでのsafe stateを維持する。
既存予約や実顧客をcanaryに使わない。notification outboxは作成抑止または
delivery-disabledを二重確認し、sent delta zeroをDBとlogsの両方で証明する。

全Wave PASS後、通常運用に必要なflagだけをfinal stateへし、不要なdebug/trial flagは
OFFのままにする。

### Wave R7 — credential / temporary asset cleanup / handoff

- Trial Basic/PINをrevoke
- temporary bypass tokenをrevoke
- staging-only origin/envをProductionから削除
- temporary session/fixture/control rows zero
- repo外temporary filesをsecure delete
- permanent Basic/PINをsecret managerまたはOwner指定の安全経路へhandoff
- rollback deploymentとDB backup retentionを記録
- fixed URLがfinal candidate、Trial banner/maintenance copyなし
- redacted evidenceとshared AI docsを更新

secret値、customer PII、database dumpをGitへcommitしない。

---

## 6. customer-ready Definition of Done

次がすべて満たされた時だけ`COMPLETE`とする。

1. `https://ghost-vipapp.vercel.app`がfinal Production VIP deployment
2. Website/VIPともProduction origin/refがexact
3. `GHOST_VIP_TRIAL_MODE=false`
4. active/UI tableがofficial `VIP-1`〜`VIP-8` exact
5. Trial original/RC lineage、controls、orphans、sessionsがzero
6. inactive historical rowsと2+2 refsが保全されUI非表示
7. exact 25 Production migrationsがchecksum一致で適用
8. encrypted Production logical backupのisolated restore PASS
9. public booking/read-only regression PASS
10. List/Floor/Chart、queue、Inspector、create/edit、six commands PASS
11. Walk-in/Waitlist/block/staff/customer/realtime/SLO PASS
12. permanent Basic/PIN、fail-closed auth、logout PASS
13. unexpected console error/5xx zero
14. sent provider DB/log delta zero
15. rollback先、rollback手順、復旧smokeが証跡化
16. Trial/bypass/temp credentialsとfilesがrevoke/削除
17. final full CI、contract、lint、typecheck、build PASS
18. redacted evidence、`AI_CURRENT_STATUS.md`、`AI_WORK_LOG.md`更新

実機iPadだけが外部都合で不可能な場合は、1〜18の他項目を全て完了し、
WebKit/iPad emulationをPASSさせ、次の固定10分checklist一件だけをhandoffする。
同じ依頼を複数回出さず、それ以外を`COMPLETE_EXCEPT_PHYSICAL_WITNESS`とする。

---

## 7. fail-closed停止条件

次ではstate changeを止める。ただしOwnerへ承認を聞き直さない。

- project/ref/domain/deploymentのidentity不一致
- exact migration checksum drift
- Production snapshotのrestore不成立
- rollback先またはrollback権限なし
- provider delivery delta
- orphan/FK/RLS/official-eight不変条件の破れ
- secret/PII漏えい
- customer-visible 5xx/auth failure/public booking regression

停止時の動作:

1. mutation flag OFFまたはknown-good deploymentへrollback
2. read-onlyで復旧確認
3. failure class、first bad phase、exact deltaを記録
4. targeted reproducer
5. in-scope最小修正
6. affected validation
7. preflightを再freeze
8. executor判断で続行

同じcommandを祈るように繰り返してはならない。

---

## 8. 最終報告形式

途中経過は60秒以内ごとに短く共有するが、最終報告は次だけを明確に出す。

```text
Outcome: COMPLETE | COMPLETE_EXCEPT_PHYSICAL_WITNESS | ROLLED_BACK_SAFE_HOLD

Final URLs / deployments:
Website:
VIP:

Source:
Website commit/tree:
VIP commit/tree:

Database:
Production ref:
Migration head:
Exact allowlist:
Backup artifact SHA (secret-free):
Restore:
Official / inactive / orphan / provider counts:

Validation:
PR-5:
Public booking:
VIP read:
Mutation canary:
CI:
Logs:

Credentials / temporary assets:
Permanent handoff:
Trial revoked:
Bypass revoked:
Temp files:

Rollback:
Website:
VIP:
DB recovery:

Remaining:
none
```

`ROLLED_BACK_SAFE_HOLD`は失敗ではなく、顧客影響を回避してsafe stateへ戻した場合の
唯一の未完了表現である。その場合も「承認待ち」とは書かず、技術的に不足する
外部resourceまたは未解決failure classを一件だけ具体的に書く。

---

## 9. 実行開始

説明だけで終わらず、R0から開始する。完了済みbaselineを再実装しない。
長いfull lifecycleを先に再実行しない。まず
`customer_profile.upserted` contract gapをtargetedに収束させ、その後exact一回の
PR-5、Production backup/restore、exact 25 migration、candidate、promotion、
mutation canary、cleanup、handoffまで一気通貫する。
