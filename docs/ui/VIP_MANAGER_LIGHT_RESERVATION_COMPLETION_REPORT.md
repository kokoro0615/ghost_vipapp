# VIP Manager 白基調 / font / 新規予約layout — 完了報告

> **履歴資料（2026-07-31最終追記）**: 本文のdeployment ID、Owner PIN、
> `datetime-local`に関する記述は執筆時点の情報です。UI commit `8f7ceee` は
> 現行Production runtime commit
> `dcc10c42fe6b9fcf22e96109c7740813396b6d60` に含まれ、fixed Production
> `dpl_Bjm8Tk3RzR1UW15cojhEAMgwNhDj` へ反映済みです
> （rollback=`dpl_2XzxGeLTZ994wVJQDANVmBvhjSYs`）。現在はBasic認証のみ、
> 時刻入力は22:00〜翌05:00の限定selectです。認証付きdesktop/mobile
> Production E2EもSSE rotation 2回、background board refresh中の操作、
> offering/table互換filter、error 0、business mutation 0までPASSしています。

| 項目 | 内容 |
|---|---|
| 実施日 | 2026-07-30 JST |
| 担当 | Claude Code（frontend UI限定） |
| 対象 | `https://ghost-vipapp.vercel.app/` の operator UI |
| 正本worktree | `/home/kokoro/projects/clients/ghost/.worktrees/vip-manager-production-light-ui` |
| 作業開始時のProduction commit | `e2ba841f71e0b8ef56104a1713098211cf9aaa20`（`git rev-parse HEAD` 一致・開始時tree clean） |
| 成果物の状態 | Claude Code自身はcommit / push / PR / deployを一切実行していない。ただし**本report執筆中に別session（Codex）が本変更をcommit `8f7ceee` としてpushし、さらにProductionへdeploy・promote済み**（詳細は §11） |
| Vercel Production | **反映済み（Codexが実施）** — `dpl_CZtSaZhCASxpM97jLnFk91ksaTZt` が `https://ghost-vipapp.vercel.app/` のfixed alias。rollback先 `dpl_G6MDi67A7xNx375cGEFCDG5ghvsq` |
| backend変更 | **0**（API / DB / 契約 / payload / 認証 / 通知 / 決済 / env / Vercel設定） |

関連document:

- 研究・設計根拠: `docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md`
- 設計正本（更新済み）: `docs/ui/OPERATIONS_PAPER.md`
- 共有log（更新済み）: `../../docs/AI_WORK_LOG.md`, `../../docs/AI_CURRENT_STATUS.md`

---

## 0. 結論

Owner要望の3点をすべてlocal実装し、既存の品質ゲートを維持したまま完了した。

1. **白基調の明確化** — 面のvalue差が1.6%しかなく3枚の面が1枚に見えていた問題を解消。純白の作業面は維持し、canvasを一段下げて「机に置いた紙」の関係にした。
2. **fontのAI感解消** — 全数値を組んでいた `IBM Plex Mono` を撤去し、**M PLUS 2 単一family**へ移行。台帳の列が揺れないこと（tabular figures）を実測で担保した上で、端末画面らしさとIBM企業色を同時に排除した。
3. **新規予約ダイアログ内部の再設計** — 3同格カラムを2 zoneへ、常時表示summary barの新設、8段階rulerのphase grouping、卓stepでのfloor map実用化、確認stepの全項目化、mobileの`display:none`撤去。

8段階・順序・保存payload・予約日変更挙動は**byte単位で不変**。

---

## 1. AI感の主因（実査で特定、重要度順）

承認済みread-only harness（`npm run test:a11y` / `scripts/a11y-visual.mjs`）で45 states × desktop 1440×900 / mobile 390×844 をbaseline撮影して判定した。Production URLはBasic認証保護のため迂回せず、harnessのsynthetic/demoデータで描画確認している。

1. **IBM Plex Mono で全数値を組んでいたこと（最大要因）**
   `22:30` / `GHO-0726-01` / `VIP-8` / `v4` / `2026-07-31` がIDE書体で並び、予約台帳がログビューアに見えていた。
2. **1ダイアログ内に英字eyebrowが5個**
   `GHOST ARRIVAL CONTROL` / `DATE / TABLE` / `BUSINESS DATE` / `PRE-SAVE CHECK` / `FINAL VALIDATION`。日本語見出しの上に小さな英字kickerを載せる形は最も分かりやすいAI管理画面の特徴で、いずれも情報を足していない。
3. **均等反復** — 8個の等幅step cell（丸番号付き）、4行の同型check、3個の同型 `dl`。実際の作業は等価でないのに等価な重みで並んでいた。
4. **入れ子カード** — rail → 枠付き `ul` → 枠付き `section` × 2。値と余白ではなく箱で階層を作っていた。
5. **階層のない余白** — `.wizardStatement { min-height: 240px; place-content: center }` により日付/時刻stepに240–350pxの中央寄せ空白。operations toolにmarketing pageのリズムが入っていた。
6. **色の誤用** — `席選択「未選択」`が step1 から警告色（卓選択に到達すらしていない段階）、`データ境界「Owner」`が恒常warn色（中立な事実）。解消しない警告色は「警告色を無視する」習慣を作る。
7. **UIを説明文で説明** — 「ここで予約日を変更できます。外側の営業日も自動で切り替わります。」等。配置・ラベル・状態で理解させるべき箇所を散文で補っていた。

### 実査で確認した個別欠陥

| # | 欠陥 | 根拠 |
|---|---|---|
| 1 | active formが本文の約47%しか占めない（`minmax(230px,0.85fr) minmax(340px,1.35fr) minmax(210px,0.7fr)`） | `.wizardBody` |
| 2 | 同じ事実が左context・右check・確認stepで三重表示 | steps 1–8 capture |
| 3 | **mobileで `display: none`** により日付・時刻・人数が消える | `.wizardContext, .wizardChecks`（≤1023px） |
| 4 | wizard mapが `invert(1) grayscale(1) contrast(1.6)` で灰色線画、かつ卓stepでも選択を示さない | `.wizardMap img` |
| 5 | 未到達stepへの恒常警告色 | steps 1–3 capture |
| 6 | 確認stepが4項目のみ（担当・通知・現場メモ・入口表示名・経路/状態が欠落） | step 8 capture + `save()` payload |
| 7 | 日付/時刻stepの240–350px空白 | steps 1–2 capture |
| 8 | 390pxでstep cellが約44px幅に11px×2文字、現在地が読み取りにくい | mobile step 4 capture |
| 9 | `datetime-local` が `07/31/2026, 10:00 PM` と表示される一方、2カラム隣で `22:00–00:00` と表示（同一値の書式不一致） | step 2 capture |
| 10 | 枠付きrail内に枠付き `版情報` / `監査プレビュー`（カードの入れ子） | step 1 capture |

---

## 2. 研究した公式source

- TableCheck — [Reservation & table management](https://www.tablecheck.com/en/join/features/reservation-and-table-management/) / [Features](https://www.tablecheck.com/en/join/) / [floor plan記事](https://www.tablecheck.com/en/blog/success-means-an-excellent-restaurant-floor-plan/)
- SevenRooms — [Table management](https://sevenrooms.com/platform/table-management/) / [Reservations & waitlist](https://sevenrooms.com/platform/reservations-waitlist/)
- Resy — [ResyOS](https://resy.com/resyos) / [Service features](https://resy.com/resyos/features/service/) / [Restaurants](https://resy.com/join/restaurants/)

**正直に記録する限界**: これらは製品能力を述べたページで、UI機構の内部までは書かれていない。記載のない挙動を推測で補ってはいない。

### 抽出した操作原則（情報設計のみ）

1. **host standでは1箇所に集約** — SevenRoomsは "manage reservations, waitlist management and table availability right from one place: your host stand." と明記 → activeなタスクが画面を占めるべきで、3つの同格paneに注意を分散させない。
2. **注意が必要な場所に状態を出す** — SevenRoomsはtable statusを "so managers and servers know where to focus"、check-in/cancellation/no-showのreal-time alertを説明 → 警告は該当fieldやstepの近くに置く。常設の側paneに駐留させない。
3. **guest contextは常設せず紐付ける** — SevenRooms / Resy いずれもnotes/tags/historyを当該予約に対して引き出すものとして説明 → 常設の第3カラムは不適切。
4. **予約の背骨は短い直線** — Resy: "selecting the date, time and party size, adding the guest information and sending a confirmation." → GHOSTの8段階も同じ背骨。**段階は変えず**、儀式的に見せないUIにする。
5. **floor planは作業道具** — TableCheckは実際の部屋を描いて配席最適化、Resyはpacing controlとtable combinationを説明 → mapは配席の瞬間に価値を持ち、選択を示さなければならない。

### 採用しない競合表現

TableCheck / SevenRooms / Resy のブランド色・logo・icon set・文言・screenshot・固有レイアウトは一切使用していない。加えて、status pillを状態の主要な担い手にする表現、AI自動配席、KPI多面dashboard、marketing gradientも採用していない。

---

## 3. font — 採用と不採用

### 実測方法（再現可能）

headless Chromium（`playwright-core` + system Chrome）で候補書体をGoogle Fontsから読み込み、15pxで測定した。設計時の調査のみで、**runtimeの外部font依存は導入していない**。

- `digit spread` = DOM上で `1111111111` と `0000000000` をレンダリングした幅の差
- `tnum` = `font-variant-numeric: tabular-nums` がその差を変えるか
- 日本語カバレッジ = 同じ日本語文字列を候補書体と存在しない書体でラスタライズし、pixel hashを比較（fallback判定）

### 比較結果

| 候補 | weights | JP自前webfont | digit spread | `tabular-nums`有効 | 判定 |
|---|---|---|---|---|---|
| **M PLUS 2** | 100–900 + variable | yes | **0.00px** | **yes** | **採用** |
| IBM Plex Sans JP（現行） | 100–700 | yes | 0.00px | yes | 不採用 — voice |
| IBM Plex Mono（現行figures） | 100–700 | n/a | 0.00px | yes | 不採用 — 端末感 |
| Noto Sans JP | 100–900 + variable | yes | 0.00px | yes | 不採用 — 汎用性 |
| Zen Kaku Gothic New | 300–900 | yes | **18.16px** | **no** | 不採用 |
| Zen Kaku Gothic Antique | 300–900 | yes | 18.16px | no | 不採用 |
| Murecho | 100–900 + variable | yes | 15.00px | no | 不採用 |
| BIZ UDPGothic | **400/700のみ** | yes | 19.48px | no | 不採用（二重失格） |
| Hiragino系system stack | OS依存 | n/a | n/a | n/a | 次点（0 byte）→ fallbackとして採用 |

### 判断理由

- **当初はZen Kaku Gothic Newを推していたが、測定で覆った。** Zen Kaku系・Murecho・BIZ UDPGothicは**tabular figuresを持たず**、Google Fonts版に `tnum` featureが無いため `tabular-nums` も効かない。10桁で15〜19.5pxずれるため、時刻・人数・卓・予約番号が列に並ぶ台帳では列が桁ごとに揺れる。図表用途として失格であり、「全数値はtabular」という設計規則の下では全体としても失格。
- **BIZ UDPGothicは二重失格** — 400/700のみで400/500/700の階層が崩れ、"P" は文字通りproportional。UDの可読性は本物だが、voiceは日本の役所・事務文書であり高級ラウンジではない。
- **Noto Sans JPは無検証で却下していない。** 技術的には合格（uniform digit・`tnum`有効）だが、日本語webfontの事実上の既定＝JP版Interであり、**設計理由でのみ**不採用とした。
- **Hiragino系system stackは0 byteでiPadに最適**だが、Windows機ではYu Gothic UIに劣化（11–13pxで細く弱い）し500 weightの保証がない。venueの混在端末では不安定なため、primaryにせずfallback listの先頭に据えた。
- **M PLUS 2を採用。** uniform digit advanceと有効な `tnum` を実測、日本語グリフを自前webfontから供給することも実測確認（system fallbackへの無言の劣化なし）。400/500/700で真の階層。日本人設計（M+ FONTS, OFL 1.1）で仮名が温かく開いており、IBMの企業色と端末感を一度に排除できる。

### monoの撤去

数値の役割は残すが、担い手を**同一family内のweight（500/600）+ `tabular-nums` + 微tracking**に変えた。印刷された時刻表・台帳が実際に採る方法である。単一familyにすることで `4名` / `1卓` / `¥120,000` のような混在文字列で、数字と助数詞が別fontから来る継ぎ目も消える。CSSの呼び出し側を変えずに済むよう `--font-figure` token名は維持した。

`palt` はbodyで有効（日本語の散文に適切）だが、`.tabular-nums` 内では**明示的にoff**にした。proportional spacingがtabular advanceを打ち消すためである。ビルド後の実アプリで `1111111111` と `0000000000` が同幅であることを検証済み。

### 禁止事項の遵守

「人気だから」でInterを採用していない / Noto Sans JPを無検証採用していない / 見出しだけ極端なdisplay fontにしていない / 細字・tracking過多で高級感を演出していない / runtime remote CSS importなし / ライセンス不明fontなし / **新規font package追加なし**（`next/font/google` の既存経路のみ）。

---

## 4. palette before / after

| token | before | after |
|---|---|---|
| `--paper` | `oklch(0.968 0.0025 85)` | `oklch(0.958 0.0035 85)` = `#f2f1ee` |
| `--surface` | `oklch(1 0 0)` | 変更なし（純白の作業面） |
| `--surface-raised` | `oklch(1 0 0)` | 変更なし |
| `--surface-quiet` | `oklch(0.984 0.002 85)` | `oklch(0.981 0.0025 85)` |
| `--surface-sunken` | `oklch(0.955 0.003 85)` | `oklch(0.944 0.004 85)` |
| `--surface-hover` | `oklch(0.962 0.004 85)` | `oklch(0.955 0.004 85)` |
| `--surface-active` | `oklch(0.941 0.005 85)` | `oklch(0.932 0.005 85)` |
| `themeColor`（viewport） | `#f5f4f2` | `#f2f1ee`（`--paper` と同期） |
| ink / champagne / graphite action / status | — | **変更なし** |

- 旧rampは paper `0.968` 対 pane `1.0` の1.6%差で、wizardの3枚の面が1枚の平坦な面に見えていた。これが「どこが主役か分からない」直接原因。
- ink・accent・action・statusは既にWCAG 2.2 AA検証済みのため**意図的に触っていない**。
- 全stepが暖白のまま。greyは1つもない。
- champagneは選択・現在地・構造線に限定（現在stepの2px上罫、選択卓の枠と下罫、map bracket）。画面面積の8%を大きく下回る。
- 階層はvalue + hairline + spacingのみ。shadow / blur / glass / gradient / radius拡大の追加なし。
- `themeColor` は `--paper` をブラウザでラスタライズして `rgb(242,241,238)` を確認して決定した（手計算ではなく実測）。

`--surface-sunken` の輝度も harness の major-surface luminance ≥ 0.68 ゲートを大きく上回る（実測 `rgb(238,236,233)`）。

---

## 5. 新規予約layout before / after

| 観点 | before | after |
|---|---|---|
| 構成 | 3同格カラム（active約47%） | **2 zone**（active主役 + 単一rail）。確認stepはrailを外して全幅 |
| 入力済み情報 | 左context + 右check + 確認 の三重表示 | **常時表示summary bar**（日付 / 時刻 / 人数 / 卓、tabular）に一元化 |
| mobile | `display: none` でcontext / check消失 | **撤去**。barは全幅で常時表示、railはscroll内のblockとして残る |
| progress | 8等幅cell + 丸番号 | 1本のruler / 8 segment / phase grouping（日時・席1–4 / 顧客・詳細5–7 / 確認8）。境界は余白で表現 |
| 段階の状態 | 色と塗りに依存 | glyph（✓）+ weight + 塗り + `aria-current="step"` + 読み上げ（入力済み / 現在の段階 / 未入力） |
| floor map | 全stepに表示、`invert(1) grayscale(1)` の灰色線画、選択非表示 | **卓stepのみ**。実色（`filter: none`, `unoptimized`）+ 実 `geometry.xPercent/yPercent` に選択をchampagne bracket |
| 保存前check | 常設4行（未到達stepに警告色） | **廃止**。検証は該当fieldの直下 |
| 確認step | 4項目 | **11項目**（営業日 / 時刻 / 人数 / 卓+定員 / 顧客 / 入口表示名 / 経路・状態 / 担当 / 通知 / 現場メモ / 版） |
| 日付step | 中央寄せ240pxの巨大mono日付 | 上詰めフォーム + 営業枠・正式卓のfact list |
| 時刻step | 350pxの空白 | 24時間readout（`22:00–00:00` + 滞在時間）+ 不正時のinline error |
| footer | 戻る / `N / 8 · 段階名` / 次へ | 戻る / **次は〜**（次操作の発見性）/ 次へ・保存。位置は全step全幅で不動 |
| 英字eyebrow | ダイアログ内5個 | **0個**（wizard内）。ダイアログ見出しは `新規予約` 単独 |

### 実装中に見つけて修正した実欠陥

フロア図の版下に**卓番号が既に印刷されている**ため、番号overlayを載せると8卓すべてが二重ラベルになった（`8`/`8`、`7`/`7` …）。中抜きのchampagne bracketへ変更し、印刷済みの番号が透けて読める形にした。「どこ」と「どれ」を同時に保てる。

### 分割方針

business logicは移動・変更していない。presentational要素は `ReservationWizard.tsx` 内に留め、`operations/` 配下から外へ出していない。装飾用の新規画像・抽象SVGは追加していない（既存の正式floor geometryのみ使用）。

---

## 6. 凍結事項の不変性（差分検証済み）

Production commit `e2ba841f` の同ファイルと関数単位でdiffを取り、**byte単位で同一**を確認した。

```
save()                 … IDENTICAL
stepValid()            … IDENTICAL
changeBusinessDate()   … IDENTICAL
```

以下すべて未変更:

- 8段階の入力データと順序（日付 / 時刻 / 人数 / 卓 / 顧客 / 追加 / 担当 / 確認）
- `save()` のpayloadとfield集合、create / updateの分岐
- `expectedVersion` / `expectedTableVersions`、`eventDayId` / `offeringId`
- `sourceChannel` / `serviceStatus` / `notificationPreference`
- demo / trialのPII制約、`onRun`、`onBusinessDateChange`、`stepValid`
- reservation edit、Walk-in、受付ブロック
- 日付変更時のboard / offerings / table version / staff再取得
- 未登録日のinline errorと遷移停止、外側営業日とURLの同期
- notification / audit / conflict validation

8段階の削除・統合・並べ替え・1ページ保存化はしていない。視覚上のphase groupingのみ導入し、全8段階と現在地はaccessibleに認識できる。

### harness hookの維持

既存の自動QAが依存するaccessible nameとselectorをすべて維持した。

`dialog 新規予約` / tabs `Walk-in`・`受付ブロック`・`事前予約` / `予約作成 N/8`（N=1…8） / label `予約日` / `aria-describedby^="reservation-date-hint"` / group `予約卓` と `VIP-1` checkbox / button `次へ` / label `プラン`

---

## 7. 変更ファイル一覧

すべてallowlist内。7ファイル変更 + 新規document2件。

```
変更:
  src/app/globals.css
  src/app/layout.tsx
  src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css
  src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx
  src/components/admin/vip-floor-v2/operations/OperationCenter.tsx   ← 英字eyebrow 1行のみ
  tests/contract/operator-light-ui.test.mjs
  docs/ui/OPERATIONS_PAPER.md

新規:
  docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md
  docs/ui/VIP_MANAGER_LIGHT_RESERVATION_COMPLETION_REPORT.md   ← 本ファイル
```

差分規模: commit `8f7ceee` として 8 files / **813 insertions / 180 deletions**（うち研究doc 247行）。tracked sourceのみでは 566 insertions / 180 deletions。`OperationCenter.tsx` は英字eyebrow 1行の削除とコメント追加のみ（dialog shellへの最小変更）。

品質確認として、`ReservationWizard` が参照するCSS module class 27件すべてがstylesheetに存在し、逆に未参照の `wizard*` dead CSSが0件であることも確認済み。

---

## 8. 実行したvalidationと結果

| コマンド | 結果 |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS（unit 19 / contract 80 / PII safety） |
| `npm run build` | PASS（15 routes） |
| `npm run test:maintenance` | PASS（`ok: true`） |
| `npm run test:a11y` | Chromium **8幅 × 45 states = 360 screenshots**、axe / horizontal overflow / 44px未満control / legacy purple / console error / 5xx **すべて 0**。最終buildで 1440×900・390×844 を再確認し `ok: true` |
| `node --test tests/contract/source-of-truth-guard.test.mjs` | PASS |
| `node --test tests/contract/operator-light-ui.test.mjs` | PASS |
| `node --test tests/contract/reservation-create-adapter.test.mjs` | PASS（上記3本で計14 tests） |
| `git diff --check` | clean |

検証済みviewport（Chromium、各45 states）: 1440×900 / 1366×768 / 1194×834 / 1024×768 / 768×1024 / 390×844 / 375×812 / 320×800

harnessは全contextを `reducedMotion: "reduce"` で実行するため、reduced motion時の描画も全stateで確認済み。320px / 375px幅が200% zoom相当のreflowを担保する。

### 追加の実測検証

ビルド後の実アプリで測定:

```
resolvedBodyFont : "M PLUS 2", "M PLUS 2 Fallback", "Hiragino Sans",
                   "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif
mplus2Loaded     : true
1111111111 vs 0000000000 : 幅差 0.00px（.tabular-nums 有無どちらでも）
```

body の `palt` 有効下でもtabularが維持されることを確認した。

### testを弱めていないことの確認

`tests/contract/operator-light-ui.test.mjs` のfont pinを IBM Plex → M PLUS 2 へ**同等の強度で張り替え**た（`M_PLUS_2` と weight配列を必須、`IBM_Plex_Mono` を禁止、Inter / Roboto / Noto Sans JP / BIZ UDPGothic / Zen Kaku / Murecho の禁止を維持・拡張、`--font-figure` の解決先と `palt` off を必須化）。

さらに検証を**2件追加**（contract 78 → 80）:

- wizardが単一dominant columnと常時記録を保つこと（2 zone grid、`wizardContext`/`wizardChecks` の消滅、`display:none` の不在、8段階の存在と順序、`aria-current`、非色依存の状態、map の `filter: none` と実geometry、確認stepの必須項目）
- 操作できない状態にalert色を使わないこと（`保存前チェック` と `data-ok=` の不在）

既存assertionの削除・弱体化は行っていない。

---

## 9. backend境界の最終確認

`git diff --name-only` に対しパス単位で確認し、すべて **EMPTY**。

```
src/app/api          EMPTY
src/lib              EMPTY
package.json         EMPTY
package-lock.json    EMPTY
supabase             EMPTY
middleware.ts        EMPTY
next.config.ts       EMPTY
vercel.json          EMPTY
.env                 EMPTY
```

- backend adapter / server action / repository / hookのデータ取得・保存logic / contract type / API payload / database schema・migration: 変更なし
- authentication / session / Basic認証、notification / LINE / email、Stripe / payment: 変更なし
- env / credential / Vercel設定: 変更なし
- **新規dependency: 0**
- Productionに対する POST / PUT / PATCH / DELETE: **0**。business data mutation: **0**
- 保存ボタンは押していない。demo利用はbrowser-localで完結
- legacy `website/src/components/admin/VipFloorDashboard.tsx` は参照・編集していない

旧clone `/home/kokoro/projects/clients/ghost_vipapp` はセッション開始時と同一の4ファイル変更のまま**未変更**（`HEAD=08ecb1f`）。既存の未commit差分を上書きしていない。

---

## 10. Codexへ渡すbackend課題

**なし。** 今回の改善はすべてfrontendで完結し、backend変更を要する箇所は発生しなかった。

---

## 11. commit / deploy状況

### Claude Codeが実行したこと

Claude Code自身は **commit / push / pull request / Vercel deploy / Production alias変更 / env変更 / credential操作 / DB操作 / provider操作 / business data mutation を一切実行していない**。指示どおり成果はlocal source編集とdocument作成に留めた。

### 本report執筆中に別sessionが行ったこと（実測で確認）

本reportを書いている最中に、別session（Codex）が本変更をcommitし、originへpushした。Claude Codeの操作ではない。

```
commit    8f7ceee173bf5e33e2258ac5c8f4c9568dc79221
subject   feat(vip): refine advance reservation workspace
author    kokoro <kokoro06152002@gmail.com>
date      Thu Jul 30 19:47:54 2026 +0900
parent    e2ba841f71e0b8ef56104a1713098211cf9aaa20
files     8 files changed, 813 insertions(+), 180 deletions(-)
branch    codex/vip-manager-production-light-ui-20260727
push状態  local と origin/codex/vip-manager-production-light-ui-20260727 が
          ともに 8f7ceee（ahead / behind なし）＝ push済み
```

commitの内容は本作業の8ファイル（変更7 + 研究doc）と完全に一致し、想定外のファイルは含まれていない。

```
docs/ui/OPERATIONS_PAPER.md
docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md
src/app/globals.css
src/app/layout.tsx
src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css
src/components/admin/vip-floor-v2/operations/OperationCenter.tsx
src/components/admin/vip-floor-v2/operations/ReservationWizard.tsx
tests/contract/operator-light-ui.test.mjs
```

### Vercel Production — Codexが反映済み

**Claude Codeはdeploy操作を一切実行していない。** その後Codexが同一commitをProductionへ反映した（`docs/AI_WORK_LOG.md` の該当行による）。以下は2026-07-30時点の初回反映記録であり、現行Productionは冒頭の最終追記を正とする。

```
candidate/fixed  dpl_CZtSaZhCASxpM97jLnFk91ksaTZt  （READY、promote済み）
fixed URL        https://ghost-vipapp.vercel.app/
rollback         dpl_G6MDi67A7xNx375cGEFCDG5ghvsq  （READY）
commit           8f7ceee
```

Codex側の検証記録: lint / typecheck / unit19 / contract80 / PII / build15 / maintenance、Chromium 8幅×45=360 states全gate0、desktop・mobileで日付・卓・確認stepを目視PASS。WebKitのみ既知library不足。fixed 6 endpoint=401 / no-store / Basic、runtime error / fatal / 5xx=0。API / lib / payload / date-refetch / version / idempotency / DB / env / lockfile変更0。

未実行として記録されている項目: PIN後のread-only smokeは暗号化env値が取得できず未実行。

### 本ファイルの扱い

本完了報告は `8f7ceee` には含まれていなかったが、後続の正本commitで履歴資料として追跡された。本文中の初回deployment記録は当時のまま保持し、現行状態は冒頭の最終追記と共有statusを正とする。

---

## 12. 残課題・既知制約（正直な申告）

1. **WebKit 1194×834 のgateが実行できない。**
   host libraryの `libwoff2dec` / `libenchant-2` / `libhyphen` / `libsecret-1` 不足でWebKitが起動しない（既知・既存の制約で、本変更に起因しない）。指示に従い **system packageは一切installしていない**。このため `npm run ci` は完走しない。WebKit以外の全legは個別にPASSを確認済み。Safari実機確認はOwner環境での任意確認事項として残る。

2. **`datetime-local` のネイティブ表示はブラウザlocale依存。**
   harness（en-US）では `07/31/2026, 10:00 PM` と表示される。input typeを変えると値の契約に触れるため変更せず、24時間readout（`この予約の時間帯 22:00–00:00 / 2時間`）とsummary barのISO表記（`2026-07-31`）を併記して緩和した。実運用のja-JP環境では24時間表示になる想定だが、ネイティブ描画自体は完全には制御できない。

3. **受付ブロックtab内の `ACTIVE BLOCKS` 英字eyebrowは意図的に残した。**
   新規予約フローの外であり、無関係な `tests/contract/operations-adapter.test.mjs` のassertionに固定されている。スコープを絞るため今回は触っていない。日本語化する場合は当該contract testの張り替えを伴う。

4. **a11y harnessの実行時はport 3312の解放待ちに注意。**
   連続実行すると `EADDRINUSE :::3312` で失敗することがある（前回runのserverがsocketを保持）。`A11Y_PORT` で回避できる。本作業中の一時的な失敗はすべてこれが原因で、UI変更に起因する回帰ではないことを確認済み。

---

## 13. 次アクション

本変更は既にProduction（`https://ghost-vipapp.vercel.app/`）へ反映済みのため、残るのは事後確認のみ。

1. Ownerが固定URLで実画面を確認 — 特に **新しいfont（M PLUS 2）の日本語可読性**、白基調の見え方、新規予約8段階の操作性を夜間の実機（laptop / iPad）で確認
2. 意図と合わない場合は `dpl_G6MDi67A7xNx375cGEFCDG5ghvsq` へrollback
3. PIN後のread-only smokeが未実行のまま残っているため、必要ならOwner sessionで実施
4. WebKit 1194×834のgateはhost library不足で未実行。Safari実機確認はOwner環境で任意実施

### 未解決として引き継ぐもの

- WebKit gate（§12-1）
- `datetime-local` のlocale依存表示（§12-2）
- 受付ブロックtabの `ACTIVE BLOCKS` 英字eyebrow（§12-3）
