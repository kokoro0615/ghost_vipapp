# VIP Manager Apple Surface / Font Refinement — Geometry Comparison

## 結論

最終安定ビルドの Chromium 計測では、指定された 5 viewport × 46 state（230 結果）について、レイアウト契約は before と一致した。閾値は prompt 指定どおり 1 px のままで、追跡 landmark 1,966 件は全座標・全寸法が完全一致、操作 control 5,233 件は最大 0.5 px のサブピクセル差に収まり、1 px 超過は 0 件だった。

今回の変更は表面・文字組みの refinement であり、二カラム構成、Inspector、List row、Floor / Chart、wizard、mobile bottom navigation、dialog、breakpoint、DOM 順序、scroll ownership の変更は検出されなかった。

## Evidence

- Before machine artifact: [`vip-before-geometry.json`](./vip-before-geometry.json)
- After machine artifact: [`vip-after-geometry.json`](./vip-after-geometry.json)
- Baseline notes: [`VIP_BASELINE.md`](./VIP_BASELINE.md)
- Source commit: `9d2957c240b5fece1197767b37dea1ae6c746bdc`
- Browser: Chromium (`/usr/bin/google-chrome`), `prefers-reduced-motion: reduce`
- Fixture: `scripts/a11y-visual.mjs` と読み取り専用 geometry instrumentation
- Manifest: `scripts/light-ui-qa-manifest.mjs`
- After source hashes:
  - `src/app/globals.css`: `cbfa6869b12f1ad1f084a4f574dfcd06bae9151b25b3720224b370c79968d438`
  - `src/app/layout.tsx`: `7a38d46568eb24b619c4c84fd1c31e953af6e79b10276ae66a1366091adf63e6`
  - `src/components/admin/vip-floor-v2/VipFloorWorkspace.module.css`: `f6c70d0a98b250469591f0eca14725991c37f4b811552e80c74f210c3cc5601c`

46 state は manifest 必須 45 state に `reservation-date-unavailable` を加えた集合である。List / Floor / Chart は各 view が解決した後に採寸した。

## 5 viewport 比較

| Viewport | Landmark matched | Landmark 最大差 | Control matched | Control 最大差 x / y / w / h | 1 px 超過 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440 × 900 | 386 | 0 px | 1,163 | 0.234 / 0 / 0 / 0 px | 0 |
| 1194 × 834 | 386 | 0 px | 1,163 | 0.234 / 0 / 0 / 0 px | 0 |
| 768 × 1024 | 398 | 0 px | 976 | 0.500 / 0 / 0.484 / 0 px | 0 |
| 390 × 844 | 398 | 0 px | 978 | 0.484 / 0 / 0.484 / 0 px | 0 |
| 320 × 800 | 398 | 0 px | 953 | 0.484 / 0 / 0.484 / 0 px | 0 |
| **計** | **1,966** | **0 px** | **5,233** | **0.500 / 0 / 0.484 / 0 px** | **0** |

`masthead`、`toolbar`、`mainWorkspace`、`primaryPane`、`inspector`、`listHeader`、`listRows`、`floorStage`、`chartStage`、`queue`、`wizardActive`、`wizardAside`、`mobileNav`、各 dialog を landmark として追跡した。1194 px は desktop、768 px は mobile の既存 breakpoint 挙動を維持している。

特に狭い 320 × 800 の `demo-expired` は、panel が before / after とも `(x=16, y=192.921875, w=288, h=462.15625)`、logout がともに `(x=41, y=586.078125, w=238, h=44)` で一致した。

## Content と typography

List / Inspector / Login の body text、Inspector text、geometry element count は 5 viewport 全 15 組で完全一致した。全 body text の相違は `loading`、`error`、`command-walk-in-cancel` の実行時刻だけで、各 viewport 3 件、計 15 件だった。

Typography metric は 7,805 件を照合し、文字幅変化 477 件、文字高変化 240 件、最大 intrinsic width 差 14.563 px を記録した。これは font / optical sizing / letter spacing / 小文字サイズの意図した変化を含む。重要なのは、追跡 container / row の新規 wrap は 0 件で、親レイアウト座標は変化していない点である。

## Accessibility / overflow gate

230 結果の集計は次のとおり。

| Gate | 件数 |
| --- | ---: |
| axe violations | 0 |
| horizontal overflow | 0 |
| 44 px 未満の重要 control | 0 |
| 旧 purple chrome | 0 |
| console errors | 0 |
| server 5xx | 0 |

DOM 上の Inspector 本文は check-in、arrival、service、guest、meta を含み、`display:flex`、`opacity:1`、非 clipping を確認した。

## 200% 相当監査

### A. 1440 physical / 720 CSS page-zoom equivalent

Chromium DevTools の actual page zoom を QA harness から固定できなかったため、1440 × 900 physical pixel を 200% page zoom したときに相当する 720 × 450 CSS viewport を独立して確認した。対象は同一 fixture の List、menu、Walk-in、demo-expired の 4 state。

この範囲は合格した。

- document width は 4 state とも 720 px で、horizontal overflow は 0。
- axe、重要 control 44 px、旧 purple chrome、console error、server 5xx はすべて 0。
- List の logout / reception / menu、menu の close / logout / bottom navigation、Walk-in の dialog close / reception-block tab、demo-expired の logout は viewport 内に存在した。
- Walk-in の残りの form action は、意図された command form scroll owner（client `720 × 344`、scroll `720 × 1250`）で到達可能。
- demo-expired は document height 498 px の縦 page scroll を持つが、logout は `y=368.578125..412.578125` で初期 450 px viewport 内に存在した。
- List の reception が disabled なのは fixture の業務状態であり、zoom による到達不能ではない。

自動 clipping 候補には、1 × 1 px の visually-hidden `予約検索`、画面外の live status、`overflow:visible` の line-box rounding が含まれた。これらは実表示の切断としては数えていない。

### B. `html { font-size: 32px }` surrogate

これはブラウザの text-only zoom と同等ではないため、正式な 200% 合否には使用しない。アプリには px 指定が多く、root font-size を倍化してもすべての文字・control が同率で拡大されない。

List、menu、Walk-in では root / body 32 px が適用され、document horizontal overflow 0、主要 action 全件 viewport 内、全 gate 0 だった。ただし `Owner / Owner` の固定幅領域では overflow hidden の候補が現れ、実際の browser text zoom で再確認すべきリスクとして残る。demo-expired は state 再描画後に root / body が 16 px に戻り、32 px 条件を維持できなかったため未検証である。

したがって、A は page-zoom equivalent として合格、B は補助 probe に限定し、WCAG の正式な 200% text-only zoom 合格とは主張しない。

## Screenshot provenance

Geometry collector はリポジトリ内の after screenshot を書き換えていない。途中で build と capture が重なり、font shard `/_next/static/media/2ef7f3a29558b91c-s.woff2` が HTTP 500 を返した screenshot 群は無効化した。DOM 文字列が正しい一方で JPG の一部 glyph が欠けた原因はこの capture race であり、比較 evidence には採用していない。

有効な machine evidence は上記 2 JSON。after の正式 visual screenshot は、安定 build に対して後続の formal visual run が生成・検証したものだけを使用すること。

## 判定範囲

- Geometry / layout contract: **PASS**
- Chromium 5 viewport manifest gate: **PASS**
- 1440 physical / 720 CSS page-zoom equivalent 4-state audit: **PASS**
- Browser text-only zoom 200%: **NOT ESTABLISHED**（root font-size surrogate は限定的）
- WebKit: **NOT RUN**
