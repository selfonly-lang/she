> 2026-10-26 原型 v2 更新 / Prototype v2 update
> 保留原 SHE React 雜誌體驗：全幅人物封面、扇形人物卡、人物帶、底部章節切換與全屏個人專頁。新增功能分配至「人物誌」「動態媒體」「精品選物」「我的專頁」，不使用長頁面一頁式。按鍵採香檳金層次、細金屬邊框、柔光玻璃、滑動高光及按壓回饋。
> The React magazine preserves the original full-bleed cover, fan, rail, chapter transitions and personal editions. Added capabilities live in dedicated chapters, not a stacked landing page. Buttons use champagne-metal layers, fine borders, soft glass, highlights and press feedback.
> v2 已通過 21 項 React DOM 及 13 項整合 DOM 檢查；仍未完成實際瀏覽器、手機或無障礙驗證。

# SHE 國際女性人物平台｜系統規劃與介面規格
# SHE International Women’s Platform — Product & System Blueprint

版本：獨立互動原型 v1，2026-10-24。此文件不是正式上線完成證明。
Version: isolated interactive prototype v1, 2026-10-24. Not a production completion certificate.

## 1. 專案定位 / Positioning
SHE 獨立服務女企業家、佳麗、模特兒、創作者、專業人士、讀者及合作品牌。核心流程為探索 → 理解人物 → 追蹤／收藏 → 合作邀請 → 持續經營。FOBI 是獨立業務；其佳麗可以自行註冊，不包含任何賽事管理、資料匯入、共用登入或後台。
SHE independently serves entrepreneurs, pageant talent, models, creators, professionals, readers and brands. Discover → understand → follow/save → invite → maintain a personal presence. FOBI is separate; its participants may register independently. No contest operations, roster imports, shared sign-in or administration.

### 假設與待確認 / Assumptions and open decisions
- 首階段成人會員、一帳號一主要人物頁；跨語言共享人物 ID。未成年機制另案設計。
- 成人政策、營運法人、服務地區、正式條款、刪除期限、客服 SLA、會員配額及第三方服務費尚待確認。
- 正式原始碼、部署權限、既有會員服務、登入供應商與資料權限尚未取得或驗證。
- Adult launch, one primary profile per member, stable identity across translations. Minors require a separate consent and protection design.
- Entity, operating regions, legal terms, retention, support SLA, quotas and provider costs remain open.
- Production repository, deployment access, member services, providers and permissions are unverified.

## 2. 現況盤點 / Current-state inventory
已透過唯讀 HTTP 取得 SHE 首頁及公開前端資產：顯示 React 模組、雜誌封面與人物、選物、服務、輕奢名片、工作台入口，以及外部資料呼叫。不能據此確認真實會員登入、訂單、後台審核或資料安全是否完成。
Read-only HTML and public assets indicate React modules, magazine and personal-page UI, selection/services, calling cards and workspace entry points, with external data requests. This does not verify live authentication, orders, administration or security.

正式開發前取得：儲存庫與分支、套件版本、部署流程、API 契約、資料模型、既有 URL、登入能力、授權素材及備份策略。優先漸進擴充；不要強制重建。
Before integration inspect repository/branch, versions, deployment, APIs, schema, URLs, identity, rights and backups. Prefer incremental integration over an assumed rebuild.

## 3. 網站地圖 / Sitemap
- Home：本期封面、人物、編輯焦點、影音概念、活動與加入入口。
- Discover：搜尋、身分、語言、排序；Following：本機關注清單。
- Journal / Article：作者、日期、來源標示與長文閱讀。
- SHE TV：字幕、播放暫停介面；原型為圖片動態，非影片。
- Gatherings：活動資訊與消息登記概念，不含交易。
- Profile：三種版型、故事、作品、合作入口、自述標示。
- Join：建立測試帳號、測試碼、複選身分、版型。
- Studio：總覽、專頁、內容、合作邀請、設定、審核沙盒。
- Guide / Blueprint / Privacy：範圍、文件及資料控制。
- Existing women/catalog/admin/studio/s/c routes: inventory and preserve or redirect during production integration; not altered in this preview.

## 4. 註冊與會員流程 / Registration and membership
語言 → Email → 驗證 → 身分 → 版型 → 草稿 → 預覽 → 送審 → 核准。國際使用者不需要台灣手機、地址、身分證或 LINE。原文姓名、公開名稱、國籍、居住地、語言與時區分開管理。
Language → email → verification → roles → template → draft → preview → review → approve. No Taiwanese ID, address, phone or LINE dependency. Separate legal/original name, display name, nationality, residence, language and time zone.

正式登入：先驗證己美與 LINE 能力，Email 流程獨立可用；Google/Apple 後續評估。驗證身分後才能綁定；不可按相同姓名或未驗證 Email 合併。恢復登入使用限時單次憑證與不洩露帳號存在的回應。換 Email 重新驗證，支援撤銷工作階段、停用、刪除、敏感角色 MFA。
Live identity: inspect SELF/LINE; email must work independently. Evaluate Google/Apple later. Link verified identities only. Recovery needs expiring single-use tokens and non-enumerating responses. Re-verify email changes, support session revocation, deactivation, deletion and MFA for sensitive roles.

本原型沒有密碼、寄信、所有權驗證或真實工作階段；246810 是公開測試碼。己美／LINE 按鈕僅說明待串接。
No passwords, email, ownership proof or secure sessions in this prototype. 246810 is a public demo code. SELF/LINE buttons explain that integration is pending.

## 5. 專頁版型與模組 / Profile templates and modules
- Editorial：人物故事優先，平衡人物圖與敘事。
- Portfolio：作品優先，更大的影像與作品排序。
- Professional：專業標題、服務與合作入口優先。
三者共享同一資料，不因切換版型刪除內容。原型可選故事、作品及合作模組。真實影片、作品上傳、服務細節、媒體報導與數位名片將沿既有能力盤點後擴充。
All share one model; template changes never delete content. Prototype toggles story/gallery/contact modules. Live media, uploads, services, press and calling cards require further integration.

佳麗可選填參賽歷史、才藝、語言及倡議。本人自述與平台查核分開；不捏造名次或建立官方賽事徽章。身形非必要欄位。私人電話、地址與文件不公開。
Optional talent fields include pageant history, talents, languages and causes. Separate self-reporting from verified claims. Never fabricate placements or official badges. Measurements are not mandatory. Private contact details and documents stay private.

## 6. 頁面與元件規格 / Page and component specifications
Global：可存取的主要導覽、語系選擇、跳至內容、狀態通知、頁尾；sticky nav 不遮擋焦點。手機導覽可展開，表單採單欄。
Home：大型 SHE 字標、封面圖、明確探索與加入操作；各內容段落有獨立目的。
Discover：有標籤的搜尋、複選概念以單一篩選起步、結果數、空狀態與清除篩選；不無限捲動。
Profile：自述／示意辨識、私人聯絡保護、追蹤、收藏、分享及檢舉。
Studio：明確狀態、表單標籤、錯誤訊息、預覽、草稿／核准快照分離。
Invitation：合作方、類型、需求、預算幣別、地點、日期、時區、同意；接受／婉拒／補充／封鎖／檢舉。
Admin：審核原因、版本及稽核；原型是刻意可操作的沙盒，不能當成正式權限系統。

## 7. 中英文與國際化 / Bilingual interface and internationalization
初期 zh-Hant / en。interface-copy.json 為核心文字對照。介面字典與會員內容翻譯分開。正式版將其餘樣板文字也抽為穩定鍵，驗證漏譯。人物原文、譯文、審核狀態與版本分開；原文更新標示譯文過期。AI 翻譯為草稿，公開前由本人或授權者核可。
Launch with zh-Hant/en. interface-copy.json contains core labels. Separate UI strings and content translations; extract remaining template copy into stable keys during production implementation and check coverage. Version source and translated content separately; mark stale translations. AI drafts require authorized confirmation.

語言切換不跳首頁；主要表單值保留。缺少英文人物介紹顯示原文與告知。人名不任意翻譯；國旗不當語言選單。支援長姓名、多語字元、國際電話及 RTL 邏輯排版準備。
Preserve route and primary form values across language switching. Fall back to source biography with notice. Preserve approved names. Never use flags for language selection. Support long names, Unicode, international phones and future RTL layout.

正式站建議 /zh-hant/people/{slug}、/en/people/{slug}。設 self-canonical、雙向 hreflang、x-default、分語 sitemap、社群圖片及標題。缺少完整翻譯頁不建立假英文索引頁；先訂出原文回退與收錄策略。現有路由逐一 mapping，不直接全部重導首頁。
Production locale paths need self-canonicals, reciprocal hreflang/x-default, sitemaps and share metadata. Avoid false translated index pages. Define fallback/indexation and explicit legacy route mappings.

原型採 hash 路由與 noindex，不宣稱已完成正式多語 SEO。
Prototype uses hash routing and noindex, not production SEO.

## 8. 視覺、動效與無障礙 / Visuals, motion and accessibility
Tokens：暖白 #F5F2EB、墨黑 #242224、酒紅 #6A2638、金 #A58B62；金色僅用裝飾，正式文字對比需實測。拉丁字採 Cormorant Garamond，中文 Noto Sans TC，系統字型回退；部署前核對授權與字型載入策略。
Typography: editorial Latin serif, readable Chinese sans, system fallbacks. Verify licensing and font-loading policy before launch. Gold is decorative; verify actual text contrast.

主按鈕觸控目標約 48px；核心閱讀字級 16–18px，說明文字較小。字級、行距與長英文以實機驗收。
封面輕量縮放，可暫停；作品 hover 不承擔必要功能；字幕動態示意可停；reduced motion 支援。無自動音訊、不強制橫向翻頁。
Aim for WCAG 2.2 AA; verify contrast, semantic names, focus, zoom, keyboard and screen readers. Reduced motion and pause controls are provided, not a compliance certification. Profile imagery has generic illustrative alt text; real media requires specific alternatives.
性能目標（未經實機驗證）：75 分位 LCP ≤2.5s、INP ≤200ms、CLS ≤0.1。實作時壓縮圖像、尺寸預留、延後非首屏媒體、影片封面先行；需真實裝置與量測。
Performance targets, not measured results: p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Optimize images, reserve space, defer offscreen media and use video posters.

## 9. 資料關係 / Conceptual data relationships
Account 1—N AuthIdentity；Account 1—1 PrimaryProfile；Account N—N Profile through CollaboratorGrant。
Profile 1—N ProfileTranslation / Module / Post / Media / Invitation。
Post 1—N PostTranslation / ContentVersion。
Account N—N Profile through Follow；Account N—N Content through Bookmark。
Profile 1—N Review；Review references immutable ContentVersion。
Account 1—N Consent / AuditEvent / Subscription（後續）。
Country, residence, locale and timezone are distinct. Stable IDs survive slug and language changes. Race-safe unique identities, ownership constraints and transaction boundaries must be defined during backend design.

公開 API 只回傳明確 allowlist；私密欄位不能靠前端隱藏。圖片上傳需型別／大小／內容驗證、權利聲明與安全處理。原型只作不持久化本機預覽。
Public APIs return explicit allowlisted fields. Do not hide sensitive data only in the frontend. Live uploads need type/size/content validation, rights and safe processing. Prototype file preview is temporary and local.

## 10. 權限、審核與濫用 / Authorization, review and abuse
| Role | Read | Edit | Publish / Review | Manage |
|---|---|---|---|---|
| Visitor | Published content | None | None | None |
| Member / owner | Public + own private data | Own drafts | Submit; risk-based routine posts | Own preferences/data requests |
| Delegate | Granted profile scope | Granted modules | Only explicitly granted | No account security or role escalation |
| Editor | Assigned review content | Editorial scope | Assigned content | Curate within scope |
| Translator | Assigned language/source | Assigned translations | Submit translations | No private contacts by default |
| Support | Required case data | Case records | Moderation per policy | Reports/appeals, audited |
| Admin | Need-to-know | Authorized system settings | Role-defined | Roles, security, audited |

Server-side access control and data isolation required on every operation. MFA for sensitive roles. Logs must avoid unnecessary contact data and tokens. Invitation quotas, sender verification, reporting, block lists and escalation precede open messaging.
原型允許切換審核行為，不包含正式授權、防刷、速率限制、MFA 或通知寄送。

## 11. 經營與成效 / Operations and measurement
免費基本專頁及閱讀，後續評估進階經營工具、素材容量、影片製作、品牌專題、活動與媒合服務。付費會員不等於已查核身分，編輯精選與付費曝光分開。
Basic profiles and reading first; evaluate advanced tools, media capacity, production, branded features, events and matchmaking. Paid membership never implies verification or editorial selection.

指標：語言使用、註冊完成、專頁完成率、送審時間、回訪、有效邀請與處理率。取得基準後設定目標；不要捏造受眾數、收入或保證商機。原型總覽數字一律標記示意。
Measure language usage, signup/profile completion, review time, return visits, qualified invitations and handling. Set targets after baseline. Prototype numbers are explicitly illustrative.

## 12. 隱私與維運 / Privacy and operations
分開取得必要條款、行銷、公開與素材同意；記錄版本、時間與撤回。成人首階段假設待業主確認。資料期限、刪除與備份保留政策依營運和法律審查制定。正式匯出與刪除須驗證本人且具可稽核工作流。
Separate required terms, marketing, publication and rights consents with version/time/withdrawal. Confirm adult policy. Define retention/deletion/backup rules with operational and legal review. Verify identity for live export/deletion and audit requests.

需監控：服務錯誤、寄信送達、資料存取、媒體處理、審核積壓、備份／復原。客服與內容審核需有人力負責，不以 AI 全自動替代。
Monitor errors, mail delivery, access, media processing, review queues and backup/restore. Assign human ownership for support and moderation.

## 13. 分期 / Delivery phases
P1：中英文、正式身分服務、專頁／工作台、邀請、審核與必要後台。依賴：原始碼盤點、Email、登入資格、資料權限、編輯人力、法律確認。完成條件：核心流程與越權、隱私驗收通過。
P2：影片儲存／轉碼、追蹤內容、排程背景工作、協作者、成效與會員方案。依賴：容量成本、權限及濫用政策。完成條件：背景工作、配額、權限及報表來源可驗證。
P3：新語言、個人化推薦、人工監督 AI 編輯／翻譯。依賴：需求、評估資料與可控費用。完成條件：翻譯品質、回退、成本及內容審核通過。
No firm delivery estimate until code and staffing are inspected. Cost drivers: design/frontend/backend/QA, translation/editorial/support, identity/email, media bandwidth/storage, monitoring and legal review.

## 14. 部署與回復 / Deployment and rollback
此 preview 是獨立 owner-private Sites 網站，不連正式 SHE 資料；不得新增 SHE 網域或覆蓋既有網站。
This owner-private preview has no production SHE data access. Do not attach the SHE domain or replace the live website.

正式流程：隔離 staging → 版本鎖定 → 資料及路由盤點 → 遷移 dry run → 全流程與權限測試 → 備份及回復演練 → 業主驗收 → 才另行授權正式部署。監控失敗時依 migration 兼容性決定回復程式或資料，不能盲目倒回資料庫。
Production: isolated staging → locked version → data/route audit → migration dry run → end-to-end and access tests → backup/rollback rehearsal → owner acceptance → separately authorized release. Plan data-compatible rollback, not blind database reversal.

## 15. 交付與驗收 / Deliverables and acceptance
互動測試站、此藍圖、interface-copy.json、acceptance.md 及 QA 結果。正式安全、真人驗證信、影音、跨裝置儲存、資料遷移與外部登入仍待實作。瀏覽器視覺與真實裝置驗收如未完成，須明確說明。
Deliverables: prototype, this blueprint, UI copy JSON, acceptance checklist and QA record. Live security, email, media, cross-device storage, migration and provider sign-in remain unimplemented. Explicitly report unperformed browser/device checks.
