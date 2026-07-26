# GHOST VIP Manager 実装完了度監査

> 文書ID: GHOST-VIP-MANAGER-AUDIT-2026-07-26  
> 監査日: 2026-07-26 JST  
> 対象本番: `https://ghost-vipapp.vercel.app/`  
> 対応仕様: `GHOST_VIP_MANAGER_SPEC.md` v1.0  
> 対応計画: `GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md` v1.1  
> 最新疎通時の公開deployment: `dpl_9Vh3knq1cBgnR48UNMxx7gM7j2NX`

## 1. 結論

現行本番は「Basic/PINで保護された旧GHOST予約台帳の閲覧UI」と
「6 commandを別backendへ中継するUI」の段階である。
正本v1.0が定義するGHOST VIP Managerの顧客提供可能な完成状態ではない。

確認できた土台は次のとおり。

- 独立Next.jsアプリ、Vercel production、Basic認証のfail-closed動作。
- PIN session中継、Floor / Timeline / List、予約Inspector、検索、状態表示。
- 13状態の表示metadata、6 commandのUI/API入口、idempotency keyと`expectedUpdatedAt`の入力検証。
- mutation kill switch由来のread-only表示、browser offline検知、監査IDの表示入口。
- GHOST固有の黒紫・champagne系UI、focus、44px操作、reduced motionの基礎。
- `lint`、`typecheck`、`build`、production 401 smokeの合格。

一方、顧客提供を阻む最上位問題は次のとおり。

1. VIP Appが中継する`/api/admin/reservations/:id/vipapp-command`が共有`website`ソースに存在せず、
   更新・監査・競合制御の実在をsource-of-truthから証明できない。
2. 営業日が21:00開始、NORTH/SOUTH sectionあり、卓割当は1卓、延長は30分固定、
   操作理由は画面入力、Owner以外にもmutation許可という正本との重大不一致がある。
3. 新規予約8段階、Walk-in、Waitlist、block/online stop、スタッフ担当卓、顧客統合、
   通知outbox、realtimeは未実装。
4. unit/contract/integration/Playwright/visual/a11y testとCIがなく、Release Gate G1〜G7を
   再現可能な証拠で合格させられない。
5. 現行`prod-e2e.mjs`はsession cookieを保持せず、専用fixture/cleanupもなく、
   任意の本番予約をmutation対象にし得るため、正本の本番検証手段として使用できない。

したがって、現行版のproduction mutation全面開放は不可。
既存productionはread-only fallbackとして保持し、G0.5でbackend lineageを確定した後、
API/DB/testを先に完成させてからUIを縦切りで接続する。

## 2. 監査方法と証拠境界

### 2.1 実施

- 本番URLと主要5 APIを未認証・不正BasicでHTTP確認。
- 320×844、768×1024、1194×834でBasic認証境界を確認。
- ローカル1194×834と320×844でPIN画面、a11y tree、horizontal overflow、touch targetを確認。
- 正本仕様・計画、`ghost_vipapp`の全source/API/adapter/scripts/package/configを静的追跡。
- `ghost/website`の公開予約、`vip-status`、既存admin reservation routeを静的追跡。
- `npm run lint`、`npm run typecheck`、`npm run build`、`npm audit --omit=dev`を実行。
- 現行Web Interface Guidelinesでfocus、form、touch、responsive、state、a11yを確認。

### 2.2 実施しなかったこと

- Basic/PINの実値を取得・表示・保存していない。
- 実顧客PIIを閲覧・保存していない。
- 本番予約、顧客、block、notificationへのmutationを行っていない。
- 本番Basic認証後の画面・console・networkは資格情報なしのため実証していない。

本番認証後の未実証項目は、実装済みと推定せず`未実証`または静的証拠に応じて`部分`とした。

## 3. 公開環境の観測結果

| 対象 | 結果 | 判定 |
|---|---|---|
| `/` | `401 Authentication required.` | Basic fail-closed合格 |
| `/api/admin/session` | `401` | Basic境界合格 |
| `/api/admin/session/pin` | `401` | Basic境界合格 |
| `/api/admin/vip-floor` | `401` | Basic境界合格 |
| `/api/admin/vip-floor/commands` | `401` | Basic境界合格 |
| 不正`date`付きread | Basicより先へ進まず`401` | 情報漏えいなし |
| 401 header | `no-store`、HSTS、`nosniff`、frame deny、noindex、Basic challenge | 基礎保護合格 |
| `/media/images/vipmapv3.9239fd2174.webp` | `200` | フロア画像はBasic外。公開可否をsecurity reviewで確定 |
| `/icon.svg` | `200` | public brand assetとして許容候補 |
| 3 viewport | 全てnative Basic dialog | 認証後UIは未実証 |
| VIP App production | `dpl_9Vh3knq1cBgnR48UNMxx7gM7j2NX`、Ready | Git SHAは`08ecb1f…`だが`gitDirty=1` |
| GHOST production | `dpl_5RaU3Mpz8KanMeEnfcZK5b9NGFSP`、Ready | metadata SHA`96771cb…`はlocal/remote object未検出 |

## 4. 要件別実装マトリクス

判定:

- `完了`: productionまたは再現可能な自動検証で正本どおり確認。
- `部分`: 土台はあるが正本受入条件を満たさない、または本番未実証。
- `未実装`: UI/API/DB/自動検証の主要要素がない。
- `不一致`: 実装が正本と反対の挙動を持つ。
- `証拠不足`: 呼出先やproduction lineageが共有sourceから追跡できない。

| ID | 正本領域 | 判定 | 現行証拠 | 完了に必要な差分 |
|---|---|---|---|---|
| A-01 | 独立アプリ・production | 完了 | Next.js app、Vercel Ready、alias | Release lineageをCIへ記録 |
| A-02 | 外周Basic認証 | 完了 | `src/proxy.ts`、本番5 path `401` | credential rotation runbook |
| A-03 | Owner PIN session | 部分 | PIN proxy、HttpOnly/Strict cookie | Owner 1件、hash/rate/lock/session expiryのcontract/E2E |
| A-04 | Ownerだけmutation/PII | 不一致 | `adminPermissions.ts`が他4 roleにもcommand許可 | 初期policyをOwner-onlyへ変更し403 test |
| A-05 | Floor / List / Chart / 詳細 | 部分 | Floor/Timeline/List/Inspectorあり | Chart正式名、TableCheck型階層、当日情報、全状態fixture |
| A-06 | 4ナビ・Menu階層 | 未実装 | 現行は左railと3 view | 新規予約/List/Floor/Menu、Online/顧客/設定 |
| A-07 | 新規予約8段階・編集 | 未実装 | create route/componentなし | 8段階、戻る保持、再検証、通知選択 |
| A-08 | 22:00〜翌05:00営業日 | 不一致 | fallback/UIは21:00、初期日付は暦日 | 共通business-day関数、境界test |
| A-09 | 8卓正本・sectionなし | 不一致 | 座標8個はあるがbackend席任意、2 section強制 | 機械可読8卓masterと実geometry、section撤去 |
| A-10 | 最大3回転・区間競合 | 未実装 | interval/capacity/block testなし | DB exclusion/transactionと固定clock contract test |
| A-11 | 複数卓配席 | 不一致 | modelは配列だがcommandは1卓固定 | many-to-many assignment、追加/解除/交換/未配席 |
| A-12 | GHOST 13状態表示 | 部分 | contract/metadata/selectは13種 | server遷移表、late自動表示、no-show Owner限定 |
| A-13 | 到着/着席/退店時刻 | 未実装 | checked-in由来1値中心 | 各時刻列、atomic transition、履歴 |
| A-14 | 6現場操作 | 部分・証拠不足 | UI/API入口6件 | 実在backend route、全command contract/E2E |
| A-15 | 延長15分刻み/最大120分 | 不一致 | UI/API/scriptは30分固定 | 15/30/45/60…120、60 preset、競合再検証 |
| A-16 | 固定操作理由 | 不一致 | UIで理由入力しbackendへ転送 | serverで`管理画面操作`固定、UI入力撤去 |
| A-17 | 公開予約→Manager read | 部分 | `vip-status`中継とboard adapter | versioned read contractとstaging E2E |
| A-18 | 確定予約のみ表示 | 不一致 | `vip-status`は営業日予約をstatus/期限で除外しない | confirmed条件、hold/期限切れ除外test |
| A-19 | Manager変更→顧客確認 | 未実装 | 同期route/realtimeなし | customer view read model更新とE2E |
| A-20 | Eメールoutbox最大3回 | 未実装 | Manager変更outboxなし | transaction outbox、retry/dead/re-send UI |
| A-21 | Walk-in | 未実装 | source typeのみ、create導線なし | 短縮作成と到着atomic保存 |
| A-22 | Waitlist | 未実装 | model/route/UIなし | 5状態、30分期限、Eメール、着席 |
| A-23 | block / online stop | 未実装 | adapterは`blocks: []`、`manageBlocks:false` | create/edit/release/repeat、公開受付連携 |
| A-24 | スタッフmaster・担当卓 | 未実装 | staff-table型/UIなし | Owner登録、営業日割当、Floor cue/filter |
| A-25 | 顧客・PII・自動集約 | 部分 | マスク済み表示名のみ | Owner PII、電話→Eメール、属性/履歴、解除/再紐付け |
| A-26 | 競合/idempotency/監査 | 部分・証拠不足 | key/updatedAt/audit ID入口 | DB version、再送dedupe、前後値、request ID、永続audit |
| A-27 | realtime/offline/revision | 部分 | browser offlineとrevision表示 | realtime channel、gap/out-of-order、stale cache、reconnect |
| A-28 | iPad/a11y/320px | 部分 | focus、44px、reduced motion、PIN 320 overflowなし | 3解像度visual/axe、tab keyboard、認証後実機Safari |
| A-29 | unit/contract/E2E/visual/CI | 未実装 | packageはlint/typecheck/buildのみ | test DB、CI、Playwright、visual、axe、artifact |
| A-30 | rollout/rollback | 部分 | kill switch、Vercel rollback方針 | dual contract、DB forward compatibility、restore rehearsal |
| A-31 | customer-ready observability | 未実装 | 永続metric/alertなし | request ID log、SLO、error/outbox/realtime alert |
| A-32 | 文書整合 | 部分 | 正本2本あり | READMEの5/6件、現状/route lineageを正す |

## 5. コード上の重大不一致

### 5.1 backend source lineage切れ

VIP Appは次へ中継する。

```text
POST /api/admin/reservations/:reservationId/vipapp-command
```

しかし共有`ghost/website/src/app/api/admin/reservations/[reservationId]/`には
`assign`、`check-in`、`confirm`、`extend-seat`、`cancel`があり、
`vipapp-command` routeは存在しない。

本番が別コミットのrouteを持つ場合でも、immutable deployment SHAと対応sourceが正本から追跡できないため、
現状の6 commandは「production実装済み」ではなく「VIP App側入口のみ」と判定する。

2026-07-26のVercel API疎通では、両productionが同一CLI認証ユーザーによる`source=cli` deploymentであることを確認した。
VIP Appはmetadata SHAとlocal HEADが一致する一方`gitDirty=1`で、deploy内容とcommitの完全一致を証明できない。
GHOST本体のmetadata SHAとbranchはlocal object・remote originのどちらにも存在せず、deployment sourceを復元できない。
したがってG0.5のsource lineageは引き続きFAILとする。

### 5.2 現行契約と正本の衝突

| 項目 | 正本 | 現行 |
|---|---|---|
| 営業開始 | 22:00 | 21:00 |
| section | なし | VIP NORTH / SOUTH |
| 卓割当 | 複数卓 | ちょうど1卓 |
| 延長 | 15分刻み、最大120分、60分preset | 30分固定 |
| 操作理由 | server固定 | UI入力必須 |
| mutation role | Ownerのみ | 5 role中4 role以上が一部実行可能 |
| PIN表記 | Owner専用 | スタッフPIN |
| payment UI | 対象外として非表示 | Inspectorに「決済」tab |
| Chart名称 | 独立Chart | 時間軸/Timeline |
| 公開予約表示 | confirmedのみ | `vip-status`がhold/statusで除外しない |

### 5.3 現行production E2Eの問題

`scripts/prod-e2e.mjs`は次の理由でrelease evidenceに使用しない。

- PIN responseの`Set-Cookie`を保持せず、その後のsession/board requestへcookieを送らない。
- 専用`E2E削除可`fixtureではなく任意の未完了本番予約を選び得る。
- 6 mutation後のcleanupがない。
- 最初のmutation後に`expectedUpdatedAt`を更新せず、後続が競合し得る。
- boardの`tables`ではなく`seats`を参照し、assignment検証がskippedになり得る。
- 実予約0件ならread-only確認だけで成功終了し、主要操作を証明しない。

production用はread-only smokeへ縮小し、mutation E2Eは隔離stagingまたは通知無効の専用fixtureへ移す。

## 6. UI/UX・アクセシビリティ所見

### 合格している基礎

- GHOST OsakaがPIN画面の第一viewportで明確。
- 黒紫 lacquer、champagne accent、実フロア画像を使用。
- 主要buttonは44px前後、focus-visible、skip link、dialog focus trapがある。
- 状態は色だけでなくicon、border cue、labelを併用。
- `prefers-reduced-motion`を扱う。
- PIN画面は320pxでhorizontal overflowなし。

### 顧客提供前に直す項目

- iPad横の正本UIはTableCheck型の下部4ナビだが、現行は左rail/3 view。
- 1194×834の認証後production visual evidenceがない。
- `autoFocus`をmobileでも適用しており、キーボードによる第一viewport圧迫を再検証する。
- tablistはArrow key/roving tabindexを持たない。
- filter/view/tabのURL state/deep linkがない。
- search inputに`name`、適切な`autocomplete`、例を含むplaceholderを追加する。
- `.commandForm`は`outline:0`に対し`:focus` borderだけで、`:focus-visible`を統一する。
- floor canvasが明色、英語`EXCEPTION QUEUE`、NORTH/SOUTH、決済tabなど正本外の残存がある。
- mobile Timelineは内部horizontal scrollを前提とする。主要操作は見切れない代替viewを提供する。
- empty/dense/stale/conflict/long Japanese labelを3解像度visual regressionへ固定する。

## 7. Release Gate判定

| Gate | 現在 | 理由 |
|---|---|---|
| G0 正本 | PASS | v1.0仕様、v1.1計画、legacy archive |
| G0.5 Source lineage | FAIL | mutation target routeを共有sourceで追跡できない |
| G1 Contract | FAIL | 22時、8卓、複数卓、version、状態遷移、test未完成 |
| G2 Security | PARTIAL | Basicは合格、Owner-only/PIN/audit/PII test未完成 |
| G3 Booking bridge | FAIL | confirmed-only、customer sync、outbox、2秒E2E未完成 |
| G4 UI parity | FAIL | shell/8段階/Chart/3解像度visual未完成 |
| G5 Operations | FAIL | Waitlist/block/staff等未実装 |
| G6 Resilience | FAIL | realtime/revision/offline/SLO test未完成 |
| G7 Production | FAIL | staging E2E、backup/restore、rollback rehearsal未完成 |

## 8. 顧客提供判定

### 現時点で触れてよい範囲

- 開発者/Ownerによるread-onlyの現行board確認。
- Basic/PIN認証境界の検証。
- 実予約を変更しない画面・検索・日付切替のsmoke。

### 現時点で触れさせない範囲

- 顧客または現場スタッフへの完成版としての提供。
- production mutation全面開放。
- 現行`prod-e2e.mjs`による本番予約の一括command。
- Waitlist、block、複数卓、通知、顧客PIIが動く前提の運用。

### 完成判定

改訂計画のG0.5〜G7を全て再現可能な証拠でPASSし、
production read-only smoke、隔離fixture mutation、rollback rehearsalを完了した時点で
「お客様が触れるレベル」と判定する。
