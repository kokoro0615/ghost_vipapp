# GHOST VIP Floor Operations

GHOST OsakaのVIPフロア現場オペレーション画面を、公開サイトから分離して管理するNext.jsアプリです。

## Current scope

- Floor / Timeline / List の3つの運用ビュー
- 例外キュー、予約Inspector、command center
- healthy / loading / stale / reconnecting / error / read-only / pre-open / dense のfixture scenarios
- 顧客名はマスク済みfixtureのみ
- 外部API、Supabase、Stripe、TableCheck、実顧客データへの接続は未実装

画面上の操作はブラウザ内fixture stateだけを更新します。実運用データへ接続するまでは、業務判断の記録先として使用しないでください。

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

## Deployment safety

このアプリは管理画面です。Vercel Authenticationに加え、`VIPAPP_BASIC_USER` と `VIPAPP_BASIC_PASSWORD` によるアプリ内Basic Authenticationを必須とします。環境変数が欠けている場合はfail-closedで全画面を401にします。
