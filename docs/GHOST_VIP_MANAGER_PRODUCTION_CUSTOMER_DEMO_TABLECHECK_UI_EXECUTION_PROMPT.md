# GHOST VIP Manager 本番URL・期限付き顧客デモ・TableCheck-informed白UI 一気通貫実行プロンプト

> Owner standing authorization: 2026-07-27 JST
>
> 固定URL: `https://ghost-vipapp.vercel.app/`
>
> TableCheck観察対象:
> `https://manager.app.tablecheck.com/#/massans-bar/reservations/timetable/2026-07-27`
>
> デモ利用期限: `2026-08-27T23:59:59+09:00`
>
> 実行開始条件: この文書を新規実行sessionへ全文投入する
>
> この文書の作成sessionでは、実装・DB mutation・env変更・deployment・alias変更を行っていない

前回のprompt作成時点では、target URL自体とTableCheck ID loginへのredirectのみ確認し、
認証後のlive Manager再観察は未実施だった。現在はOwnerが既存Chromeのリモートデバッグを許可済みで、
次の実行sessionではそのログイン済みbrowser stateを最初の観察対象として再利用する。
実行sessionは、事前に渡された資格情報を再提出させず、authenticated browser stateで
PII-free read-only観察を一度通してからbuilderを開始する。未認証contextやlogin画面を
TableCheck UIの根拠として扱ってはならない。2026-07-26の認可済みprivate Manager実査、
現行GHOST source/evidence、TableCheck公式資料は補助的な設計根拠として使用する。

あなたはGHOST VIP Managerの期限付き顧客デモを完成させる統括Solである。
以下を唯一の実行指示として扱い、認可済みTableCheck Managerのread-only観察、
GHOST-owned白基調operations UIの仕上げ、同一Production URL内の完全隔離demo data plane、
専用Basic/PIN、synthetic fixture、全操作、QA、staged production build、固定URLへのpromote、
credential handoff、期限失効、rollback、cleanup runbookまで一気通貫で完了すること。

途中報告、調査完了、ローカルbuild、preview READY、手順提示だけで終了してはならない。
全Gateに合格し、固定URLでcustomerがsynthetic dataだけを操作できる状態を完了とする。

---

## 0. Owner決定とstanding authorization

Ownerはこのpromptのexact scopeについて、実行途中の明示承認を再度求めない権限を
統括Solへ付与した。次は承認済みである。

- 認可済みTableCheck Manager sessionのread-only UI観察
- `clone-website` skillを用いた構造、密度、状態、interaction、responsive挙動の抽出
- GHOST VIP Appのisolated branch/worktreeでのコード、test、docs変更
- demo-only Basic/PIN/session、synthetic fixture、local demo store、expiry guardの実装
- 現在chat露出済みのOwner資格情報の安全なrotationとactive session失効
- repo外mode `0600` credential handoffの生成
- lint、typecheck、unit、contract、visual、a11y、production build、E2E
- Vercel Production envの必要最小変更
- `vercel --prod --skip-domain`によるaliasless staged production build
- 全pre-promotion Gate合格後の固定URLへのpromotion
- known-good deploymentへのrollback
- demo資格情報の早期revoke、期限失効、repo外一時artifact cleanup
- branch commit/push、redacted evidence、共有AI status/log更新

このstanding authorizationは、下記の禁止事項を解除しない。

- TableCheck画面、顧客、予約、設定、アカウントへのmutation
- TableCheckのlogo、商標、固有copy、font、icon、画像、screenshot、CSS、DOM dump、
  private API、bundle、customer dataのGit保存または再配布
- GHOST Production Supabaseへのdemo reservation/customer/block/staff/waitlist投入
- GHOST Website/API、Production DB schema、RLS、public bookingの変更
- 実メール、SMS、LINE、Stripe、webhook、provider delivery
- 実顧客PIIの入力、保存、表示、export
- project/database削除、reset、down migration、履歴改変
- secret、PIN、cookie、Authorization、raw customer payloadのconsole、chat、Markdown、Git出力
- 固定URL以外のcustomer-facing URLへの変更

上記境界を超える必要が見えた場合、境界を拡張せず、当該機能をdemo-localで実現する。
それでも不可能な場合だけ、その機能をfail-closed HOLDとし、他の許可済み作業を継続する。

---

## 1. 完了条件

最終状態は次である。

```text
Customer browser
  -> https://ghost-vipapp.vercel.app/
  -> customer専用Basic
  -> customer専用Demo PIN
  -> GHOST-owned warm-white Manager UI
  -> synthetic demo workspace
     List / Floor / Chart / Queue / Inspector
     reservation create/edit
     check-in / arrival / status / assignment / extension / note
     Walk-in / Waitlist / block / staff / customer
  -> browser-local synthetic state only
  -> GHOST Production API / DB / providers: business request 0

Owner browser
  -> 同じ固定URL
  -> rotated Owner Basic
  -> rotated Owner PIN
  -> 現行Production backend/data plane
  -> 既存正式8卓と実運用機能を維持
```

customer demoの「保存」は、そのbrowser profile内のsynthetic workspaceに対する保存を意味する。
Production予約台帳、Production Supabase、外部providerへの保存を意味しない。
これがOwnerの「UI上だけで良い」という決定の実装契約である。

---

## 2. 固定期間と日付契約

### 2.1 access window

- starts at: `2026-07-27T00:00:00+09:00`
- expires at: `2026-08-27T23:59:59+09:00`
- timezone: `Asia/Tokyo`
- business date allowlist:
  `2026-07-27`から`2026-08-27`まで、両端を含む

「一か月」は曖昧なrolling 30 daysへせず、上記exact timestampへ固定する。

### 2.2 expiry behavior

期限後は次を機械的に満たす。

1. demo Basicはpage/API双方でfail-closedする。
2. demo PIN loginとdemo session refreshは失敗する。
3. 開いたままのtabは最大60秒以内にleaseを失い、mutationを停止する。
4. UIは「デモ期間が終了しました」と表示し、Production dataへfallbackしない。
5. local synthetic workspaceは次回load時にpurgeする。
6. Owner laneは影響を受けない。
7. demo credentialをOwner credentialとして受理しない。

ローカルsynthetic dataは個人情報ではないため、期限時にbrowserへremote deleteを強制できないことを
security gapとして扱わない。ただしTTL metadataを必須とし、次回起動時に必ずpurgeする。

---

## 3. 正本、baseline、rollback anchor

開始時に全文を読む。

- `/home/kokoro/projects/clients/ghost/AGENTS.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_AGENT_SYNC.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_CURRENT_STATUS.md`
- `/home/kokoro/projects/clients/ghost/docs/AI_WORK_LOG.md`の最新行
- `/home/kokoro/projects/.Codex/docs/DESIGN.md`
- `website/AGENTS.md`
- `website/docs/ui/UI_TOOLKIT.md`
- `docs/GHOST_VIP_MANAGER_SPEC.md`
- `docs/GHOST_VIP_MANAGER_IMPLEMENTATION_PLAN.md`
- `docs/GHOST_VIP_MANAGER_IMPLEMENTATION_AUDIT_2026-07-26.md`
- `docs/evidence/trial-exit-production-light-ui-2026-07-27/10-final/FINAL_QA_ACCEPTANCE.md`
- `docs/evidence/trial-exit-production-light-ui-2026-07-27/10-final/COMPLETION_AUDIT.md`
- 本prompt

開始時点のknown-good:

| 対象 | known-good |
|---|---|
| fixed VIP deployment | `dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf` |
| VIP evidence tip | `45a0063` |
| VIP runtime source | `47653b883e6b670c5f16329013576aeca5387bd5` |
| fixed Website deployment | `dpl_Gj89YEqt6KSnxaL1fcatCpQ2Y75e` |
| Website evidence tip | `397e821` |
| Website runtime source | `ff7c6097371bdcb1789468dc7b7eec1448d6e0c7` |
| Production Supabase | `cpfsrwctjymhmwvsbwdi` |
| Production migration head | `20260726205147` |
| active/UI tables | exact `VIP-1`〜`VIP-8` |

これらはhistorical inputであり、実行開始時にread-onlyでlive値を再取得する。
driftがあれば最新current deployment/sourceをbaseline manifestへ記録し、既知anchorも保持する。
既存のuncommitted changeを上書きせず、同じpathへ別writerを置かない。

### 3.1 変更しない完成済み範囲

- Production Website/API contract
- Production Supabase schema/data
- official `VIP-1`〜`VIP-8` geometry
- owner Production session/backend transport
- provider-OFF safety
- public booking write 403
- completed backup/restore、migration、cleanup evidence
- inactive historical table/reference rows

demoのために完成済みProduction data planeを再実装、再migration、seed、refactorしない。

---

## 4. `clone-website` skillの適用方法

この実行では`clone-website` skillを必ず使用する。ただしskillのdefaultよりOwnerとworkspaceの
指示が優先する。

### 4.1 採用するskill要件

- browser automation必須。Chrome DevToolsを第一選択、次にOrca、最後にPlaywright。
- desktop / tablet / mobileを観察する。
- page topology、interaction model、state、computed layout、responsive差を記録する。
- component specを実装前に書く。
- foundationを先に固定する。
- 複雑なcomponentは小さなwriter laneへ分割する。
- buildを常にcompile可能に保つ。
- 実装後にvisual QA diffを行う。

### 4.2 明示的に上書きするskill default

次は行わない。

- real TableCheck content/assetsのdownload
- verbatim copy
- TableCheck font/favicon/meta/logo/icon/SVG/image/videoの再利用
- TableCheck CSS class、DOM、private API、bundleの保存
- PIIを含み得るfull screenshotのrepository保存
- TableCheck screenshotをbuilderへ渡す
- TableCheck pixelそのものをGHOSTへ貼る

fidelityの意味は次に限定する。

> layout hierarchy、information density、pane relationship、selection linkage、
> reservation workflow、state visibility、keyboard/touch behavior、responsive task modelを
> 高忠実度で再現し、brand、copy、assets、data、exact visual identityはGHOST-ownedへ置換する。

---

## 5. TableCheck Manager read-only観察プロトコル

対象:

`https://manager.app.tablecheck.com/#/massans-bar/reservations/timetable/2026-07-27`

認証情報をchat、file、terminal、logへ要求または出力しない。
Ownerが事前に用意したlogged-in browser stateをそのまま使用する。

### Gate OBS-0 — authenticated session

1. browser tabsを列挙し、既存のTableCheck Managerタブ（または同じlogged-in context）を特定する。
2. Chrome DevTools/CDP connectorを再起動・再接続し、target URLと同じauthenticated contextを選択する。
3. `manager.app.tablecheck.com`のshellが表示されること、店舗名と対象日だけを確認する。
4. login formへredirectされた場合、disk/chatからsecretを探索せず、別の既存ログイン済みタブ/targetを再確認する。
5. authenticated targetが取得できない場合だけ`HOLD_AUTHENTICATED_REFERENCE_OBSERVATION`とし、実装・deployへ進まない。
6. build dispatchはauthenticated live observationが一度成功するまで開かない。
7. credentialの再提出をOwnerへ求めない。browser connectorの再起動または既存sessionの引き継ぎだけを行う。

### Gate OBS-1 — privacy

- raw screenshot保存先はrepo外mode `0700`のtemporary directoryだけ。
- customer name、phone、email、notes、reservation codeは取得時にblur/maskする。
- accessibility snapshotを保存する場合、data row textを除外する。
- DOM抽出はshell、toolbar、header、button、pane、row geometryだけ。
- networkはmethod、path pattern、status、resource typeだけ。request/response body、token、cookieは読まない。
- observation終了後、redacted measurement/specだけをGitへ残し、raw artifactを削除する。
- privacy scanner 0件をGateにする。

### Gate OBS-2 — non-mutating interaction sweep

操作してよいもの:

- List / Floor / Chart等のview切替
- navigation、date controlのvisual state確認
- reservation rowのselectとInspector open/close
- create/edit formのopen、tab、step、dropdown、cancel/close
- search/filter/sortの一時操作
- collapse/expand、zoom、hover、focus、keyboard navigation
- responsive viewport切替

操作してはいけないもの:

- submit/save/confirm/delete/cancel reservation
- check-in/status変更
- drag/dropによる実予約/卓/時刻変更
- block作成/更新/削除
- waitlist call/seat/cancel
- customer/staff/POS/payment操作
- online受付ON/OFF
- notification送信
- account/settings変更

mutationに見えるcontrolがopenと同時に即時更新する可能性がある場合、clickせず、
accessible label、computed style、既存公式資料だけからspec化する。

### Gate OBS-3 — required states

次を最低限観察する。

- shell / global rail / venue identity
- business date / day navigation / service period
- timetable/chart grid、time header、table row、reservation bar、block、unassigned tray
- floor canvas、table node、reservation rail、waitlist/finished/block/staff tab
- list table、sticky header、sort/search/filter/export位置
- reservation create/edit shell、step/field/action hierarchy
- reservation/customer split detail、tabs、history
- loading、empty、selected、hover、focus、disabled、conflict/warningのvisual grammar
- 1440×900
- iPad landscape 1194×834
- tablet portrait 768×1024
- mobile 390×844
- narrow mobile 320×800

### OBS artifacts

repositoryへ残せるのは次だけ。

- `docs/research/tablecheck-informed-demo/PAGE_TOPOLOGY.md`
- `docs/research/tablecheck-informed-demo/BEHAVIORS.md`
- `docs/research/tablecheck-informed-demo/STATE_MATRIX.md`
- `docs/research/tablecheck-informed-demo/RESPONSIVE_MATRIX.md`
- `docs/research/tablecheck-informed-demo/components/*.spec.md`
- `docs/research/tablecheck-informed-demo/PROVENANCE.md`

これらはGHOST用抽象specとし、TableCheckのverbatim copy、PII、screenshotを含めない。

---

## 6. 公式資料との照合

live observationを次のTableCheck公式資料で照合する。

- [直感的な予約管理 — Floor / Chart / block](https://www.tablecheck.com/ja/join/features/reservation-management/)
- [予約作成と顧客情報を一画面で管理](https://www.tablecheck.com/ja/join/features/reservation-and-table-management/)
- [TableCheck operations / seating / Door Waitlist](https://www.tablecheck.com/en/join/features/enhance-operations/)
- [2026-06-30 スタッフテーブル割り当て機能](https://www.tablecheck.com/ja/join/about-us/press/2026630tablecheck/)
- [TableCheck API components — waitlist / booking / CRM / POSの機能境界](https://tablecheck.atlassian.net/wiki/spaces/API/pages/44859761/Components)
- [TableCheck Terms — trademark / IP / service specification boundary](https://www.tablecheck.com/en/join/terms/)

Vercel release手順は次の公式資料とCLI helpを照合する。

- [Deploying a staged production build](https://vercel.com/docs/cli/deploying-from-cli)
- [Promoting deployments](https://vercel.com/docs/deployments/promoting-a-deployment)
- [Instant rollback](https://vercel.com/docs/instant-rollback)
- [Deployment Protection](https://vercel.com/docs/deployment-protection)

公式資料とlive UIが異なる場合、current live observationをinteraction/layoutの正本とする。
ただしTableCheck固有brand/data/assetはどちらからもコピーしない。

---

## 7. GHOST-owned白基調UI contract

### 7.1 non-negotiable

- `color-scheme: light`
- warm-white canvas
- white pane
- graphite text/action
- restrained champagne hairline/selection
- real GHOST floor-plan geometry
- dense operational grid
- no dark nav/pane
- no purple/blue chrome
- no decorative gradient
- no glassmorphism
- no bokeh/orb
- no translucent floating card stack
- no stock SaaS card pile
- no large radius
- no soft shadow as primary separation

現行のlight UIを全面破棄しない。auditしてtargeted deltaだけを実装する。
現行`src/app/globals.css`の青系focus token、login/maintenanceの大きなsoft shadow、
map/tableの装飾shadowは、厳格なwhite/champagne contractへ合わせて局所修正する。

### 7.2 token contract

既存OKLCH tokenを使い、以下のsemantic roleを維持する。

| role | direction |
|---|---|
| canvas | warm white、paneよりわずかに沈む |
| pane | pure/near white |
| sunken/grid | warm neutral、blue gray禁止 |
| primary text | graphite |
| secondary text | warm neutral graphite |
| action | graphite fill + white text |
| hairline | restrained champagne/neutral metal |
| selection | pale champagne、blue tint禁止 |
| focus | dark champagne/bronze、3px以上、blue禁止 |
| success | muted green + text/icon |
| warning | ochre + text/icon |
| danger | restrained red + text/icon |

色値は最終computed auditで確定するが、TableCheck paletteのcopyではなくGHOST tokenとして
命名、管理する。statusは色だけで伝えず、text、icon、border cueを併用する。

### 7.3 geometry and density

- global rail: 52〜60px
- service ribbon: 50〜58px
- primary important targets: 44px以上
- dense data row: 40〜48px
- inspector width desktop: 340〜400px
- exception/queue rail desktop: 260〜320px
- radius: 原則0〜6px
- grid/table borderは1px hairline
- tabular numeralsをtime、guest count、table code、revisionへ使用
- selectionはmap/chart/list/queue/inspectorで同期
- nested cardsを作らず、pane、row、rail、separatorで構成する

### 7.4 first viewport

最初のviewportで次が即座に分かる。

- `GHOST OSAKA`
- `VIP Manager`
- business date
- selected view: List / Floor / Chart
- synthetic demoであること
- primary action: 予約作成
- operational context: reservation/arrival/table

demo cueはnav labelだけでなく、service ribbonとloginにも非色依存で表示する。

### 7.5 desktop/tablet/mobile

Desktop:

- queue rail + primary List/Floor/Chart + Inspectorの同時運用
- sticky header、固定table label、time axis、exception tray

iPad landscape:

- primary workspaceを維持し、queue/Inspectorをcollapsibleにする
- important target 44px
- hover依存を作らない

Mobile:

- List-first
- Floor/Chartへ直接到達可能
- Inspectorはbottom sheet
- create/edit/check-in/blockはstep wizard
- primary actionをfirst viewportへ固定
- desktop三paneを単純縦積みしない
- horizontal page overflow 0
- 320pxで長い日本語labelが重ならない

---

## 8. demo authentication architecture

### 8.1 two independent access lanes

outer Basicは二組をconstant-timeで検証する。

1. `owner` lane:
   - existing Production owner behavior
   - rotated Owner Basic
   - Production PIN/backend session
2. `demo` lane:
   - customer専用temporary Basic
   - demo-only PIN
   - local signed demo session
   - Production backend tokenを持たない

middleware/proxyはclientが送ったlane headerを必ず削除し、検証済みBasicから
internal request headerを再生成する。client-supplied `owner` / `demo` claimを信頼しない。

### 8.2 required env names

値をdocs/logへ出さない。

```text
VIPAPP_BASIC_USER
VIPAPP_BASIC_PASSWORD
VIPAPP_DEMO_ENABLED
VIPAPP_DEMO_BASIC_USER
VIPAPP_DEMO_BASIC_PASSWORD
VIPAPP_DEMO_PIN_SALT
VIPAPP_DEMO_PIN_SCRYPT_VERIFIER
VIPAPP_DEMO_SESSION_HMAC_SECRET
VIPAPP_DEMO_WORKSPACE_ID
VIPAPP_DEMO_STARTS_AT
VIPAPP_DEMO_EXPIRES_AT
VIPAPP_DEMO_DATA_VERSION
```

`NEXT_PUBLIC_*`へsecret、PIN hash、workspace secretを置かない。

### 8.3 demo PIN/session

- Node `crypto.scrypt`と`timingSafeEqual`を使用する。
- raw PINはserver envへ置かず、salt + verifierだけを設定する。
- PINは8桁以上のrandom numericまたは同等entropyとする。
- login rate limitを実装する。
- demo sessionはHttpOnly、Secure、SameSite=Strict。
- claimは`mode=demo`、`role=owner-compatible-demo`、`workspaceId`、`iat`、`exp`、`jti`。
- cookieはowner session cookieと別名にする。
- owner laneはdemo cookieを無視/clearする。
- demo laneはowner cookieを無視/clearする。
- demo laneのsession routeは`ghostAdminFetch`を絶対に呼ばない。
- demo roleをProduction `owner` tokenへ交換しない。

UI permission計算ではdemo operatorに全demo operationを許可してよいが、
server/data transportのmode判定はroleではなくsigned `mode=demo`で行う。

### 8.4 lease

- `/api/admin/demo/lease`を同一originに設ける。
- session、lane、enabled、start、expiryをserver timeで検証する。
- mutation直前にleaseを確認する。
- open tabは最大60秒間隔でrenewする。
- offline、401、410、expiredでdemo mutationを停止する。
- Production backend/APIへproxyしない。

---

## 9. demo data plane

### 9.1 storage choice

Production database、staging database、mock backend serviceを使わない。
customer browserの`localStorage`に、単一versioned envelopeとしてsynthetic stateを保存する。

推奨namespace:

```text
ghost-vip-demo:<workspaceId>:<dataVersion>:<businessDate>
```

envelopeは次を持つ。

- schemaVersion
- dataVersion
- workspaceId
- businessDate
- seededAt
- expiresAt
- boardRevision
- tables
- reservations
- assignments
- blocks
- notes
- waitlist
- staff
- customers
- auditHistory

auth token、Basic、PIN、HMAC、Production ID、real customer dataを保存しない。

### 9.2 transport boundary

現在のProduction `fetch` pathを壊さず、transport interfaceを導入する。

- `production transport`: current same-origin API behaviorを維持
- `demo transport`: browser-local repositoryだけを使用

session responseのsigned modeを見て一度だけtransportを選択する。
demo mode中にproduction transportへfallbackしてはならない。
demo store error時はdemo workspaceをerror/read-onlyにし、Production boardを読まない。

CustomerPanel、ObservabilityPanel等のdirect fetchもtransport callbackへ寄せ、
demo modeに残るbusiness fetchを0にする。

### 9.3 mutation semantics

demo mutationは完成済みProduction contractと同じ意味を持つ。

- idempotency key
- entity version
- board revision
- stale version `409`相当
- table/time conflict
- block conflict
- invalid state transition
- audit history
- optimistic UI後の確定/rollback

localStorageの単一envelopeをclone → validate → mutate → revision bump → one writeで更新する。
複数tab同期は`BroadcastChannel`を使用し、revision gap時はfull reloadする。

### 9.4 reset

customerがデモを繰返せるよう、明示的な「デモデータを初期状態へ戻す」を提供する。

- confirm dialog
- synthetic workspaceだけをreset
- Owner/Production cookie、data、APIへ触れない
- reset actionもdemo auditへ残す

---

## 10. synthetic fixture contract

### 10.1 table geometry

- official GHOST `VIP-1`〜`VIP-8`だけを使用する。
- `T1`〜`T8`、Trial、canary、control tableを作らない。
- existing real floor-plan bitmap/geometryを再利用する。
- TableCheck venue geometryをコピーしない。

### 10.2 fixture privacy

- guest label: `デモゲスト001`等
- public code: `DEMO-...`
- email: `@example.invalid`だけ
- phone: 常に空
- staff: `デモスタッフA`等
- note: 明確なsynthetic運用文だけ
- real-looking name、phone、email、payment、social IDを使わない

demo formは以下をserver/client双方のshared validatorで拒否する。

- phone-like sequence
- `@example.invalid`以外のemail
- `DEMO` / `デモ` cueのない自由名
- secret/tokenらしい文字列
- 既知の実顧客値

PII-like inputは保存前に拒否し、何が許可されるかを日本語で表示する。

### 10.3 scenario baseline

最低限次を用意する。

| business date | scenario |
|---|---|
| 2026-07-27 | busy night、複数予約、late、arrived、seated、unassigned |
| 2026-07-28 | check-in、arrival correction、Waitlist、Walk-in |
| 2026-08-01 | online-only/all-operations block、table conflict |
| 2026-08-08 | staff assignment、customer profile、history |
| 2026-08-27 | expiry-day、sparse board |

その他のallowlist日はdate seedからdeterministicにempty/sparse/normalを生成する。
allowlist外日付はUIとstore双方で拒否する。

---

## 11. customerへ許可するdemo操作

全てsynthetic local stateだけを対象に許可する。

### Views

- date navigation
- List
- Floor
- Chart
- search
- status filter
- sort
- density
- timeline zoom
- queue/Inspector collapse
- map/list/chart/queue/Inspector selection linkage

### Reservation

- create
- edit
- schedule change
- guest count change
- table assignment/reassignment/unassignment
- source/status change
- cancel/no-show/completed相当のservice status
- note
- conflict/retry

### Arrival/service commands

- check-in
- arrival time
- service status
- table assignment
- seat extension
- note

### Operations

- Walk-in create
- Waitlist create
- Waitlist call
- Waitlist expire
- Waitlist cancel
- Waitlist seat/link
- block create
- block update
- block cancel
- repeat block。ただしrepeat resultもallowlist window内だけ
- staff create/update
- staff table assignment
- customer synthetic profile edit
- customer attributes
- reservation/customer unlink/relink

### Recovery

- stale version conflict
- table conflict
- block conflict
- offline/read-only
- realtime revision gap
- reset to baseline
- logout/login

### 明示的に許可しないもの

- email/SMS/LINE notification
- Stripe/payment/refund
- provider/webhook
- public booking
- CSV/Excel/customer export
- image upload
- real customer search
- real Production observability mutation
- account/settings/role change
- TableCheck mutation

notification buttonが必要な場合は「デモ送信（実送信なし）」としてlocal auditだけを作り、
network deliveryを0にする。

---

## 12. 実装構造

targeted file構造の例:

```text
src/lib/demo/
  access.server.ts
  session.server.ts
  contract.ts
  fixtures.ts
  repository.ts
  transport.ts
  validation.ts

src/components/admin/vip-floor-v2/
  demo/
    DemoCue.tsx
    DemoResetDialog.tsx
    DemoExpiryBoundary.tsx

src/app/api/admin/demo/lease/route.ts
```

既存component treeと命名を先に確認し、不要なdirectory増加は避ける。
重要なのはpath名ではなく、次のboundaryである。

```text
Basic lane
  -> signed session mode
  -> transport choice
  -> owner: Production API
  -> demo: local synthetic repository
```

demoのために既存API routeへ多数の条件分岐を散らさない。
access/session/transport boundaryへ集約し、UI componentは可能な限り同じcontractを使う。

---

## 13. Agent編成

`clone-website` skillのbuilder dispatch原則に従い、実装sessionでは最大3つのwriter laneを
並行利用してよい。Solを含め同時稼働数は環境上限を超えない。

| lane | owner | scope |
|---|---|---|
| Research/Spec | Terra | browser read-only observation、redacted topology/behavior/component spec |
| Demo/Auth | Terra | dual Basic、demo PIN/session/lease、local repository/transport/tests |
| UI/QA | Terra | white UI delta、TableCheck-informed workflows、visual/a11y/E2E/release evidence |

規則:

- foundation/auth/transport contractはSolが先に固定する。
- same pathのwriterは1人だけ。
- builderへTableCheck screenshot、PII、credentialを渡さない。
- builder promptは1componentおおむね150行以下。
- builderはtarget spec本文、target path、acceptanceをinlineで受け取る。
- 各writerは`変更差分 / validation / Gate / blocker`だけを返す。
- Solはagent差分を無条件mergeせず、source、test、privacyを再確認する。
- subagentが利用不能でも同じWaveを順次実行し、品質Gateを削らない。

---

## 14. 実行Wave

### Wave D0 — source freeze and release lock

1. shared status/log、repo dirty state、current branchを確認する。
2. Orca-managed worktreeなら`orca`を使用する。CLIがなければ既存isolated worktreeを保護して使う。
3. current fixed VIP deployment/source/tree、Vercel project/teamをread-only取得する。
4. Website deployment、Production DB counts、provider sent/pendingをread-only snapshotする。
5. envは名前と存在だけinventoryし、値を出力しない。
6. known-good rollback deploymentへ認証可能であることを確認する。
7. current Owner credentialがchat露出済みであることをPII-free riskとして記録する。
8. release lockを宣言する。
9. `docs/evidence/production-customer-demo-2026-07-27/`へredacted manifestを開始する。

Gate D0:

- exact source/deployment/rollbackが追跡可能
- unrelated dirty changeを巻き込まない
- Production DB mutation 0
- alias/env mutation 0
- secret出力 0

### Wave D1 — read-only reference extraction

Section 5のOBS-0〜3を実行する。
各component specを実装前に書く。

必須spec:

- shell and service ribbon
- global rail
- queue/exception rail
- List
- Floor
- Chart
- Inspector
- reservation wizard
- command center
- Waitlist
- block
- staff
- customer
- mobile bottom sheet/wizard
- demo login/cue/expiry/reset

Gate D1:

- authenticated observation成功
- TableCheck mutation 0
- raw PII repository 0
- raw screenshot repository 0
- spec completeness 100%
- GHOST-owned replacement明記

### Wave D2 — tests-first demo contract

実装前にcontract testを追加する。

必須negative tests:

- demo Basicでowner laneへ入れない
- owner Basicでdemo PINを使えない
- spoofed lane headerは無効
- demo cookieをowner routeで使えない
- owner cookieをdemo routeで使えない
- expired demoは401/410
- allowlist外日付は拒否
- demo modeから`ghostAdminFetch` 0
- demo mutationから`/api/admin/vip-floor` business request 0
- Production origin/ref/tokenをdemo bundle/storeへ含めない
- real-looking PIIを拒否
- external delivery request 0
- dataVersion mismatchはsafe reset

必須positive tests:

- demo Basic + demo PIN login
- session/lease/logout
- all views
- all allowed operations
- version/revision/conflict
- BroadcastChannel refresh
- reset
- expiry purge
- Owner Production path regression

Gate D2:

- testsが意図した理由でRED
- Production baseline testは引き続きPASS
- security boundaryがtestで実行可能

### Wave D3 — dual-lane auth

1. middleware/proxyへ二組のBasicを追加する。
2. internal lane headerをoverwriteする。
3. demo session cookie/signature/expiry/leaseを実装する。
4. opposite lane cookieをignore/clearする。
5. rate limitとconstant-time verifyを実装する。
6. demo session routeからProduction backend callを除外する。
7. Owner pathのresponse/cookie/API contractを不変にする。

Gate D3:

- D2 auth tests PASS
- owner regression PASS
- secret client bundle 0
- cross-lane access 0
- expired fail-closed PASS

### Wave D4 — local demo repository and fixtures

1. Production contractに適合するsynthetic fixtureを作る。
2. versioned localStorage envelopeを実装する。
3. production/demo transportを分離する。
4. all allowed operationsをlocal semanticsで実装する。
5. idempotency、version、revision、conflict、auditを実装する。
6. multi-tab refreshを実装する。
7. PII validatorを実装する。
8. reset/TTL purgeを実装する。
9. direct-fetch componentをtransport callbackへ寄せる。

Gate D4:

- customer journeyがrefresh後も同じbrowserでpersist
- demo business network request 0
- Production DB/provider baseline delta 0
- allowlist外日付 0
- synthetic-only privacy PASS
- Owner path regression PASS

### Wave D5 — TableCheck-informed GHOST UI delta

1. current light UIとD1 specのgap mapを作る。
2. gapのあるcomponentだけを小さく修正する。
3. List/Floor/Chartのselectionとnavigationを統一する。
4. create/edit/command/block/Waitlist/staff/customerのaction hierarchyを統一する。
5. strict warm-white/white/graphite/champagneへtokenを修正する。
6. blue focus、dark pane、soft shadow、large radiusを除去する。
7. desktop/tablet/mobileのtask modelを実装する。
8. demo cue、expiry、resetをfirst-class operational stateとして統合する。

Gate D5:

- white major surface audit PASS
- purple/blue chrome 0
- dark major pane 0
- generic SaaS card pile 0
- first viewport contract PASS
- 44px targets PASS
- horizontal page overflow 0
- selection linkage PASS

### Wave D6 — local full validation

影響範囲のtarget test後、full CIを一度だけ行う。

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:a11y
```

visual matrix:

- Chromium 1440×900
- Chromium 1366×768
- Chromium 1194×834
- Chromium 1024×768
- Chromium 768×1024
- Chromium 390×844
- Chromium 375×812
- Chromium 320×800
- WebKit iPad landscape 1194×834

states:

- demo login
- List/Floor/Chart
- queue/Inspector
- create/edit
- each command
- Walk-in
- Waitlist
- block
- staff
- customer
- loading/empty/offline/read-only/error
- conflict
- reset
- near-expiry/expired
- owner login/regression

Gate D6:

- lint/typecheck/test/build PASS
- axe actionable finding 0
- console error 0
- unexpected 4xx/5xx 0
- page overflow 0
- undersized important control 0
- privacy scanner 0
- client secret scan 0
- demo business network 0

### Wave D7 — aliasless staged production candidate

1. Owner Basic/PINをrotateし、active Owner sessionを失効する。
2. demo Basic/PIN/HMAC/salt/workspace IDを生成する。
3. repo外mode `0700` directoryにmode `0600` handoffを保存する。
4. Vercel Production envへ必要値を設定する。値をlogへ出さない。
5. `GHOST_VIP_TRIAL_MODE=false`を維持する。
6. `GHOST_ADMIN_API_ORIGIN`を変更しない。
7. Website/Supabase envを変更しない。
8. staged production buildを`--prod --skip-domain`で作る。
9. generated deployment URLでowner/demo双方をE2Eする。
10. deployment log 5xx、console、network ledgerを確認する。

Gate D7:

- alias未変更
- candidate READY
- owner Production smoke PASS
- demo full journey PASS
- demoからProduction business request 0
- Production DB/provider delta 0
- credential file mode 0600
- secret output 0

### Wave D8 — production promotion

全D0〜D7 GateがPASSした場合だけ一度実行する。

1. fixed URLのcurrent deploymentを再確認する。
2. unexpected deployment/alias driftがないことを確認する。
3. candidateをProductionへpromoteする。
4. fixed URLがcandidateへ解決することを確認する。
5. unauthenticated 401、owner Basic、owner PIN、owner board、logoutをsmokeする。
6. demo Basic、demo PIN、all three views、create/edit/check-in/block/reset/logoutをsmokeする。
7. demo network ledgerを取得しbusiness request 0を確認する。
8. Website/Public/DB/provider baselineを再照合する。
9. unexpected 5xx/console errorを確認する。

Gate D8:

- fixed URL exact candidate
- owner path PASS
- demo path PASS
- Production DB delta 0
- provider sent/pending delta 0
- Website alias unchanged
- public booking write 403
- credential cross-lane 0

### Wave D9 — handoff, expiry and cleanup

Ownerへ値をchatへ貼らず、repo外handoff pathと項目名だけを報告する。

handoffには次を含める。

- fixed URL
- demo Basic username/password
- demo PIN
- exact expiry JST
- allowed operations
- prohibited PII/external delivery
- reset方法
- logout方法
- early revoke方法
- expiry後の挙動
- Owner rotated credential

cleanup runbook:

1. `2026-08-27T23:59:59+09:00`にcode-level expiryが発効する。
2. `2026-08-28T00:15:00+09:00`までにfixed URLでdemo 401/410をwitnessする。
3. demo credential envを削除/rotateしたnew staged production buildを作る。
4. owner-only candidateをsmokeしてpromoteする。
5. demo session/Basic/PINが無効であることを再確認する。
6. repo外demo credential handoffをsecure deleteする。
7. redacted expiry evidenceだけを残す。

自動expiryは実装必須だが、将来のexternal automation作成は必須にしない。
Orca/Vercel scheduled taskを作る場合は、現在のOwner authorityの範囲内で、
secretをpromptへ埋め込まず、disabled dry run→review→enableの順にする。

---

## 15. release safety and rollback

### rollback trigger

次のいずれかで即rollbackする。

- owner login/board/mutation regression
- demo credentialでProduction dataが見える
- demo actionがProduction API/DB/providerへ到達
- Website/public booking behavior drift
- fixed URL 5xx
- authentication bypass/cross-lane
- secret/client bundle leak
- unexpected dark/purple/blue major UI
- 320/390/768/1194でprimary action不能
- expiry fail-open

### rollback order

1. demo credentialを早期revoke可能な状態へする。
2. known-good VIP deployment
   `dpl_CvFzDDArUGR8j7QyAUtXG9cQ6gxf`へrollbackする。
3. fixed URL解決を確認する。
4. owner auth/board/logoutを確認する。
5. Production DB/provider/public baselineを確認する。
6. failed candidateを再promoteしない。
7. exact causeをredacted evidenceへ記録する。

rollbackはcode rollbackであり、Production DB rollbackを行わない。
今回のdemoはProduction DB mutation 0なので、DB compensationは発生してはならない。

---

## 16. anti-loop規則

1. 同じfailureへのretryは最大2回。
2. 3回目の前に原因を一つのtargeted probeで特定する。
3. contract mismatch、auth policy、checksum、privacy findingはretryしない。
4. transient network、Vercel observability delayだけをbounded retryする。
5. mutation結果が不明な場合、再送せずreadbackする。
6. completed Gateを時刻更新のために再runしない。
7. full CIは最終統合時に一度。途中はtargeted validation。
8. 60秒以上のcommandは進捗を出す。
9. raw logをMarkdownへ貼らない。
10. blockerが1 laneだけなら他laneを継続する。

---

## 17. Definition of Done

すべてPASSで完了。

| # | requirement |
|---:|---|
| 1 | fixed URLがnew Production candidateへ解決 |
| 2 | Owner rotated Basic/PIN pathが正常 |
| 3 | customer demo Basic/PIN pathが正常 |
| 4 | demo期限が2026-08-27 23:59:59 JST exact |
| 5 | allowlist dateが2026-07-27〜2026-08-27 exact |
| 6 | List/Floor/Chartが直接到達可能 |
| 7 | reservation create/editがlocal persist |
| 8 | check-in/arrival/status/assignment/extension/noteがlocal persist |
| 9 | Walk-in/Waitlist/block/staff/customerがlocal persist |
| 10 | selection/version/revision/conflict/resetが正常 |
| 11 | official GHOST `VIP-1`〜`VIP-8` geometryのみ |
| 12 | demo business requestからProduction API/DB/provider call 0 |
| 13 | Production DB row/provider sent/pending delta 0 |
| 14 | Website deployment/alias unchanged |
| 15 | public booking write 403維持 |
| 16 | TableCheck mutation 0 |
| 17 | TableCheck asset/brand/copy/screenshot/PII repository 0 |
| 18 | strict warm-white/white/graphite/champagne UI |
| 19 | dark/purple/blue major chrome 0 |
| 20 | desktop/iPad/tablet/mobile visual/a11y PASS |
| 21 | important target 44px、overflow 0、axe 0 |
| 22 | lint/typecheck/test/build/full visual PASS |
| 23 | staged production smokeとrollback rehearsal PASS |
| 24 | mode600 credential handoff完成 |
| 25 | expiry/revoke/cleanup runbook完成 |
| 26 | redacted evidence、README、shared status/log更新 |

最終terminalは次のどちらかだけ。

- `PRODUCTION_CUSTOMER_DEMO_COMPLETE`
- `ROLLED_BACK_TO_KNOWN_GOOD`

OBS-0だけが外部browser state不足で残る場合、実装・deployへ進まず、
`HOLD_AUTHENTICATED_REFERENCE_OBSERVATION`とする。ただしcredential再提出は求めず、
どのbrowser connector/sessionが必要かだけを一行でhandoffする。

---

## 18. final report

最終報告は簡潔に次を含める。

1. terminal outcome
2. fixed URLとexact deployment ID
3. source commit/tree
4. demo window
5. allowed operations
6. owner/demo lane isolation結果
7. Production DB/provider delta
8. UI/visual/a11y/build結果
9. credential handoff file path。値は書かない
10. rollback anchor
11. expiry witness/cleanupのexact next action
12. known residual。なければ`none`

実装session終了前に、GHOST shared protocolに従い
`docs/AI_WORK_LOG.md`へcompact rowを追加し、`docs/AI_CURRENT_STATUS.md`を更新する。
