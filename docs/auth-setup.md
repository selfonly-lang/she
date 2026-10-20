# SHE 快速註冊與會員身分連結

## 使用者流程

- 首頁會員登入與加入按鈕直接進入 `/admin/`，不再開啟示意登入視窗。
- 新會員同意資料使用說明後，可用 LINE Login 登入；第一次完成授權會建立一般會員的私人檔案，預填 LINE 名稱，並顯示可修改的頭像與基本資料。
- 已有 Email 帳號者先登入該帳號，再從會員頁連結 LINE。系統不會憑同名或同 Email 自動合併帳號。
- 登入與註冊分頁直接顯示，不需展開額外區塊。Email 註冊只填 Email、密碼及條款同意；稱呼與其他檔案稍後補充。切換分頁會保留尚未填入的 Email／密碼，密碼顯示可由使用者切換。
- Email 註冊保留驗證郵件流程；驗證回站設定使用 Supabase 的 `options.emailRedirectTo`。需驗證時，畫面回到登入並保留 Email、清除密碼及提示檢查信箱。
- LINE 服務啟用後才顯示登入按鈕；未啟用時以一行狀態說明，Email 操作不等待 LINE 狀態回應。會員基本資料讀取後即進站，商品／訂單等非登入必要資料在背景載入；其中一項失敗不會誤報登入失敗。
- SELF 是可稍後操作的獨立連結：登入 SELF、同意其 OAuth 授權，再回 SHE 確認目前帳號。會員等級、價格、分潤與審核規則不會因此變更。

## LINE Login 啟用

先在 **SHE 的 Supabase 專案 `tlpsqaywjcgowprhauod`** SQL Editor 執行：

`supabase/migrations/202610180001_she_auth_identities.sql`

這個新增表格只儲存由伺服器驗證的身分對應。一般前端使用者不能讀寫；它不修改既有會員、商品、價格、佣金或資格資料。

在 **Vercel → beautiself/she-self-women → Settings → Environment Variables** 的 Production 環境設定：

| 名稱 | 來源 |
| --- | --- |
| `LINE_LOGIN_CHANNEL_ID` | SHE 的 LINE Login Channel ID |
| `LINE_LOGIN_CHANNEL_SECRET` | 同一個 LINE Login Channel 的 Secret |
| `SHE_SUPABASE_SERVICE_ROLE_KEY` | 上述 SHE Supabase 專案的伺服器用 secret／service_role key，供 Auth Admin 與身分對應操作 |

LINE Login Channel 應與官方帳號屬於正確的 Provider；若要連動加入好友功能，需在 LINE Developers 核對官方帳號的連結設定。官方帳號的 Messaging API 憑證不能直接當成 LINE Login Channel。

LINE Developers 的正式 Callback URL 必須精確為：

`https://she.self.com.tw/api/auth?action=line-callback`

設定需正式對外使用的 Channel 狀態，並檢查 Supabase 的網站驗證信允許返回 `https://she.self.com.tw/admin/`。Vercel 環境變數變更後須重新部署才會載入。

程式只要求 `openid profile`，不要求 LINE Email、聊天內容或發送訊息權限。權杖交換、ID Token／nonce 驗證、PKCE、加密交易 Cookie 與 Supabase Admin 操作都在伺服器端。

LINE 授權回站網址不攜帶會員資料、Supabase session 或 LINE token。一次性登入交接由 Secure、HttpOnly Cookie 與同源 POST 完成。新會員只建立一般資格，不授予商務、管理員或付費權限。

缺少伺服器憑證或身分對應資料表時，快速登入會維持停用，Email 登入／註冊繼續可用；不能將這個狀態描述為 LINE 登入已啟用。

部署後可檢查 `https://she.self.com.tw/api/auth?action=status`：`line.setup.missing_environment` 只列出正式伺服器缺少的變數名稱，不回傳任何值；`identity_storage` 為 `unchecked` 表示尚無伺服器金鑰可檢查、`unavailable` 表示金鑰授權或身分表讀取失敗、`ready` 表示已通過零筆資料的讀取檢查。`enabled: true` 表示前置設定已就緒，仍需真實 LINE 授權回站驗收。

## 稍後啟用 SELF 母站連結

由 SELF 原會員系統有權管理 OAuth 應用的人員，新增或核對 SHE 專用的應用程式，使用 `profile` scope、精確回呼網址與明確的會員同意畫面，不開啟自動同意：

`https://she.self.com.tw/api/auth?action=self-callback`

將該應用程式的 `SELF_OAUTH_CLIENT_ID` 與 `SELF_OAUTH_CLIENT_SECRET` 安全存入同一 Vercel Production 專案後重新部署。母站使用既有 `https://www.self.com.tw/oauth/authorize` 及其原有 OAuth Edge Functions，SHE 不另建母站的社群登入實作。

完成授權後，還需用開始連結時相同的 SHE 帳號確認，避免另一分頁切換會員後誤綁。伺服器只保留 SELF 的不可變會員 ID 對應，完成識別後嘗試撤銷臨時 OAuth access／refresh tokens；不複製母站會員等級與價格。

## 開發與驗證

Node 22：`npm test` 執行實際 API handler 的隔離測試；`npm run dev` 啟動本機靜態網站與 API。測試使用明確的假身分與假遠端服務，不建立正式會員或發送 LINE 訊息。

正式驗收需另外完成真實 LINE 授權、回站、檔案建立、登出再登入及既有 Email 帳號連結。測試替身或 LINE 帳號資訊查詢不能取代這些驗收。
