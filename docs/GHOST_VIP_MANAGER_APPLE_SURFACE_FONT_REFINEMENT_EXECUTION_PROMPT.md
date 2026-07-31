# GHOST VIP Manager — Apple級の質感・タイポグラフィ改善 Execution Prompt

最終更新: 2026-07-31 JST

対象: `https://ghost-vipapp.vercel.app/`

実行範囲: research → local implementation → local validation

Production deploy: 対象外。Ownerの別途明示承認が必要。

---

## 目的

`https://ghost-vipapp.vercel.app/` のVIP Managerについて、現在のレイアウト、
情報設計、操作導線、業務機能を一切作り替えず、表層の質感とタイポグラフィを
徹底的に改善する。

現状は、フォント、文字ウェイト、tracking、行間、罫線、面の分離、ボタン、
入力欄、状態表現などが「AIが組み立てた管理画面」に見える。

Apple製品ページやiPhoneアプリを直接コピーするのではなく、Appleが持つ以下の
品質をGHOST固有のライトオペレーションUIへ翻訳する。

- 明確な視覚階層
- 精密な光学整列
- 一貫した素材感
- 読みやすく静かなタイポグラフィ
- 操作した瞬間に理解できる反応
- 不要な装飾を置かない簡潔さ
- 細部まで意図が通ったcraft
- ハードウェアとソフトウェアが調和したような統一感

## 最重要の前提

これは「Appleサイトのclone」ではない。

`clone-website` skillはAppleの質感、computed CSS、font、interaction、
responsive behaviorを調査するためだけに使う。

Appleの以下は本番へ持ち込まない。

- Appleロゴ、製品画像、文章、アイコン、映像、SVG、ブランド資産
- Apple固有のページ構成やsignature layout
- SF Symbols
- SF Proファイルのダウンロード、同梱、webfont化
- Liquid Glassの直訳
- Appleの半透明素材やblurの見た目コピー
- Appleを想起させるマーケティング表現

Appleから抽出するのは設計原理と測定可能な視覚特性だけである。

## 正本と現在地

作業開始時に必ず再確認すること。

- canonical worktree:
  `/home/kokoro/projects/clients/ghost/.worktrees/vip-manager-production-light-ui`
- standalone repository:
  `kokoro0615/ghost_vipapp`
- current verified source baseline:
  `9d2957c240b5fece1197767b37dea1ae6c746bdc`
- current verified Production:
  `dpl_D6VxuGnJf6VRuWqoRVRSGweXoCzn`
- fixed URL:
  `https://ghost-vipapp.vercel.app/`
- Website backend:
  `dpl_9Wk7bQ9r2jmWAqz5nje69RUWXG8h`
  — 完全に対象外

ただし、これらは開始時にVercel metadata、Git HEAD、upstreamから再検証する。
記載値を無条件に信用しない。

最初に以下を完全に読む。

1. `/home/kokoro/projects/clients/ghost/AGENTS.md`
2. `/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md`
3. `/home/kokoro/projects/clients/ghost/docs/AI_WORK_LOG.md`の最新行
4. canonical worktreeの`docs/DESIGN.md`
5. `docs/ui/OPERATIONS_PAPER.md`
6. `docs/ui/VIP_MANAGER_LIGHT_RESERVATION_RESEARCH.md`
7. `src/app/layout.tsx`
8. `src/app/globals.css`
9. `src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css`
10. `tests/contract/operator-light-ui.test.mjs`
11. `scripts/a11y-visual.mjs`
12. `scripts/light-ui-qa-manifest.mjs`

`website/src/components/admin/VipFloorDashboard.tsx`はlegacyであり、本UIの正本として
絶対に参照しない。

## Skill最新版確認

実装前に、使用する`clone-website` skillが最新版か検証する。

ローカル:

`/home/kokoro/.agents/skills/clone-website/SKILL.md`

lock:

`/home/kokoro/.agents/.skill-lock.json`

配布元:

`https://github.com/julianromli/ai-skills.git`

`skills/clone-website/SKILL.md`

実行内容:

1. lockのsource URL、skill path、updatedAt、folder hashを確認
2. `git ls-remote --symref`で配布元default branchとHEADを確認
3. `0700`の一時directoryへ配布元をshallow clone
4. local／remoteの`SKILL.md`をSHA-256とbyte comparisonで比較
5. 結果を研究記録へ残す
6. 一時directoryは検証後にtrashへ移動

一致していればそのskillを使用する。

不一致なら、勝手にグローバルskillを上書きしない。local／remote commitと差分を
報告して停止する。

## clone-website skillの使用方法

以下をresearch-only customizationとして使用する。

```text
$clone-website https://www.apple.com/jp/iphone/ https://www.apple.com/jp/iphone-17-pro/
```

重要なoverride:

- pixel-perfectなApple cloneは作らない
- AppleのReact componentを実装しない
- Apple assetをProductionへコピーしない
- Appleの文章やブランド表現を使わない
- skillのReconnaissance、computed-style extraction、font extraction、
  interaction sweep、responsive sweep、visual QA方法だけを使用する
- canonical appへTailwind、shadcn、Radix、CSS-in-JSを導入しない
- skill既定のNext.js＋Tailwind scaffold確認は、このrepositoryでは
  `npm run build`によるcanonical stack確認へ置き換える
- browser automationが利用できなければ、推測で続けず停止する

## Apple公式研究対象

ブラウザで以下を実査する。

- `https://www.apple.com/jp/iphone/`
- `https://www.apple.com/jp/iphone-17-pro/`
- `https://developer.apple.com/design/human-interface-guidelines/design-principles`
- `https://developer.apple.com/design/human-interface-guidelines/typography`
- `https://developer.apple.com/design/human-interface-guidelines/materials`
- `https://developer.apple.com/design/human-interface-guidelines/layout`
- `https://developer.apple.com/design/human-interface-guidelines/accessibility`

Apple製品ページはmarketing surface、HIGはapp interface guidanceとして分離する。
marketingページの巨大文字、余白、scroll演出をoperator UIへ持ち込まない。

## Phase 1 — Appleの質感を測定する

1440px、768px、390pxで調査する。

各対象について以下を取得する。

- full-page screenshot
- section単位のscreenshot
- resolved font-family
- font-size、weight、line-height、letter-spacing
- surface color
- border colorとalpha
- radius
- shadow
- separator
- paddingとcontrol height
- hover、focus、pressed、disabled状態
- sticky／scroll behavior
- transition durationとeasing
- breakpoint
- optical alignment
- iconと文字のbaseline
- heading、body、label、metadata、figureの階層
- dark textの段階数
- interactive controlとcontent surfaceの分離方法

すべて`getComputedStyle()`の実値で保存し、見た目から推測しない。

保存先:

- `docs/research/apple-surface-study-2026-07-31/`
- `docs/design-references/apple-surface-study-2026-07-31/`
- `docs/research/apple-surface-study-2026-07-31/BEHAVIORS.md`
- `docs/research/apple-surface-study-2026-07-31/TYPOGRAPHY.md`
- `docs/research/apple-surface-study-2026-07-31/MATERIALS.md`

Appleのスクリーンショットは研究資料専用とし、Production assetにしない。

## Phase 2 — 現行VIP Managerの原因追究

変更前のcanonical sourceをbuildし、QA fixtureの全stateを使ってbaselineを作る。

最低限:

- desktop 1440×900
- laptop 1194×834
- tablet 768×1024
- mobile 390×844
- narrow mobile 320×800

次を画面別に分析する。

- masthead
- toolbar
- List
- Floor
- Chart
- queue
- Inspector
- command menu
- reservation wizard全8 step
- Walk-in
- staff
- customer
- waitlist
- SLO
- Demo
- login
- empty/error/offline/conflict states

「AI感がある」という主観だけで終わらせない。

以下のcause matrixを作る。

| 症状 | 観測箇所 | computed value | 原因仮説 | Appleとの差 | 改善方針 | layout影響 |
|---|---|---|---|---|---|---|

最低限検証する仮説:

- M PLUS 2のかな、丸み、字面、濃度がoperator UIに合っているか
- 11px／12px文字が細かすぎないか
- 700 weightが多すぎないか
- heading、label、metadataが同じ濃度に見えないか
- uppercase Englishと広いtrackingが機械的に見えないか
- `palt`が日本語の揃いを不安定にしていないか
- `tnum`と通常文の切替が視覚的な継ぎ目を作っていないか
- 日本語とLatin、数字、記号のbaselineが揃っているか
- 罫線が多すぎて画面がform generatorに見えないか
- surfaceの明度差が弱すぎる／強すぎる箇所がないか
- すべてのcontrolが同じ強さに見えないか
- buttonの文字、icon、paddingが光学的に中央か
- focus、pressed、selected、disabledがOS defaultまたはCSS demoに見えないか
- radius、shadow、hairlineが一つのmaterial systemとして整合しているか
- 同じvertical rhythmが続いて機械的に見えないか

原因が実測で確認できるまで実装しない。

## Phase 3 — font bake-off

現行`M PLUS 2`は`docs/DESIGN.md`のLocked Decision L3である。
この依頼を「L3を証拠に基づいて再検討するOwner decision」として
`docs/AI_CURRENT_STATUS.md`へ先に記録する。

ただし、好みだけで変更しない。

現行研究を再現したうえで、最低5候補を比較する。

候補には最低限以下を含める。

1. M PLUS 2（baseline）
2. Apple system stack
   `-apple-system, BlinkMacSystemFont, system-ui`
   ＋日本語fallback
3. Hiragino-first system stack
4. Noto Sans JP（比較対象。採用前提ではない）
5. ライセンスが明確で、日本語coverageと400/500/600/700相当を持つ候補
6. 必要なら追加候補

SF Proをdownload、commit、self-hostしてはいけない。
Apple system fontを使う場合はOS提供fontとしてのみ使用する。

候補ごとに測定する。

- font license
- Productionでの配布可否
- Japanese glyph coverage
- Latin／kana／kanji／数字の統一感
- 400／500／600／700の実在性
- glyph fallbackの有無
- font download size
- FCPへの影響
- 11、12、13、15、18、22pxでの可読性
- actual cap height、x-height、kana height
- line box
- iconとのbaseline
- mixed runs:
  - `4名`
  - `1卓`
  - `¥120,000`
  - `22:30–翌01:15`
  - `VIP-8`
  - `GHO-0726-01`
  - `予約・Walk-in`
  - `プロモーター／集客担当`
- `1111111111`と`0000000000`の幅
- `font-variant-numeric: tabular-nums`の実効性
- 320pxでの長い日本語label
- Windows／Linux fallback
- Apple device上でのresolved font

Apple device／Safariを実行できない場合は、passedと書かずnot runとする。
Apple-native system stackを採用する場合、実iPadまたはmacOS Safariの確認を
Production前の必須witnessとする。

結果を以下へ記録する。

`docs/research/vip-manager-apple-type-surface-study-2026-07-31.md`

採用fontは、単にAppleに似ているものではなく、GHOSTの日本語operator UIとして
最も読みやすく、数字が安定し、AIテンプレート感を減らすものを選ぶ。

mono fontは復活させない。
複数fontを役割別に乱用しない。

## Phase 4 — Apple品質をGHOSTへ翻訳する

AppleのLiquid Glassを直接実装してはいけない。

現行GHOST契約を維持する。

- warm-white canvas
- white working panes
- graphite text/actions
- restrained champagne hairlines
- real venue floor geometry
- dense operator workflow
- no generic SaaS
- no blue accent
- no purple chrome
- no decorative gradient
- no backdrop-filter
- no blur
- no translucent floating card stack
- no nested cards
- no large-radius card grid
- no decorative motion

Appleから翻訳してよいもの:

- hierarchy
- harmony
- consistency
- optical alignment
- concise labels
- text rolesの明確化
- solid materialの段階
- 1px hairlineの精度
- inset separator
- controlとcontentの優先順位
- restrained elevation
- focus／pressed／selectedの明快さ
- iconと文字のweight matching
- motionの短さと自然なease
- contentを邪魔しないchrome
- 操作対象だけが持つ触覚的な質感

質感改善はtokenから行う。

対象候補:

- surface ramp
- ink ramp
- rule alpha
- control border
- focus ring
- action hover／press
- selected state
- disabled state
- `--lift-raised`
- `--lift-dialog`
- small structural radius
- type scale
- line-height
- tracking
- font weight roles
- icon optical alignment
- button内padding

既存のno-glass契約を変えない。
radius ≥12px、pill乱用、shadow stackを導入しない。

## Phase 5 — レイアウト完全固定

「レイアウトはそのまま」を機械的に証明する。

変更禁止:

- 2 column shell
- masthead／toolbar構造
- inspector width
- queue表示条件
- List／Floor／Chart切替
- reservation wizardの2 zone
- 8 stepの順序
- desktop／mobile breakpoint
- bottom navigation
- floor geometry
- chart geometry
- DOM order
- tab order
- scroll ownership
- sticky領域
- chrome budget
- business workflow
- visible operator actions

変更前に以下の`getBoundingClientRect()`を保存する。

- masthead
- toolbar
- main workspace
- primary pane
- inspector
- list header／rows
- floor stage
- chart stage
- queue
- wizard active pane
- wizard summary rail
- mobile bottom navigation

同じstate、viewportで変更後と比較する。

原則:

- x／y／width／height差は1px以内
- container order変更0
- breakpoint変更0
- chrome height変更0
- horizontal overflow 0
- primary actionのviewport内位置を維持
- font変更によるlabel clipping 0
- row wrappingの新規発生0

font metricsのため1pxを超える差が不可避な場合、画面、要素、理由、実測値を
報告し、勝手に許容範囲を広げない。

## Phase 6 — 実装範囲

原則として変更を許可するfrontend／design files:

- `docs/DESIGN.md`
- `docs/ui/OPERATIONS_PAPER.md`
- 新規research文書
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css`
- `tests/contract/operator-light-ui.test.mjs`
- `scripts/a11y-visual.mjs`
- 必要なQA manifest／visual harness

TSXを変更する場合は、class hook、accessible-name、重複文字の是正など
presentation上不可欠な最小差分だけとする。DOM構造やworkflowを変えない。

変更禁止:

- `src/app/api/**`
- `src/lib/**`
- `src/components/admin/vip-floor-v2/state/**`
- `src/components/admin/vip-floor-v2/contract/**`
- Supabase migration
- database
- env
- credentials
- business data
- API payload
- notification
- audit
- revision
- idempotency
- realtime
- package dependency
- Website backend

L3のfont変更に伴い、DESIGN.md、OPERATIONS_PAPER.md、contract testを同じ
change setで更新する。

古いfont assertionを削除してgateを通してはいけない。
新しいfont契約へ置き換え、同じ強度以上で検証する。

## Phase 7 — visual QA

変更前／変更後を同一fixture、同一viewport、同一stateで比較する。

必須before／after:

- List
- Floor
- Chart
- Inspector
- menu
- reservation create steps 1／4／8
- Walk-in
- waitlist
- staff
- SLO
- login
- empty
- conflict
- mobile List
- mobile Walk-in
- mobile menu

確認項目:

- AIテンプレート感が減った根拠
- 日本語の読みやすさ
- 数字列の安定
- 文字の濃度階層
- controlの触覚的な状態差
- surfaceの奥行き
- primary actionの明確さ
- iconと文字のbaseline
- separatorの過不足
- no-glass
- no-gradient
- no generic card grid
- レイアウト不変
- 320pxでのlabel fit
- 200% zoom
- reduced motion
- focus visibility
- color contrast
- non-color status cue

「良くなったと思う」ではなく、before／after画像、computed value、geometry、
font metricsで証明する。

## Phase 8 — Gate

実装後に実行する。

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:maintenance
npm run test:a11y
npm run ci
git diff --check
git diff --name-only -- \
  src/app/api \
  src/lib \
  src/components/admin/vip-floor-v2/state \
  src/components/admin/vip-floor-v2/contract
```

QA state／viewport数は文章から転記せず、manifestから実数を取得する。

期待値:

- lint 0
- typecheck 0
- unit全件pass
- contract全件pass
- PII safety pass
- build全route pass
- maintenance pass
- Chromium全state／viewport:
  - axe 0
  - horizontal overflow 0
  - controls <44px 0
  - legacy purple 0
  - console errors 0
  - unexpected 5xx 0
- protected path diff 0
- `git diff --check` 0

WebKit 1194×834は、この環境では既知のsystem library不足がある。
起動できなければnot runと報告し、passedと書かない。

Gateが失敗した場合:

- assertionを弱めない
- testを削除しない
- scopeを広げない
- sourceを無理に変更して通さない
- 原因と失敗箇所を報告して停止する

## Git／Deployment

このpromptが許可するのは、研究、local実装、local validationまで。

以下は実施しない。

- commit
- push
- Vercel candidate
- promote
- Production alias変更
- env変更
- DB変更

Ownerがbefore／afterを目視確認し、明示承認した場合だけ、
commit → push → aliasless candidate → verify → promoteを別releaseとして行う。

## 完了条件

以下をすべて満たして初めてcomplete。

1. clone-website skillの最新版照合を記録
2. Apple公式page／HIGのresearch artifact完成
3. 現行AI感の原因matrix完成
4. font候補の実測比較完成
5. 採用fontのlicenseとfallbackが明確
6. DESIGN L3変更手続きを完了
7. Apple asset／brand copy 0
8. layout／DOM／breakpoint変更0
9. geometry比較が許容範囲内
10. backend／state／contract source変更0
11. 全local gate pass
12. WebKit結果を正直に報告
13. before／after画像をOwnerが比較可能
14. Production変更0

## 最終報告形式

日本語で以下の順番に報告する。

```text
## 結論
## clone-website Skill最新版確認
## Apple研究結果
## AI感の原因
## Font比較表
## 採用Fontと理由
## 質感の変更点
## レイアウト不変の証拠
## 変更ファイル
## Gate Results
## Before / After
## Appleから採用しなかった要素
## Backend非影響
## 残課題
## Commit / Deploy Status
```

主観的な賛辞ではなく、測定値、画像、diff、QA結果を中心に書く。
