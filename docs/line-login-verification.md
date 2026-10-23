# LINE Login 修正與驗收（2026-10-23）

## 現況

正式 `/api/auth?action=status` 仍回報 LINE_LOGIN_CHANNEL_ID、LINE_LOGIN_CHANNEL_SECRET、SHE_SUPABASE_SERVICE_ROLE_KEY 缺少，identity_storage=unchecked。Vercel she-self-women Production 變數清單亦未見以上三個名稱。LINE Developers 開啟後停在 LINE Business ID 登入，尚未取得可核對 Channel 的工作階段。**未完成真實 OAuth，不能宣告正式登入完成。**

既有 state、nonce、PKCE、固定 callback、LINE ID Token 驗證、不可變身分映射與同帳號確認綁定已存在。Callback 維持 `https://she.self.com.tw/api/auth?action=line-callback`。

## 本次修正

- 同意紀錄改為 UNIQUE(user_id, policy_version) 的 ignore-duplicates 寫入，保留原同意時間。
- 身分寫入若出現不確定的網路／5xx 失敗，不刪除可能已成功建立的會員。只有確認另一個會員贏得唯一映射時，才移除本次建立的未使用帳號。
- 再次登入可補建中斷的私人 profile；ignore-duplicates 保留現有名稱、會員等級與資料。
- 同一身分同一會員的並行綁定可安全重試，其他會員／身分衝突仍拒絕。
- 登出先透過同源 cancel 清除 HttpOnly OAuth Cookies，再呼叫 Supabase signOut。成功後以乾淨網址重載；跨分頁登出／切換帳號立即清除舊會員畫面。
- 綁定衝突提示改為 SHE 平台管理員，不把活動客服當作會員身分處理窗口。

## 服務界線

| 功能 | 身分與權限 |
| --- | --- |
| SHE 平台登入 | 平台 LINE Login Channel，僅 openid/profile，映射 SHE 會員 |
| SHE／FOBI 客服 | @673opbay 的已確認範圍為 FOBI 活動；一般會員客服範圍仍需營運確認，參見未合併 PR #4 |
| 會員個人 LINE 官方帳號 | owner-only 聯絡設定與已發布專頁修改審核；不參與登入身分，不授予 Messaging API |

## 已驗證

- `npm test`：38 項通過（API 遠端服務替身與前端登出流程，非真實 LINE OAuth）。
- `test/line-isolation.sql`：已於 SHE Supabase 執行並完整回滾。確認 A 不能讀寫 B 私人 profile／LINE 聯絡資料，一般會員不能讀取伺服器身分映射表。無正式資料修改。
- 四種會員等級在重複登入後保持不變；登入 handler 不寫入商品價格、個人公開專頁或會員 OA 設定。
- JavaScript 語法、git diff 空白檢查通過。

## 尚待正式驗收

1. 在安全 LINE Developers 登入工作階段確認平台 Login Channel、Provider、發布狀態及精確 callback；不要使用 Messaging API Secret。
2. 將上述三項設定安全存入 Vercel Production；secret 不得放入聊天、原始碼或 PR。重新部署後確認 readiness。
3. 真實新會員授權、回站、持久化 session、修改個人資料、重整、登出與重複登入。
4. 真實既有 Email 會員先登入再綁定 LINE，確認相同 SHE user_id、會員等級、價格權限、專頁 slug/status 均保留。
5. 使用第二個已授權測試帳號確認跨會員隔離、綁定衝突、取消授權與跨分頁切換。手機 Safari／LINE 內建瀏覽器亦須實測。

資料庫 RLS 測試、API 模擬測試與 readiness 就緒都不能替代第 3–5 項。
