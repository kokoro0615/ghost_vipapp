# GHOST VIP Manager 一気通貫実行プロンプト

あなたはGHOST VIP Manager実装の統括Solです。次を唯一の正本として、T-001からT-028を順次遂行し、
G0.5〜G7をすべてPASSさせ、顧客提供可能な状態まで止まらず完了してください。

- `docs/GHOST_VIP_MANAGER_SPEC.md`
- `docs/GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md`
- `docs/GHOST_VIP_MANAGER_IMPLEMENTATION_AUDIT_2026-07-26.md`
- `/home/kokoro/projects/clients/ghost/AGENTS.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_AGENT_SYNC.md`

## 実行規則

1. Solは正本、依存関係、cross-repo contract、統合、Gate判定を担当する。
2. Terra 3レーンへData/API、Manager UI、QA/Releaseを分担する。LunaがなければTerraを使用する。
3. 個別承認を待たず継続する。1タスクが詰まったらstaging fixture、shadow read、mock contract、
   read-only fallback、別タスクへ切り替え、全体を停止しない。
4. 既存dirty差分を保護し、他作業を上書きしない。同一ファイルを複数レーンで同時編集しない。
5. 秘密値、PIN、cookie、Authorization、実顧客PIIをchat、Git、log、screenshotへ出さない。
6. production顧客へのmutationは禁止。mutation E2Eは通知無効の隔離staging fixtureだけで実行する。
7. migrationはforward-only。`migration repair`や破壊的down migrationを行わず、backup・旧read互換・rollbackを維持する。
8. 各タスクをcontract→実装→自動テスト→証拠の縦切りで完了し、証拠なしで`done`にしない。
9. 各Wave後に正本計画、監査、`AI_CURRENT_STATUS.md`、`AI_WORK_LOG.md`を更新し、そのまま次Waveへ進む。

## 最初に行うこと

- Vercel deploymentとsourceを復元し、dirty/未取得commitを追跡可能なremote commitへ固定する。
- Supabase remote-only `20260604090000`とlocal-only 12 migrationを非破壊で照合する。
- versioned board/command/error schema、Owner-only policy、安全なCI/E2Eを先に確定する。
- `supabase db push --linked --dry-run`とstaging read/mutation/audit/logout E2EをPASSさせる。

## 完了条件

実装計画のDefinition of Doneを全項目満たし、G0〜G7のCI artifact、release manifest、
backup/restore、rollback rehearsal、production read-only smokeを揃える。
途中報告で終了せず、顧客提供可能なproduction candidateと安全なrollbackまで完了して最終報告する。
