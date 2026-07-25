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

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment safety

このアプリは管理画面です。Vercel Productionへ公開する前にDeployment Protectionを有効化してください。Hobby planではProduction domainを保護できないため、Vercel AuthenticationでProductionを保護できるプランか、アプリ内認証を実装する必要があります。

