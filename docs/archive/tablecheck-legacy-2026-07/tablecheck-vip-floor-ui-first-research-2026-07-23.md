# TableCheck VIP Floor UI-first research

Date: 2026-07-23 JST  
Status: research and design decision only; UI implementation 0  
Directive: `docs/evidence/vip-floor-v2/ui-first-sequencing-owner-directive-v1-20260723T025829+0900.json`  
Directive SHA-256: `8dba8f141970c8e4de9e0695372f0535c4689ca84feb47ce0af2ed3184e07649`

## 1. Decision

Gate CをHOLDのまま維持し、現行Gate C/V18 workspaceとは別のbranch/worktreeで、ローカルfixtureだけを用いてVIP Floorの全UIを先に完成させる方式を採用候補とする。

ここでいう「全UI完成」は、desktop/mobileの全画面、全状態、全command surface、keyboard/touch、loading/empty/stale/error/conflict、visual regression evidenceまでを含む。一方で、実API、認証、capability判定、feature flag、database/provider、実mutation、production route切替、deployは含まない。UI完成後の正しい終端名は `UI_FIRST_IMPLEMENTATION_COMPLETE_AWAITING_GATE_C_INTEGRATION` であり、Gate D/E PASSではない。

この分離により、納期リスクを下げつつ次を同時に守れる。

- V17 checkpointとV18 proposal/promptのbyte lineageを変更しない。
- Gate Cのapplication source immutable条件を現在のworkspace内で破らない。
- UIの判断をバックエンド待ちにせず、型付きfixtureで先に閉じる。
- Gate C PASS後はtransport/auth adapterだけを差し替え、UIを作り直さない。

## 2. 調査対象と一次資料

### 2.1 TableCheck公式

| 対象 | 一次資料 | 確認した業務文法 |
|---|---|---|
| 予約管理 | https://www.tablecheck.com/ja/join/features/reservation-management/ | 店内レイアウトと同じフロア画面、予約・進行状況の一覧性、自動配席、結合テーブル、ステータス管理、時間軸チャート、ドラッグ操作、予約ブロック |
| 予約・テーブル管理 | https://www.tablecheck.com/ja/join/features/reservation-and-table-management/ | 1画面での予約作成、入力削減、顧客・予約情報の集約 |
| Manager現行配布面 | https://play.google.com/store/apps/details?id=com.tablecheck.manager | desktop/mobile、floor/list/chart、mobile wizard、dark/light運用面の現在性 |
| floor画像 | https://support-restaurants.tablecheck.com/hc/article_attachments/49375244205209 | 細いglobal rail、日付/service ribbon、大きなfloor canvas、右予約rail |
| chart画像 | https://support-restaurants.tablecheck.com/hc/article_attachments/56703438272025 | table row × time column、現在時刻線、予約bar、未割当/例外tray |
| list画像 | https://support-restaurants.tablecheck.com/hc/article_attachments/28236576453273 | sticky/fixed column、検索、sort、export、status scan |
| detail画像 | https://support-restaurants.tablecheck.com/hc/article_attachments/23639555229721 | 顧客と予約のsplit detail、tab、密度の高いfield group |

公式画像は一時閲覧だけを行い、repositoryには保存しない。TableCheckの名称、logo、文言、screen pixels、CSS、font、DOM、icon、顧客データは一切再利用しない。再利用対象は情報設計、操作順、密度、pane構成だけである。

### 2.2 GHOSTローカル資料

- `website/AGENTS.md`
- `website/docs/ui/UI_TOOLKIT.md`
- `website/docs/design-references/vip-floor-tablecheck/source-manifest.md`
- `.Codex/docs/DESIGN.md`
- `src/app/globals.css`
- `src/components/admin/VipFloorDashboard.tsx`
- `src/components/admin/vip-floor/*`
- `src/lib/vipFloorV2Contract.ts`
- `src/data/vipSeats.ts`
- `src/data/vipSeatHotspots.ts`
- `public/media/images/vipmapv3.9239fd2174.webp`
- `docs/evidence/vip-floor-tablecheck/current-admin-v1-preview-1440.png`
- `docs/evidence/vip-floor-tablecheck/current-admin-v1-preview-390.png`

### 2.3 実装・アクセシビリティ一次資料

- Next.js Server/Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Focus Not Obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum

ローカルのNext.js 16.2.10 docsも照合し、page/layoutはServer Componentを維持し、interactivityが必要な境界だけClient Componentへ限定する方針を採る。

## 3. TableCheckから抽出するもの、捨てるもの

### 採用する業務文法

1. **Map-first**: 実フロア図を中央の主役とし、予約railとinspectorを同時に読む。
2. **三つの作業軸**: floor、time chart、dense listを同じ選択状態で切り替える。
3. **Selection linkage**: map node、chart bar、list row、queue item、inspectorが同一予約を指す。
4. **Time is spatial**: chart上で開始・終了・turnover・block・現在時刻を空間として把握する。
5. **Exception first**: 未割当、遅延、no contact、capacity conflict、payment/refund reviewを通常予約より早く見つける。
6. **Action proximity**: 対象詳細の近くに状態変更・割当・時間変更・note・cancelを置く。
7. **Mobile task reduction**: desktop三分割を縮小せず、mobileではlist-first、bottom sheet、step wizardへ再構成する。
8. **High information density**: cardの数ではなくrow、rail、separator、sticky header、tabular numeralsで密度を作る。

### 採用しない表現

- TableCheck固有のbrand、logo、blue、font、icon、copy、screenshot、table geometry。
- current v1の白いSaaS canvas、青いprimary accent、marketing photo rail。
- generic hero、KPI card pile、nested card、large radius、blur-heavy glass、purple/blue orb、bokeh。
- statusを色だけで示す設計。
- desktop三分割をmobileへ縦積みしただけの設計。
- DnDしか代替操作のない配席、hoverしか情報が見えないhotspot。

## 4. Current UI gap

現行`VipFloorDashboard`は、実フロア図、予約選択、右inspector、queueを既に持ち、操作モデルの基礎は良い。しかし、次が目標との差分である。

| 現状 | 問題 | UI-firstでの解決 |
|---|---|---|
| white/blue SaaS surface | GHOST Osakaのvenue identityが最初のviewportで弱い | black-violet lacquer、champagne hairline、実mapを主役にする |
| 一枚の巨大Client Component | bundle、再描画、責務、testabilityが悪化 | Server shell + narrow interactive islands + view modelへ分離 |
| map/list中心 | chartが不足し時間競合を空間把握できない | table × time chartを第一級viewとして追加 |
| cardが多い | 情報量の割に視線移動が多い | row、rail、split pane、sticky gridへ置換 |
| v1 APIとpreview mutationが混在 | UI-firstで誤networkの可能性 | network-ineligible fixture gatewayを型とstatic scanで保証 |
| mobileはstack主体 | primary taskとactionがfirst viewportから外れる | list-first + bottom action + drawer/wizardへ別layout化 |
| Inter使用 | 既存GHOST type systemと不一致 | 既存Barlow Condensed/Noto Sans JP、tabular numeralsへ統一 |
| color-heavy status | 非色覚・dark surfaceで判別しづらい | label、icon、edge pattern、shape、textを併用 |

## 5. 採用するart direction

### 名前

**GHOST Operational Lacquer**

### Design Read

> GHOST OsakaのVIPフロア責任者向け運用コックピット。TableCheckのmap-first・時間軸・予約railという業務文法を使い、GHOST固有の黒紫ラッカーとシャンパン金属で再構成する。

### Signature element

実VIPフロア図を「予約状態が流れる座標面」として扱う。table nodeは装飾ではなく、table code、capacity、次の予約時刻、現在status、lock/block、選択方向を一目で示す。map、chart、list、queue、inspectorの選択が常に連動することを、この画面の固有性とする。

### Visual density dials

- `DESIGN_VARIANCE = 3`: 独自性はlayoutとmaterialで出し、業務操作は予測可能に保つ。
- `VISUAL_DENSITY = 9`: 高密度。ただしseparatorとtypographic hierarchyで読ませる。
- `MOTION_INTENSITY = 2`: 140–240msの状態遷移だけ。scroll theaterやfloating effectは使わない。

### Material system

| Role | Direction |
|---|---|
| canvas | `#07040D`系のblack-violet、純黒一色にしない |
| raised pane | violet-black lacquer、blurなし、value差で階層化 |
| border | champagne metal 1px、重要境界だけ |
| primary | champagne/ivory、blue primaryを使わない |
| live selection | champagne edge + local LED trace、面全体を発光させない |
| success | muted emerald + check/text |
| warning | warm amber + triangle/text |
| danger | oxblood/red + icon/text |
| info | steel/lilacではなくivory/neutral text |
| typography | Barlow Condensed + Noto Sans JP、数字はtabular |
| radius | 2–8px、pillはstatus/tagだけ |
| shadow | pane separationに必要な短いdark shadowのみ |

## 6. Layout model

### Desktop 1440+

```text
┌────┬─────────────────────────────────────────────────────────────────────┐
│ 56 │ business date / service / status / search / global command ribbon │
│ px ├───────────────┬──────────────────────────────┬──────────────────────┤
│nav │ queue / alerts│ floor | chart | list         │ inspector / commands │
│rail│ 260–300       │ elastic primary workspace    │ 336–384               │
│    │               │                              │                      │
└────┴───────────────┴──────────────────────────────┴──────────────────────┘
```

- primary workspaceが常に最大面積を取る。
- left/right paneはcollapse可能だが、selection stateは失わない。
- floorではmapを主役、chartでは時間軸を主役、listではcolumnsを主役にする。
- topにmarketing copy、welcome card、generic KPI cardsを置かない。
- first viewportだけでGHOST Osaka、営業日、現在service、予約運用、主要actionが分かる。

### Tablet 768–1279

- nav railはicon + accessible labelへ縮小。
- queueとinspectorは同時固定せず、片側drawerとして切替。
- floor/chart/listの主workspaceは常に残す。
- chartの横scrollはchart region内だけで許可し、page水平scrollは禁止。

### Mobile 320–767

```text
┌──────────────────────┐
│ date / service / sync│
├──────────────────────┤
│ exceptions / search  │
├──────────────────────┤
│ list-first work area │
│ floor grid or chart  │
├──────────────────────┤
│ fixed primary action │
└──────────────────────┘
          ↓ select
     bottom sheet/detail
          ↓ complex edit
       step wizard
```

- 最初のviewportに「本日のVIP予約」「例外」「主要action」を残す。
- mapは写真を縮小するだけでなく、table gridとpan/zoom mapを用途別に選べる。
- detailはbottom sheet、複雑な変更はfull-screen wizard。
- 重要targetは44pxをGHOST基準とし、WCAG 2.5.8の24px minimumを余裕を持って超える。
- fixed footerやsheetがkeyboard focusを隠さない。

## 7. View specification

### Floor

- GHOST所有の`vipmapv3`と`vipSeatHotspots`を利用する。
- nodeはtable code、capacity、current/next reservation、status、lock/blockを持つ。
- occupied、arriving、late、available、blocked、resettingをlabel/icon/edgeで区別する。
- click/tap、keyboard focus、queue selection、chart/list selectionが同じinspectorを開く。
- DnDは補助操作。必ず「移動先を選択」command palette/listの代替を持つ。

### Chart

- row = table、column = 15分、business operating windowを表示。
- reservation bar、turnover buffer、block、延長、現在時刻線、conflictを表示。
- zoom 15/30/60分、今日へ戻る、section filter、unassigned trayを持つ。
- virtualizedまたは`content-visibility`を用い、visible range外の描画を抑える。

### List

- sticky header、sort、filter、search、column densityを持つ。
- 固定優先列は時刻、status、public code、guest、table、exception。
- long Japanese/English labelsをellipsisだけで失わず、accessible full nameを提供する。
- 50行超はvirtualizationまたはwindowingを検討し、pagination cardにはしない。

### Queue

- late/no contact、unassigned、arrival soon、payment/refund review、seat overdueを先に並べる。
- group countとseverity labelを併記し、色だけに依存しない。
- 通常予約は時刻順。選択は全viewに伝播する。

### Inspector

- Overview、Guest、Service、Payment、Notes、History tabs。
- PII fixtureは実在しない明白なdummyだけを使い、defaultはmasked表示。
- commandはstatus transition、assignment、schedule、extension、block、note、walk-in、cancel/refund decision、customer editのUIを完成させる。
- destructive commandはreason、影響、confirmation、undo不可情報を明示する。

## 8. State and fixture contract

UI-first専用のfixture contractは`VipFloorBoardV2`とcommand typesへcompile-timeで従う。実APIの形を推測して新しいfieldを足さず、UI-only metadataは別`UiViewModel`に分離する。

必須scenario:

- healthy mixed service
- opening empty
- loading skeleton
- stale/reconnecting
- read error/retry
- no capability/read-only
- masked customer
- late/no contact
- partial arrival
- checked in/bottle pending/bill requested/paid/resetting
- unassigned
- connected tables
- table locked
- reservation block
- capacity warning
- version conflict
- table time conflict
- cancellation/refund review
- long Japanese/English labels
- dense 50+ reservation stress case

`FixtureCommandGateway`はmemory stateだけを変更し、`fetch`、XHR、WebSocket、EventSource、Server Action、provider SDK importを持てない構造にする。command resultはsuccess、validation error、version conflict、capacity override、network-like delay simulationを決定的に再現するが、network callは0である。

## 9. Architecture decision

```text
preview Server page (fixture selection only)
  └─ server-rendered shell and initial board
      └─ VipFloorWorkspaceClient
          ├─ view model/store
          ├─ FloorView (lazy)
          ├─ TimelineView (lazy)
          ├─ ReservationListView (lazy)
          ├─ QueueRail
          ├─ Inspector
          └─ Command flows / mobile sheets
```

- route/pageはServer Componentを維持する。
- client boundaryはworkspace interactionへ限定する。
- chart/listなど大きいviewは既存依存だけでdynamic importする。
- filter/searchは`useDeferredValue`またはtransitionでurgent inputを塞がない。
- fixture boardからclientへ渡すfieldは必要最小限にする。
- UI-first routeはproductionで到達不能にし、local validation専用とする。
- `globals.css`へ広域変更せず、`vip-floor-v2` scopeまたはCSS Moduleで閉じる。
- 新規dependency、package/lock変更、font downloadを禁止する。

## 10. Accessibility and interaction gate

- semantic button、tab、grid/table、dialog/drawerを使う。
- icon-only controlにvisible tooltipとaccessible nameを持たせる。
- `:focus-visible`をchampagne 2px以上で明示し、sticky paneやsheetがfocusを隠さない。
- map/table selectionはkeyboardで到達・実行できる。
- DnD、pan、swipeにはsingle-pointer/click alternativeを持つ。
- 重要mobile controlは44×44px以上、最低でもWCAG 2.5.8を満たす。
- statusは色 + text + icon/shapeで示す。
- `prefers-reduced-motion`ではtransform animationを無効化し、状態変化は即時または短いcrossfadeにする。
- live regionは保存結果やconflictだけに限定し、常時更新で読み上げを洪水化しない。
- modal/sheetはfocus trap、Escape、return focusを保証する。

## 11. Performance gate

Target:

- LCP ≤ 2.5s
- INP ≤ 200ms
- CLS ≤ 0.1
- initial client bundleに三view全部を同梱しない
- floor mapは既存最適化済みassetと寸法を使いlayout shiftを防ぐ
- dense list/chartのfilter中もkeyboard inputをblockしない

UI-firstでは実network timingを評価しない。評価対象はclient bundle構成、render cost、interaction responsiveness、layout stabilityである。実データfetchとcacheはGate C PASS後のintegration gateで別途計測する。

## 12. Anti-AI visual gate

次のどれかが見つかればvisual reviewはREJECTとする。

- gradient orb、floating translucent stack、glass blur、bokeh。
- generic navy/white/blue SaaS palette。
- 12px超の大radiusが反復する。
- dashboard topのKPI card pile。
- 内容のない説明copyやAI風marketing headline。
- ほぼ同じcardが均等gridで並ぶ。
- 実floor mapより装飾backgroundの面積が大きい。
- status colorが多すぎて意味を失う。
- TableCheck screenshotのpixel-level imitation。
- desktopを縮小しただけのmobile。

## 13. Risks and controls

| Risk | Control |
|---|---|
| Gate C frozen sourceを汚す | dedicated branch/worktree、current workspace write 0、hash preflight |
| fixture UIが実contractと乖離 | exact `vipFloorV2Contract.ts` seed、compile-time exhaustive mapper |
| mock commandが実APIを誤呼出 | network-ineligible gateway、static forbidden-import/fetch scan |
| UI完成をGate D PASSと誤記 | terminal labelを固定し、Gate D/E start 0をevidence化 |
| TableCheckの模倣が過剰 | public workflow grammarだけ、GHOST asset/tokens/copyのみ |
| dark luxuryが読みにくい | contrast/focus/status non-color gate、dense hierarchy review |
| huge Client Component再発 | file/ownership map、narrow client islands、lazy heavy views |
| mobileが後付け | mobile list-firstをfloor desktopと同じmilestoneで実装 |
| new dependencyでlock汚染 | dependencies 0、package/lock immutable |

## 14. Conclusion

UI先行は可能であり、納期上も有効。ただし「現行Gate C workspaceでUIを書き始める」のではなく、V17 checkpointとV18 sibling lineageを保存したisolated trackで、contract-accurate fixture UIを完成させる必要がある。

TableCheck寄りにすべき本質は、白青の見た目ではなく、floor/chart/list/detailが一つの選択状態で結ばれた運用速度である。GHOSTらしさは黒紫ラッカー、シャンパン金属、実フロア図、抑制したLED、濃密なoperational railから生む。これがAI感を消し、圧巻さを業務の明快さに結びつける最短経路である。
