# TableCheck VIP Floor Gate C→E Sparkサブエージェント完全委譲マスタープロンプト

作成日: 2026-07-24 JST
対象: `/home/kokoro/projects/clients/ghost`
実行モデル: `gpt-5.3-codex-spark` のCLIサブエージェントのみ
現在地: Gate 0/A/B PASS、Gate C HOLD、Gate D/E未PASS

以下の「実行プロンプト」全体を、将来の親Codexセッションへそのまま渡すこと。

---

## 実行プロンプト

あなたは GHOST Osaka の TableCheck互換 VIP Floor 実装を Gate C、Gate D、Gate E の順に通過させる「親オーケストレーター」である。

目標は、実行時点の証拠に基づいて Gate Cを `SIGNED_GATE_C_PASS`、Gate Dを `SIGNED_GATE_D_PASS`、Gate Eを `SIGNED_GATE_E_PASS` へ到達させること。ただし、承認、証拠、レビュー、検証のいずれかが不足した場合はPASSを推測せず、明確なHOLD/BLOCKEDと次に必要な入力を残して停止すること。

### 絶対条件

1. 調査、設計、実装、統合、レビュー、テスト、ブラウザ検証、外部資料確認、証拠生成、状態文書更新は、すべて新規の `gpt-5.3-codex-spark` CLIサブエージェントへ委譲する。
2. 親が行ってよいのは、タスク分解、依存関係管理、CLI子プロセス起動、待機、同時実行数管理、モデル証明と返却パケットの機械的検査、停止判断、最終報告だけである。
3. 人間のOwner、Floor Manager、Engineerにしか行えない採択、署名、直接証言は委譲対象ではない。サブエージェントが代筆、推測、自己署名してはならない。
4. 子は例外なく直接CLIで `--model gpt-5.3-codex-spark` を指定する。ネイティブのsubagent spawnでSparkを選べない場合、別モデルへフォールバックしてはならない。
5. 同時稼働は最大3子。書込み子は原則1つの共有作業ツリーにつき1体。書込み集合が交差する子を同時起動しない。
6. Production deploy、Production alias変更、Preview deploy、live Stripe、実顧客データ、実顧客通知、LINE送信、外部endpoint作成・削除・置換、secret rotation、Gate F〜Hは対象外。
7. このプロンプト自体をGate CまたはGate D/Eの実行承認として扱わない。
8. 実行時点のdirty worktreeをユーザー資産として保持し、無関係な差分を編集、削除、reset、checkout、stash、commit、deployしない。
9. 秘密鍵、restricted key、webhook secret、private URL、raw contact、顧客PII、provider内部IDを、プロンプト、標準出力、git diff、公開証拠、AIログへ出さない。
10. 正常終了は `SIGNED_GATE_E_PASS` のみ。途中終了では必ず `HOLD_*` または `BLOCKED_*` と `NEXT_REQUIRED_INPUT` を返す。
11. `website/CLAUDE.md`、過去prompt、shell historyなどに別model、model継承、`--full-auto` の例があっても、この実行には流用しない。本promptのSpark CLI templateだけを使い、差分のある起動commandは拒否する。
12. 2026-07-24時点ではGate Cのexact in-session authorityも、Gate C terminalにbindingしたGate D/E authorityも未提示である。したがって、最初の実行は調査後にAuthority A待ちでHOLDするのが正常であり、承認やfixture-only UI integrationの未完了をPASSへ読み替えない。

## 1. Spark CLI実行契約

### 1.1 疎通確認

最初に親が次の形式でSpark疎通専用子を1体起動する。応答とCLIヘッダーをprivateな一時ディレクトリへ保存する。

```bash
COMMAND_TEMPLATE_VERSION="ghost.spark.cli.v1"
RUN_ROOT="$(mktemp -d /tmp/ghost-vip-floor-spark.XXXXXX)"
chmod 700 "$RUN_ROOT"

codex exec \
  --ephemeral \
  --ignore-user-config \
  -C /home/kokoro/projects/clients/ghost \
  --model gpt-5.3-codex-spark \
  -c 'model_reasoning_effort="medium"' \
  -c 'model_reasoning_summary="none"' \
  --sandbox read-only \
  --output-last-message "$RUN_ROOT/preflight.last.txt" \
  - <<'SPARK_PREFLIGHT' >"$RUN_ROOT/preflight.stdout.log" 2>"$RUN_ROOT/preflight.stderr.log"
Reply exactly:
CODEX53SPARK_ECHO_OK
SPARK_PREFLIGHT
```

次の全条件が揃わなければ `HOLD_SPARK_CONNECTIVITY_OR_MODEL_PROOF` で停止する。

- process exit codeが0。
- 非JSONpreflightのstderr CLIヘッダーにあるmodelがexactly `gpt-5.3-codex-spark`。
- final responseがexactly `CODEX53SPARK_ECHO_OK`。
- providerが期待するOpenAI接続である。
- priority service tierを要求していない。

### 1.2 全子共通コマンド

```bash
EXEC_ROOT="<packetで承認されたabsolute workspace/worktree path>"
test "$(realpath "$EXEC_ROOT")" = "$EXEC_ROOT"
PACKET_ID="<packet-id>"
PACKET_SHA256="<packet-sha256>"
SANDBOX_MODE="<read-only-or-workspace-write>"
PREFLIGHT_TOKEN="CODEX53SPARK_ECHO_OK $PACKET_ID $PACKET_SHA256"

codex exec \
  --ephemeral \
  --ignore-user-config \
  -C "$EXEC_ROOT" \
  --model gpt-5.3-codex-spark \
  -c 'model_reasoning_effort="medium"' \
  -c 'model_reasoning_summary="none"' \
  --sandbox "$SANDBOX_MODE" \
  --output-last-message "$RUN_ROOT/$PACKET_ID.preflight.last.txt" \
  - >"$RUN_ROOT/$PACKET_ID.preflight.stdout.log" \
  2>"$RUN_ROOT/$PACKET_ID.preflight.stderr.log" <<SPARK_CHILD_PREFLIGHT
Reply exactly:
$PREFLIGHT_TOKEN
SPARK_CHILD_PREFLIGHT

codex exec \
  --ephemeral \
  --ignore-user-config \
  -C "$EXEC_ROOT" \
  --model gpt-5.3-codex-spark \
  -c 'model_reasoning_effort="medium"' \
  -c 'model_reasoning_summary="none"' \
  --sandbox "$SANDBOX_MODE" \
  --json \
  --output-last-message "$RUN_ROOT/$PACKET_ID.last.txt" \
  - <"$RUN_ROOT/$PACKET_ID.prompt.md" \
  >"$RUN_ROOT/$PACKET_ID.events.jsonl" \
  2>"$RUN_ROOT/$PACKET_ID.stderr.log"
```

書込み子には明示的な作業ディレクトリを指定する。親が一時packetを作ることはオーケストレーション作業として許可するが、プロジェクトファイルの調査、編集、検証を親自身が行ってはならない。

`EXEC_ROOT` はpacketのworkspaceと完全一致し、`realpath` 後も同じabsolute pathでなければならない。許可値はGHOST root、nested `website/`、またはAuthority Bにbindingした専用worktreeだけ。子は開始直後に `pwd -P`、git top-level、branch、HEADを返し、1つでもpacketと異なれば書込み前に停止する。ambient CWD、別repo、別worktreeでの実行結果は無効。

上記2つの `-c` keyは、疎通済みCLIヘッダーでreasoning effort `medium`、reasoning summaries `none` と観測できる場合だけ使用する。未知key、parse error、異なる観測値、暗黙model fallbackがあればtemplateを変更して継続せず `HOLD_SPARK_CLI_CONFIG_MISMATCH`。

global preflightだけでは個々の子のmodel証明にしない。各子の作業run直前に、同じ `EXEC_ROOT`、model、reasoning config、sandbox modeを使う非JSONpaired preflightを実行し、stderr CLIヘッダー、session ID、packet IDとpacket SHA-256を含む一意なecho token、exit codeをprivate run rootへ保存する。paired preflight PASS後にだけ上記JSON作業runを開始する。paired preflightと作業runのargv差分は、`--json`、prompt/output path、echo token以外を許可しない。

### 1.3 子のモデル証明

各子の返却は次を満たすこと。

- CLI invocation manifestにexact model名がある。
- 各子に対応する非JSONpaired preflight stderrのCLIヘッダーにexact model名がある。
- 子の最終JSONにも `requestedModel` と `observedModel` がある。
- exit code、session ID、開始・終了時刻、sandbox mode、worktree、packet SHA-256がある。
- `resolvedPwd`、git top-level、invocation command、command template version、run root、packet manifest SHA-256がある。
- 自己申告だけをモデル証明として受理しない。
- 1項目でも欠ければ、その子の成果物、commit、レビュー、テスト結果を無効とする。

### 1.4 リトライ

- timeout、429、一過性ネットワーク断、CLI file lockのみ、同一packetを最大1回再試行できる。
- assertion failure、設計違反、権限不一致、hash不一致、security finding、テスト失敗、write-set逸脱は再試行ではなく修正packetを新規発行する。
- 同じ失敗を無変更で3回繰り返さない。3回目に相当する時点でBLOCKEDにする。

## 2. 子packetと返却証拠

全packetに次を含める。

```json
{
  "schemaVersion": "ghost.spark.packet.v1",
  "packetId": "C-RESEARCH-01",
  "gate": "C",
  "wave": "C0",
  "role": "research|implementation|integration|independent-review|validation|evidence|documentation",
  "objective": "一つの検証可能な目的",
  "requestedModel": "gpt-5.3-codex-spark",
  "workspace": "/absolute/path",
  "baseCommit": "<exact SHA or null with dirty-lineage reason>",
  "dependencies": [],
  "requiredReads": [],
  "allowedWrites": [],
  "forbiddenWrites": [],
  "forbiddenActions": [],
  "acceptanceCriteria": [],
  "requiredCommands": [],
  "expectedArtifacts": [],
  "evidenceOutput": "<private or repository evidence path>",
  "maxAttempts": 2
}
```

子は最後に次の単一JSONを返す。

```json
{
  "schemaVersion": "ghost.spark.result.v1",
  "packetId": "C-RESEARCH-01",
  "status": "PASS|FAIL|BLOCKED",
  "requestedModel": "gpt-5.3-codex-spark",
  "observedModel": "gpt-5.3-codex-spark",
  "sessionId": "<id>",
  "preflightSessionId": "<paired preflight id>",
  "preflightHeaderSha256": "<sha256>",
  "preflightEchoToken": "CODEX53SPARK_ECHO_OK <packetId> <packetSha256>",
  "worktree": "<absolute path>",
  "packetSha256": "<sha256>",
  "baseCommit": "<sha>",
  "headCommit": "<sha>",
  "resolvedPwd": "<pwd -P>",
  "gitTopLevel": "<absolute path>",
  "commandTemplateVersion": "ghost.spark.cli.v1",
  "invocationCommand": "<secret-free exact argv>",
  "invokedFromRunRoot": "<mode-0700 run root>",
  "packetManifestSha256": "<sha256>",
  "filesRead": [],
  "filesChanged": [],
  "commands": [
    {
      "command": "<redacted command>",
      "exitCode": 0,
      "result": "PASS"
    }
  ],
  "findings": [],
  "artifacts": [
    {
      "path": "<path>",
      "sha256": "<sha256>",
      "visibility": "private|public"
    }
  ],
  "secretsOrPiiDetected": false,
  "forbiddenWriteDetected": false,
  "nextRequiredInput": null
}
```

返却JSONと実ファイル、git diff、exit codeが矛盾した場合はFAIL。実装子が自分の変更を最終承認してはならない。

## 3. 起動直後の調査wave

親は最大3体のread-only Sparkを起動する。

### R1: 状態・権限・dirty lineage監査

必読:

- `/home/kokoro/projects/clients/ghost/AGENTS.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_WORK_LOG.md` の最新行
- `/home/kokoro/projects/clients/ghost/docs/AI_AGENT_SYNC.md`
- `/home/kokoro/projects/clients/ghost/website/AGENTS.md`
- root repoとnested `website/` repoのstatus、branch、HEAD、worktree一覧

成果:

- Gate 0〜Eの実行時点status。
- 既存dirty差分の所有権manifest。
- Gate C lineageを保つべき実作業ツリー。
- UI-first worktreeの存在、branch、HEAD、dirty状態。
- 親が上書きしてはいけないpath一覧。

### R2: Gate C V18監査

必読:

- `website/docs/research/tablecheck-vip-floor-gate-c-v18-one-shot-pass-execution-prompt-2026-07-23.md`
- `website/docs/research/tablecheck-vip-floor-gate-c-v18-three-finding-pass-strategy-2026-07-23.md`
- `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v18-gate-c-pass-authorization-proposal-v1-20260723.json`
- `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v18-gate-c-pass-owner-authorization-v1-20260723T020223+0900.json`
- `website/docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v18-three-finding-owner-directive-v1-20260723T014846+0900.json`
- V18 scripts、V18 evidence、V17 immutable checkpoint/review/manifest。

成果:

- 最新Gate C status。
- 全immutable SHA-256の実ファイル再計算結果。
- 残る3 finding。
- 現行V18 review rejectの理由。
- 実行可能な最小修正・review・runtime順序。
- network/provider/runtime前に必要なauthority。

### R3: Gate D/E・UI-first・現行Next.js監査

必読:

- `/home/kokoro/projects/.Codex/docs/DESIGN.md`
- `website/docs/ui/UI_TOOLKIT.md`
- `website/docs/research/tablecheck-vip-floor-end-to-end-implementation-plan-2026-07-14.md`
- `website/src/lib/vipFloorV2Contract.ts`
- `website/src/lib/server/vipFloorV2.ts`
- `website/src/lib/server/vipFloorV2Commands.ts`
- `website/src/app/api/admin/v2/**`
- `website/supabase/migrations/20260714*.sql`
- `website/package.json`
- `.worktrees/vip-floor-ui-first-v1/docs/evidence/vip-floor-ui-first/**`
- `.worktrees/vip-floor-ui-first-v1/src/components/admin/vip-floor-v2/**`
- `.worktrees/vip-floor-ui-first-v1` のcommit履歴。

Next.jsはネット情報より先に、インストール済みバージョンの次を読む。

- `website/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `website/node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `website/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `website/node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `website/node_modules/next/dist/docs/01-app/02-guides/forms.md`
- `website/node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- `website/node_modules/next/dist/docs/01-app/02-guides/production-checklist.md`
- `website/node_modules/next/dist/docs/03-architecture/accessibility.md`

成果:

- D/Eの実装済み、fixtureのみ、未実装の厳密なinventory。
- UI-firstから選択統合するpath/commitと除外path。
- D/Eの依存DAG、write-set、migration/API/UI/test計画。
- 現在のNext.jsバージョンに沿うserver/client/auth/cache/lazy-loading設計。

3体の結果が一致しない箇所は、4体目を同時起動せず、最初のwave終了後にfresh Spark adjudicatorへ限定再調査させる。

## 4. Authority checkpoint A: Gate C V18

### 4.1 immutable lineage

実行時に必ず実ファイルから再計算する。現時点の期待値は次。

- V17 proposal: `2eb7c5516334ba8c5ded669bf58e6fe2678a60c8f790ad222c87dc023bc06da0`
- V17 Owner authorization: `43cfba9a6658e14b17338a3e8ee54d1a3002f7cb7e703220fc1340e0c8fb1415`
- V17 final audit: `74826dea45a8aa959acb5965b5047c52eaae8f5bc22992f9b2da495fcf8296dd`
- V17 tooling manifest: `359789d9bccb9ad956c890a91899f56396e70ab0679838102e4ac95b70a16894`
- V17 bundle build 2: `302acb01bd0945b364024dbee282e1e88008afc926f356b63714a80132c51031`
- V17 review aggregate: `b113a5a2df209ac1fd9113dcae71bc8840ec02fe067f69e379226b288047fa88`
- V17 recoverable checkpoint: `d9a21c9c92a1a73da7363ef3e09f72d21073f43cd244176eea3af50baf667b61`

期待値と実ファイルのhashが異なる場合は `HOLD_GATE_C_LINEAGE_MISMATCH`。

### 4.2 exact V18 authority

Gate Cのprovider、custom staging、DB mutation、runtime開始前に、人間のOwnerから次の2行をこの順、余分な文字なしで受け取る。

```text
OWNER_VIP_FLOOR_V18_GATE_C_ONE_SHOT_EXECUTION_AUTHORIZATION_V1
2947616d3960dd51571f75b6bb49cfba60de3edf3393e48bb04fdd47370da400
```

この会話、既存JSON、過去ログ、似た表現、このマスタープロンプトから承認を推測しない。2行がこの実行セッションで直接提示されるまでは、read-only監査と承認proposalの提示までに留め、`HOLD_GATE_C_AWAITING_EXACT_OWNER_AUTHORITY` で停止する。

### 4.3 修正対象はexactly 3 finding

1. `full_child_process_fixture_does_not_execute_the_production_v17_startup_path_before_asserting_rollback_resume`
2. `same_value_environment_upsert_receipt_accepts_an_empty_provider_receipt_identity`
3. `joined_real_delivery_proof_accepts_arbitrary_nonempty_database_hash_text_without_sha256_shape_validation`

Gate Cではこの3件以外へscopeを拡大しない。

## 5. Gate C 実行wave

V18の元promptを上位仕様とし、矛盾時は元promptでfail-closedにする。

### C0: preflight・freeze

read-only Spark 3体で独立確認する。

- lineage/provenance。
- authority/counter/forbidden-action baseline。
- runtime/security/Stripe boundary。

Gate Cは現在のdirty lineageに未commit資産を含む可能性がある。clean HEADから新worktreeを作って欠落させてはならない。R1が指定したcurrent Gate C作業ツリーをfreezeし、path/hash/status manifestを作る。共有ツリーの書込みは常に1体。

### C1: additive tooling修正

書込みSparkを1体ずつ順番に起動する。

- C1-A: full child process fixtureが、本物のV17 production startup pathを起動した後にrollback/resumeをassertするよう修正。
- C1-B: same-value environment upsert receiptで、provider receipt identityのexact一致とnon-emptyを必須化。
- C1-C: joined real-delivery proofのDB `raw_body_hash` と `received_signature_header_hash` をlowercase 64-hex SHA-256 shapeで検証。

制約:

- additive toolingだけを変更。
- app source、P0 migrations、`package-lock.json`、frozen V17 artifact、V17 evidenceは変更不可。
- 各修正後にfresh Spark validatorを起動し、対象fixtureとadversarial negative caseを実行。
- 実装子とvalidatorは別session。
- validatorのFAILを実装子の説明で上書きしない。

### C2: fresh audit・manifest・3/3 review

順序を固定する。

1. authority verifier。
2. V18 runtime bundle build。
3. production-startup fixture。
4. webhook-binding fixture。
5. adversarial audit。
6. tooling manifest freeze。
7. frozen manifestを対象に、fresh read-only Sparkを最大3並列で起動:
   - provenance reviewer。
   - runtime reviewer。
   - security reviewer。
8. 3体全てが同一manifest SHAをexactly ACCEPT。
9. review aggregateを別のSpark evidence agentが生成。

古いreview、別manifest、自己review、2/3 ACCEPTは無効。

### C3: custom-staging runtime

実行権限2行、C2の3/3 ACCEPT、ceiling余白、restricted test key、安全なcustom stagingが全て揃った場合だけ、専用Spark runtime operatorを1体起動する。

必須境界:

- Stripeはrestricted `rk_test_` のみ。
- Stripe API versionは `2026-04-22.dahlia`。
- Stripe sandboxとcustom stagingだけ。
- live/Production/Preview/LINE/実顧客mutationは0。
- endpoint create/delete/replacementは0。
- signing-secret rotationは0。
- catalog refresh/replace/synthetic fallbackは0。
- DB triggerからStripeを呼ばない。
- refund RPCはcase作成まで。Stripe refund実行は既存worker境界を守る。
- raw webhook bodyでsignature verificationする。
- secretをrepo、stdout、evidenceへ出さない。
- Checkout Sessions、Payment Element、SetupIntentsの既存方式を勝手に変更しない。

runtime条件:

- exactly 2 synthetic cycles。
- comparison count `>= 1000`。
- success rate `>= 0.999`。
- mandatory rollback。
- rollback completion `<= 600000ms`。
- v1 fallbackとresumeを実証。
- carried lifetime ceilingsを超えない。

### C4: post-evidence・署名・terminal

runtime後に別Spark evidence agentがdirect readback、normal audit、`--require-pass` auditを実行する。次に人間のOwner、Floor Manager、Engineerから、exact final manifestへbindingした実証後のdirect attestationを集める。3名のattestationはV18仕様どおりstrong-MFA-boundでなければならない。子が署名、MFA確認、本人確認を代行・推測しない。

次の全条件が揃った時だけ、fresh Spark terminalizerがatomicに1つの `SIGNED_GATE_C_PASS` を生成する。

- exact authority。
- 3 finding全解消。
- fresh audit PASS。
- 同一manifestへのprovenance/runtime/security 3/3 ACCEPT。
- custom-staging runtime thresholds PASS。
- rollback PASS。
- exact final manifestへbindingしたpost-evidence direct strong-MFA-bound attestations。
- normal audit exit 0。
- `--require-pass` audit exit 0。
- forbidden mutation、secret、PII leakが0。

Gate C PASSだけではGate D/Eを開始しない。

## 6. Authority checkpoint B: Gate D/E

`SIGNED_GATE_C_PASS` 後、read-only Spark research 3体とfresh Spark proposal builderで、新しいD/E integration authority proposalを作る。

このproposalと2行authorityは現時点では存在しない。Gate Cの未知の将来terminal SHAを使うため、Gate C PASS前に作成、採択、推測してはならない。既存UI-first terminalは `UI_FIRST_IMPLEMENTATION_COMPLETE_AWAITING_GATE_C_INTEGRATION` であり、D/E authorityでもreal integration完了証明でもない。

proposalは少なくとも次にbindingする。

- actual `SIGNED_GATE_C_PASS` terminal fileとSHA-256。
- Gate C final evidence rootとmanifest SHA。
- 実行時点のmain/base commit。
- UI-first original manifest。
- UI-first light redesign commit `06d580e`。
- VIP map clarity commit `1c7a26f`。
- preview fixture guard commit `1654798d`。
- 上記後のselective-integration source manifest。
- D/Eのexact allowed paths、migrations、flags、staging環境。
- Production deploy/cutoverを含まないこと。
- Gate F〜Hを含まないこと。

UI-firstの既存 `11-final-file-manifest.json` はlight redesign/map clarity/preview guardより前である可能性があるため、そのまま最終integration manifestとみなさない。最新3commitを含む新manifestをfreezeし、SHA-256をproposalへ含める。

proposal builderがrole codeを次で固定し、proposalファイルのSHA-256を算出する。

```text
OWNER_VIP_FLOOR_POST_GATE_C_GATE_D_E_INTEGRATION_AUTHORIZATION_V1
```

その後、親は次の2行を人間Ownerへ要求して停止する。

```text
OWNER_VIP_FLOOR_POST_GATE_C_GATE_D_E_INTEGRATION_AUTHORIZATION_V1
<newly_frozen_proposal_sha256>
```

2行の完全一致がこの実行セッションで直接提示されるまで、D/Eのmigration、実装、統合、route切替、staging mutationを開始しない。未知の将来hashを事前承認したと解釈しない。

## 7. Gate D 実装wave

### 7.1 現在の土台

調査子は最低限、次が現行mainに存在するか再確認する。

- `website/src/lib/vipFloorV2Contract.ts`
- `website/src/lib/server/vipFloorV2.ts`
- `website/src/lib/server/vipFloorV2Commands.ts`
- `website/src/app/api/admin/v2/vip-floor/route.ts`
- reservation assignments/schedule/status/cancel/notes/check-in/extend routes。
- VIP block、customer、walk-in routes。
- P0 additive schema、RLS、RPC、dual-write、reconciliation migrations。

UI-first worktreeにはfixture-drivenなworkspace、floor、timeline、list、exception rail、inspector、command center、21 scenarios、10 command kindsがあるが、real API/auth/DB/provider integrationが完了したとは扱わない。

### 7.2 selective integration

専用Spark integratorだけが統合を行う。

- UI-first branchを丸ごとmerge/cherry-pickしない。
- `src/components/admin/vip-floor-v2/**`、必要なroute loading/error/page、検証資産をpath単位で抽出。
- UI-first branchに混在するpublic media/dev/ticket系script変更を取り込まない。
- fixture gatewayはtest/dev fixture限定に残し、production pathをauthenticated real adapterへ置換。
- source contractとfixture contractの差異を明文化してから変換。
- 統合前後で無関係なdirty差分が1byteも変わっていないことをhashで確認。
- このselective extractionとreal adapter置換が完了するまではGate DをPASS、integration済み、production-readyと表現しない。

### D0: contract/foundation freeze

最大3体のread-only Sparkで別々に調査し、1体のproposal/contract Sparkがfreezeする。

- `VipFloorBoardV2` TypeScript contract。
- URL query contract。
- command/error/capability contract。
- selection model。
- business date、Asia/Tokyo、overnight rollover。
- status、revision、idempotency、conflict contract。
- admin visual tokens、spacing、row height、z-index、focus style。
- component directory、CSS ownership、public exports。
- route gate、read flag、mutation flag、v1 fallback。

Gate D/E用のintegration worktreeは、Gate C terminalにbindingしたbase commitから専用Spark isolation agentに作らせる。各workerは独立worktree、明示write-set、commit SHAを返す。共有fileは実装workerに重複配布せず、integratorだけが編集する。

### D1: shell/state/shared primitives

同時最大3体、write-setは交差させない。

Worker D1-A shell:

- top operation bar、left nav、date navigator、view switcher。
- service context、online state、service period summary。
- responsive shell、skip link、loading/error/permission/stale states。

Worker D1-B state/API:

- authenticated board fetch。
- URL sync。
- revision reconciliation。
- stale/409 conflict recovery。
- command dispatcher。
- `Idempotency-Key`。
- pending/retry/error model。

Worker D1-C shared:

- status badge、time/pax/table cells。
- filter/search。
- dialog/sheet。
- toastとlive region。
- pointer/touch/keyboard contract。

統合条件:

- Server ComponentとRoute Handlerの両境界でauth/roleを検証。
- 変化の速いboard fetchは認証済みserver pathで`no-store`相当。
- `router.refresh()`だけをserver cache invalidationと誤認しない。
- secret、manager-only PIIをClient Componentへserializeしない。
- 重いfloor/timeline/list Client Componentは必要に応じて`next/dynamic`で分割。
- loading UIは即時表示、interruptible。

D1 acceptance:

- read-only flagで動作し、mutation flag off。
- v1 route fallbackが即時。
- 1440/1024/768/390でshell破綻なし。
- keyboardだけでdate/view/searchへ到達。
- focus、live region、loading/error/stale/permissionが検証済み。

### D2: floor/chart/list read-only

3体を並列起動できる。

Worker D2-A floor:

- 66/34 `±2pt` split。
- right rail minimum 360〜380px。
- section tabs、zoom、実会場floor geometry。
- table state、最大3回転、flags/memo/restriction。
- reservation/waitlist/finished/block/staff rail。
- selection、multi-table preview。

Worker D2-B chart/timeline:

- table×time virtual grid。
- current-time line。
- reservation/block bars。
- unassigned/cancel/no-show tray。
- overnight、extension、auto-scroll、reduced-motion。

Worker D2-C list:

- stable columns。
- search/sort/filter。
- memo indicator。
- bulk selection。
- detail deep link。
- page全体のoverflowは0。table内部の意図的horizontal scrollだけ許可。

D2 acceptance:

- 3 viewが同じfixtureおよびsanitized staging board、同じselection、同じrevisionを表示。
- multiple rotations、unassigned、block、overnight、extensionが全viewで一致。
- core visual parity matrix 100%。
- mutation flagはoff。

### D3: real commands/detail/form

Worker D3-A assignment/schedule:

- replace/add/remove/unassign。
- schedule move。
- duration resize。
- drag preview、collision warning、drop commit。
- dragと同じRPCを呼ぶbutton/keyboard代替。
- pointer/touch/keyboard sensor、auto-scroll、live announcement。
- success後server reconcile、409 reload、permission/flag error。

Worker D3-B detail/form:

- customer/reservation 2-pane。
- reservation/payment/images/audit tabs。POS integration実装はしない。
- masked default。
- manager-only PIIは再認証とaudit付き。
- date/time/duration/pax/status/source/purpose/tables/flags/note/orders。
- field validation、dirty state、cancel confirmation。
- conflict差分とreload。

Worker D3-C lifecycle/service:

- create、walk-in、check-in、extend、no-show、complete。
- cancel/refund/notify decision。新しいlive provider side effectは実行しない。
- service status、override reason、single block editor。
- destructive confirmation、audit metadata。

Gate D final acceptance:

- core TableCheck operator scenariosがE2E PASS。
- mutation後にfloor/chart/list/detailが同じboard revisionへ収束。
- drag、button、keyboard代替が同じRPC commandを発行。
- mutation flag offなら完全read-only。
- v1/v2切替とrollbackが即時。
- customer/Stripe leak 0。
- browser、a11y、visual、security、API、DB、buildのfresh independent reviewが全てPASS。

条件成立時のみfresh Spark terminalizerが `SIGNED_GATE_D_PASS` を生成する。

## 8. Gate E data-first実装wave

### 8.1 scope

Gate Eは次だけを対象にする。

- on-premises Door Waitlist。
- recurring/single block operations。
- staff operational profileとtable assignment。
- service period template/instance。
- section/service-period別online acceptance。
- 上記通知記録に必要なtransactional outbox。

次はGate E対象外。

- consumer向けキャンセル待ち登録。
- placement optimizer。
- export。
- POS integration。
- customer dossier拡張。
- attachment。
- live LINE/SMS送信。
- Gate F〜H。

上記対象外項目は実装だけでなくGate E handoff、acceptance、terminal evidence、将来作業の「ついで修正」からも除外する。

Door Waitlistは、来店時の待機列、estimated seating、呼出記録、accept、seat、expire/cancelを扱う。消費者が予約キャンセル枠を待つ cancellation waitlist と混同しない。

### E0: P1 contract・flags・migration plan freeze

3体のread-only Sparkを、domain、security、public availabilityに分け、fresh contract builderが統合する。

freeze対象:

- entity、enum、status transition、version、idempotency。
- business date、overnight、service-period boundary。
- waitlist priority、estimated seating、accept/expire/cancel/seat。
- block single/series edit、materialization relation。
- staff assignment interval、shift終了、section/table scope。
- online acceptance precedence。
- public availabilityとの整合。
- role/capability matrix。
- RLS、audit、retention、encryption、outbox。
- read/mutation/external-side-effect flags。

最低限のflags:

- `FEATURE_VIP_FLOOR_WAITLIST_ENABLED`
- `FEATURE_VIP_FLOOR_STAFF_ASSIGNMENT_ENABLED`
- `FEATURE_VIP_FLOOR_ONLINE_ACCEPTANCE_ENABLED`
- Gate E全体のread flag。
- domain別mutation flag。
- external notification side-effect flag。

全てdefault false。実際のexact names、所有者、fallbackをE0 contractとAuthority B proposalにfreezeする。

E0 canonical authority artifactに各flagのexact name、code owner、runtime owner、default、read/mutation/external-side-effect分類、依存flag、rollback値を1か所で定義する。このartifactがfreezeされる前にmigration/API/UIを開始しない。

### E1-A: additive schema/RLS

既存P0 migrationを編集せず、新規migrationだけを追加する。

対象entity:

- `service_period_templates`
- `service_period_instances`
- `waitlist_entries`
- `waitlist_contact_attempts`
- `waitlist_contact_profiles`
- `staff_operational_profiles`
- `staff_table_assignments`
- `online_acceptance_rules`
- `recurring_block_series`
- `integration_outbox`

全table:

- stable ID。
- version。
- created/updated timestamp。
- actor。
- audit relation。
- least-privilege RLS。
- service-role bypassを最小化。
- interval、status、foreign key、uniqueness、idempotency constraints。

contact:

- raw contactをoutbox/logへ置かない。
- encrypted contact reference。
- explicit channel consent。
- retention policy。
- provider delivery IDは公開証拠でredact。

staff:

- operational profileをadmin identity/role/PII capabilityから分離。
- table assignmentでmanager権限を暗黙に付与しない。

### E1-B: RPC/worker/outbox

別write-set:

- create/update/cancel waitlist。
- record notify/call attempt。
- accept/seat/expire waitlist。
- assign/change/remove staff table assignment。
- create/update service period。
- set online acceptance。
- create/update/cancel recurring block series。
- recurring blockのidempotent materialization。
- integration outbox enqueue/claim/complete/fail/retry。

原則:

- waitlist accept→seatは同一transaction内でreservation/table conflictとversionを再検査。
- 外部送信をreservation transaction内またはDB trigger内で実行しない。
- outboxはidempotency/deduplication key必須。
- failure/replayでreservation stateを破損せず二重送信しない。
- Gate Eではtest adapterによるdelivery結果だけを許可し、live LINE/SMSを呼ばない。

### E1-C: API/contracts/tests

必要最小のRoute Handler:

```text
/api/admin/v2/waitlist/**
/api/admin/v2/staff-assignments/**
/api/admin/v2/service-periods/**
/api/admin/v2/online-acceptance/**
/api/admin/v2/recurring-blocks/**
```

条件:

- Server/Route Handlerでsession、role、capabilityを毎回検証。
- request/response schema validation。
- idempotency、revision、409 conflict。
- masked read。
- no-store board refresh。
- permission、flag-off、not-found、invalid transitionを非色情報で返す。
- API errorにsecret、raw SQL、PIIを含めない。

### E2: Ops UI

最大3体。

Worker E2-A waitlist:

- waitlist rail。
- estimated seating。
- priority。
- contact attempt count。
- test delivery state。
- accept/expire/cancel/seat。
- conflict、delivery failure、retry、permission recovery。

Worker E2-B block/service:

- recurring block editor。
- one occurrence/this-and-future/series scope。
- service period template/instance。
- overnight boundary。
- online acceptance command panel。
- online stop時も既存holdを破棄せず、新規public holdだけ停止。
- admin manual operationはcontractに従い継続可能。

Worker E2-C staff:

- staff assignment。
- add/change/remove。
- table overlay。
- service period/shift filtering。
- shift終了後inactive。
- staff workload表示はGate Eに必要な最小集計だけ。

UI contract:

- GHOSTのadminはoperator-first、dense、scanable、exception-first。
- 現行UI-first evidenceに従い、白/off-white、neutral hairline、blueはprimary action/selection/focusだけ、semantic pale tintを使う。
- generic SaaS card pile、AI glass、purple/blue orb、blur-heavy surface、nested card、大radiusは禁止。
- 実会場floor geometryを主要assetとして維持。
- 重要操作はfirst viewport。
- 重要touch target `>=44px`。
- page-level horizontal overflow 0。
- 390pxで日本語/英語long labelが重ならない。
- visible focus、icon-only label、non-color status、live region、reduced motion。

Gate E final acceptance:

- floor/timeline/list/detailでwaitlist/block/staff/service periodが同じrevisionと状態。
- notify(test)→accept→seatがatomic conflict checkを通る。
- staff assignmentとblock intervalが正しい。
- online acceptanceがpublic availabilityへ反映。
- online stopで既存holdを破棄しない。
- recurring materializationを再実行しても重複0。
- external job failureでreservation破損0。
- replayでduplicate notification 0。
- raw contact leak 0。
- delivery failure、expiry、seat conflict、permission failureから回復可能。
- public availability regression 0。
- Production/Preview/live provider mutation 0。

条件成立時だけfresh Spark terminalizerが `SIGNED_GATE_E_PASS` を生成する。

## 9. 検証matrix

実装子と別sessionのSpark validator/reviewerが実行する。既存scriptは実行時の`package.json`で存在を確認する。

### 共通static/build

```bash
cd /home/kokoro/projects/clients/ghost/website
npx tsc --noEmit
npm run lint
npm run build
npm run check:db-schema
npm run test:reservation-saga
npm run test:vip-static
npm run test:stripe-unbound
```

### P0/Gate C regression

```bash
npm run verify:vip-floor-v2-schema
npm run test:vip-floor-v2-rpc
npm run test:vip-floor-v2-api
npm run test:vip-floor-v2-api-contract
npm run test:vip-floor-v2-dual-write
npm run test:vip-floor-v2-public-dual-write
npm run test:vip-floor-v2-dual-write-races
npm run test:vip-floor-v2-rollback
npm run test:vip-floor-v1-v2-compare
npm run audit:vip-floor-v2-gate-c
```

Gate Cのruntime固有commandはV18元promptとV18 scriptsのCLIをfresh Sparkが再発見し、引数を推測しない。正常auditとrequire-pass auditを両方実行する。

### D/Eで追加すべき検証

- additive migration static/schema/RLS test。
- RPC atomicity/idempotency/permission/race test。
- API contract/auth/flag/error/redaction test。
- cross-view revision convergence test。
- UI interaction/keyboard/touch test。
- visual regression。
- accessibility tree、focus order、live region、contrast。
- browser E2E。
- load/performance。
- secret/PII scan。
- public hold/availability non-regression。
- rollback/fallback rehearsal。

Gate D/E性能の最低acceptance:

- sanitized staging read p95 `<=800ms`。
- mutation p95 `<=1000ms`。
- pointer/drag/touchのvisual feedback `<=100ms`。
- measured INP p75 `<=200ms`。
- 数値、sample size、fixture scale、browser/device、測定環境をimmutable evidenceへ含める。

### critical E2E

1. public hold→card setup→signed webhook→floor表示。
2. assignment→floor/chart/list/detail収束。
3. table/time conflict→409→reload/retry。
4. duration extension collision。
5. walk-in→check-in→extend→complete。
6. waitlist add→test notify/call record→accept→seat。
7. block作成→public availability停止→解除後回復。
8. service period online stop→新規public hold停止→既存hold維持→admin manual継続。
9. staff assignment→floor overlay→shift終了でinactive。
10. mobileとkeyboardで同じcommand。
11. Owner/manager/staffのrole差。
12. 2 deviceの同時更新とconflict recovery。

### viewport/a11y

- 1440×900。
- 1024×768。
- 768×1024。
- 390×844。
- 必要に応じて320px narrow fallback。
- keyboard only。
- reduced motion。
- zoom 200%。
- icon-only accessible name。

### load fixture

- 80 tables。
- 500 chart bars。
- 1000 list rows。
- 100 waitlist entries。
- 30 active staff assignments。
- 500 audit events。

長いlist/chartはvirtualizationまたは`content-visibility`等を使い、不要なglobal listenerと再renderを避ける。INP目標は `<=200ms`。性能測定値と環境を証拠に残す。

## 10. 独立レビュー

各Gateの実装終了後、実装に参加していないfresh Sparkを最大3並列で起動する。

1. provenance/scope reviewer:
   - authority、lineage、manifest、write-set、dirty preservation、out-of-scope。
2. runtime/product reviewer:
   - state transition、revision、rollback、fallback、E2E、TableCheck operator flow。
3. security/privacy/accessibility reviewer:
   - auth/RLS、Stripe、PII、outbox、secret scan、a11y、mobile。

全reviewerは同一commit/manifest SHAを受け取る。review promptは実装子の自己評価を権威として含めない。3/3 ACCEPT以外はterminal PASS不可。

findingsはseverity、再現手順、affected path、required fix、blocking gateを持つ。修正後は新manifestへ3/3 reviewをやり直し、古いACCEPTを流用しない。

## 11. evidenceと状態更新

各Gateの証拠は、既存命名規約を調査したSpark evidence agentだけが書く。最低限:

- authority receipt。
- input/source manifest。
- dirty-preservation manifest。
- packet manifestとSpark model proofs。
- implementation commits。
- validation command matrix。
- browser/a11y/visual/performance/security結果。
- reviewer 3/3 aggregate。
- rollback/fallback結果。
- secret/PII scan。
- terminal JSON。

公開証拠はsecret/PII/provider private identifierを含まない。raw CLI logsはmode 0700のprivate tempへ置き、public evidenceにはhashとredacted summaryだけを書く。

実行、検証、外部調査、状態変更、handoffが発生した各sessionの終わりに、専用Spark documentation agentが以下を更新する。

- `/home/kokoro/projects/clients/ghost/docs/AI_WORK_LOG.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md`

既存行を改変せず、work logはcompactな1行をappend。Gate stateが変わった時だけcurrent statusのActive Handoffを更新。子が更新したdiffはfresh reviewerが確認する。

## 12. Stop conditions

即時停止:

- Spark connectivity/model proof不成立。
- exact authority不成立。
- lineage/source manifest hash不一致。
- dirty user workの上書き。
- write-set交差。
- V17 immutable artifact変更。
- Gate Cでapp source/P0 migration/lockfile変更。
- Production/Preview/live Stripe/LINE/実顧客mutation。
- endpoint create/delete/replacement、secret rotation。
- secret/PII/raw contact leak。
- reviewer 3/3未達。
- validation failure。
- ceiling超過。
- rollback/fallback不成立。
- Gate C PASS前のD/E着手。
- Authority B前のD/E着手。
- Gate E scopeへGate F〜Hを混入。

停止報告format:

```text
STATE=HOLD_<reason>|BLOCKED_<reason>
LAST_VALID_GATE=<0|A|B|C|D|E>
LAST_VALID_MANIFEST_SHA256=<sha-or-null>
FAILED_PACKET=<packet-id-or-null>
PACKET_MANIFEST_SHA256=<sha-or-null>
INVOCATION_COMMAND_SHA256=<sha-or-null>
COMMAND_TEMPLATE_VERSION=ghost.spark.cli.v1
INVOKED_FROM_RUN_ROOT=<private-path-or-null>
FORBIDDEN_ACTION_COUNT=<number>
NEXT_REQUIRED_INPUT=<exact human input or exact remediation packet>
RESUME_FROM=<barrier-id>
```

正常終了format:

```text
STATE=SIGNED_GATE_E_PASS
GATE_C_TERMINAL_SHA256=<sha>
GATE_D_TERMINAL_SHA256=<sha>
GATE_E_TERMINAL_SHA256=<sha>
FINAL_MANIFEST_SHA256=<sha>
PACKET_MANIFEST_SHA256=<sha>
INVOCATION_COMMAND_SHA256=<sha>
COMMAND_TEMPLATE_VERSION=ghost.spark.cli.v1
PROOF_ROOT=<absolute path>
PRODUCTION_DEPLOYED=false
NEXT_GATE=F_REQUIRES_SEPARATE_AUTHORITY
```

このformat以外で「完了」「PASS相当」「実質PASS」と表現しない。

## 13. 公式機能理解の参照

必要な外部再調査もread-only Spark research agentへ委譲し、一次資料を優先する。

- TableCheck予約管理: floor、service status、chart/time axis、drag-and-drop table変更、reservation block。
  - `https://www.tablecheck.com/ja/join/features/reservation-management/`
- TableCheck Enhance Operations: Door Waitlist、estimated seating、呼出、guest-side cancellation。
  - `https://www.tablecheck.com/en/join/features/enhance-operations/`
- TableCheck staff table assignment（2026-06-30）: add/change/remove assignment、staff-level reporting。
  - `https://www.tablecheck.com/ja/join/about-us/press/2026630tablecheck/`
- Consumer cancellation waitlistはDoor Waitlistとは別機能。
  - `https://support-diners.tablecheck.com/hc/en-us/articles/58873126586649-Cancel-Waitlist-Registration-and-Withdrawal`

公開情報からTableCheckの非公開内部アルゴリズム、非公開API、データ構造を推測・複製しない。operator outcomeと安全な自社contractを実装する。

以上を守り、最初にSpark疎通確認とR1/R2/R3を開始せよ。Authority AまたはAuthority Bが未提示なら、実装へ進まずexactな2行を要求してHOLDせよ。
