# GHOST VIP Floor Operations

GHOST OsakaのVIPフロア現場オペレーション画面を、公開サイトから分離して管理するNext.jsアプリです。

## Current scope

- Floor / Timeline / List の3つの運用ビュー
- 例外キュー、予約Inspector、command center
- healthy / loading / stale / reconnecting / error / read-only / empty / dense の運用状態
- GHOST本体管理APIを中継し、実予約データを表示
- 検索、check-in、到着時間更新、卓割当、memo、service_status更新の safe commands 5件を実行
- 顧客情報は表示上の必要最小限（マスク）を維持し、個人情報の新規エクスポートは対象外
- 外部連携は Basic/PIN 認証付きの本番API連携で、TableCheck/API連携はこのサンドボックス外

画面上の操作は実DB更新 API 経由で処理されます。表示・監査ログ・権限は実運用運用ルールに従います。

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

### Production E2E

本番URL（`https://ghost-vipapp.vercel.app`）で本流接続を確認する場合は、Basic認証情報と対象オペレータのPINを環境変数で渡して実行します。

```bash
VIPAPP_BASIC_USER='...' VIPAPP_BASIC_PASSWORD='...' VIPAPP_OWNER_PIN='...' \
node scripts/prod-e2e.mjs
```

スクリプトは実予約が存在しない場合は閲覧系確認（認証／読込／日付切替／検索）を完了として終了し、存在する場合のみ safe command を順に検証します。

## Deployment safety

このアプリは管理画面です。Vercel Authenticationに加え、`VIPAPP_BASIC_USER` と `VIPAPP_BASIC_PASSWORD` によるアプリ内Basic Authenticationを必須とします。環境変数が欠けている場合はfail-closedで全画面を401にします。
