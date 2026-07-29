# GHOST VIP Floor Operations

GHOST OsakaのVIPフロア現場オペレーション画面を、公開サイトから分離して管理するNext.jsアプリです。

## Canonical documents

- [GHOST VIP Manager 正本仕様書](docs/GHOST_VIP_MANAGER_SPEC.md)
- [GHOST VIP Manager 正本実装計画](docs/GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md)
- [2026-07-26 実装完了度監査](docs/GHOST_VIP_MANAGER_IMPLEMENTATION_AUDIT_2026-07-26.md)
- [一気通貫実行プロンプト](docs/GHOST_VIP_MANAGER_EXECUTION_PROMPT.md)
- [本番完成コード＋Staging DB 顧客Trial一気通貫プロンプト](docs/GHOST_VIP_MANAGER_CUSTOMER_TRIAL_DEPLOYMENT_PROMPT.md)
- [長時間化収束・残作業限定・Production完遂プロンプト](docs/GHOST_VIP_MANAGER_PRODUCTION_COMPLETION_EXECUTION_PROMPT.md)
- [本番URL・期限付き顧客デモ・TableCheck-informed白UI 一気通貫プロンプト](docs/GHOST_VIP_MANAGER_PRODUCTION_CUSTOMER_DEMO_TABLECHECK_UI_EXECUTION_PROMPT.md)
- [オペレーターUIデザインシステム「OPERATIONS PAPER」](docs/ui/OPERATIONS_PAPER.md)

旧TableCheck関連文書は`docs/archive/tablecheck-legacy-2026-07/`の履歴資料であり、
現行の実装指示として使用しません。

## Current scope

- Customer Trial終了後の正式Production data planeをrelease targetとし、Trial mode、staging origin、bypass、Trial banner、Trial資格情報は各Gateで撤去
- active/UI卓は正式な`VIP-1`〜`VIP-8`だけ。`T1`〜`T8`はrun-scoped Trial fixtureとしてcleanupし、rename／移行しない
- VIP Managerだけをwarm-white、graphite、限定champagneのlight operations UIとし、公開GHOST websiteのblack-violet paletteは維持
- List / Floor / Chart の3つを直接到達可能な主要運用ビューとし、TableCheckは情報階層とworkflowだけを参照
- 例外キュー、予約Inspector、command center
- healthy / loading / stale / reconnecting / error / read-only / empty / dense の運用状態
- GHOST本体管理APIを中継し、実予約データを表示
- 検索、check-in、到着時間更新、卓割当、延長、memo、service_status更新の6 command入口
- 顧客情報は表示上の必要最小限（マスク）を維持し、個人情報の新規エクスポートは対象外
- 外部連携は Basic/PIN 認証付きの本番API連携で、TableCheck/API連携はこのサンドボックス外

2026-07-26監査時点では閲覧UIとcommand入口の段階です。正本v1.0の全業務機能と
共有source上のmutation lineageは未完成のため、顧客提供・本番mutation全面開放は行いません。
実装状況と次の作業は上記監査文書・正本実装計画を参照してください。

## Local development

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。旧URL互換として `/admin/vip-floor` と `/admin/vip-floor/ui-first` はルートへredirectします。

ローカル起動時も認証情報が必要です。

```bash
VIPAPP_BASIC_USER=ghost-ops VIPAPP_BASIC_PASSWORD='set-a-strong-password' npm run dev
```

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

### Production smoke

現行`scripts/prod-e2e.mjs`は2026-07-26監査でcookie保持、専用fixture、cleanupに不備が見つかったため、
本番では実行しません。正本計画T-004でread-only smokeへ分離し、mutation E2Eは通知無効の
隔離staging fixtureへ移します。

## Deployment safety

このアプリは管理画面です。Vercel Authenticationに加え、`VIPAPP_BASIC_USER` と `VIPAPP_BASIC_PASSWORD` によるアプリ内Basic Authenticationを必須とします。環境変数が欠けている場合はfail-closedで全画面を401にします。

破壊的staging cleanup、Production DB migration、Website/VIP alias promotion、mutation flag有効化は通常は別々のOwner承認Gateです。2026-07-27の正式Production完遂releaseに限り、上記の残作業限定promptに記録されたOwnerのstanding authorizationとfail-closed条件を適用します。履歴参照を持つinactive検証卓は物理削除せず、active read/UIからだけ除外します。
