# SHE 官方 LINE：帳號資訊與三篇貼文交付

> 2026-10-20。此文件是 **待貼入 LINE Official Account Manager 的內容**，不是 LINE OA 已完成設定或已刊登的證明。

## 官方帳號基本資料

| 欄位 | 建議正式內容 |
| --- | --- |
| 已知 LINE 官方帳號 ID | `@673opbay` |
| 官方網站 | https://she.self.com.tw/ |
| 官網 LINE 專區 | https://she.self.com.tw/line/ |
| 加入好友連結 | https://line.me/R/ti/p/@673opbay |
| 建議顯示名稱 | SHE｜Style. Her. Empire.（目前是否可變更及實際名稱請於後台核對） |
| 帳號一句話介紹 | SHE 女性時尚與事業平台，讓風格、專業與每段女性故事找到自己的舞台。 |
| 帳號詳細介紹 | SHE｜Style. Her. Empire. 連結女性故事、個人風格、品牌精選與事業可能。探索女性人物、打造個人時尚專頁、了解 SHE 會員服務與品牌動態。加入官方 LINE，與我們一起開啟妳的下一章。 |
| 官網品牌關鍵字 | 女性時尚、女性人物、個人品牌、女性創業、時尚選品 |
| 所屬社群 | SELF Community（官網既有標示） |

未經確認的地址、客服時間、電話、付費方案、官方認證狀態不得補寫。

## LINE OA 圖文選單建議

| 入口 | 連結 |
| --- | --- |
| SHE 官方網站 | https://she.self.com.tw/ |
| SHE 會員中心 | https://she.self.com.tw/admin/ |
| 女性人物 | https://she.self.com.tw/women/ |
| 品牌精選 | https://she.self.com.tw/catalog/ |
| 個人時尚專頁 | https://she.self.com.tw/studio/ |
| SHE 官方 LINE 專區 | https://she.self.com.tw/line/ |

圖文選單的實際設定需有 LINE OA Manager 授權；本次僅完成準備內容，並未更改 LINE OA 選單。

## 貼文 01｜SHE 正式歡迎

**標題：妳的下一章，從 SHE 開始**

美，不只是一種樣子；風格，也不只有一種答案。

SHE 是一個連結女性故事、個人風格、品牌選品與事業可能的地方。

我們相信，每個人的經歷、專業與選擇，都值得擁有自己的舞台。

從今天開始，和 SHE 一起探索更多可能。歡迎加入官方 LINE，收到平台資訊，也和我們聊聊妳的故事。

👉 https://she.self.com.tw/line/

#SHE #StyleHerEmpire #女性時尚 #女性力量

**建議素材**：米白背景、酒紅字、雜誌感女性形象；不使用未授權真人肖像。

## 貼文 02｜女性個人品牌

**標題：讓妳的專業，成為最有辨識度的風格**

妳的經歷，不該只停留在一段自我介紹。

在 SHE，妳可以從個人時尚專頁開始，整理自己的形象、作品、專長與故事。

不論妳正在經營品牌、累積專業，或準備走向新的事業方向，都能從一頁屬於自己的內容開始。

為妳的下一章，留下漂亮的開場。

👉 https://she.self.com.tw/studio/

#SHE #個人品牌 #時尚專頁 #女性創業

**建議素材**：藝術總監感桌面、精品雜誌排版、個人品牌標題字。

## 貼文 03｜SHE 品牌精選

**標題：選擇真正適合自己的美好**

好的選擇，不只是跟著流行，而是更了解自己的需求。

SHE 從女性日常、時尚風格與生活事業出發，邀請妳探索品牌、產品及服務的不同可能。

我們重視清楚的資訊與自在的選擇。每件產品的詳細內容、價格及會員適用資格，請以正式商品頁為準。

今天，挑一個讓生活更靠近理想的方向。

👉 https://she.self.com.tw/catalog/

#SHE #品牌精選 #風格生活 #選擇自己的美好

**建議素材**：高級時尚靜物、極簡產品陳列與雜誌封面視覺；不臆測任何商品功效或價格。

## LINE Login 正式啟用卡點

- LINE Official Account 與 LINE Login 是不同服務；僅有 `@673opbay` 無法完成網站 OAuth。
- SHE 服務目前仍需在 LINE Developers 完成 Login Channel 建立、對應 Provider／OA、正式回呼設定。
- Callback：`https://she.self.com.tw/api/auth?action=line-callback`
- Vercel Production 必須由授權人安全設定：`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`、`SHE_SUPABASE_SERVICE_ROLE_KEY`；絕不在此儲存實際值。
- 需重新部署、檢查 `/api/auth?action=status` 並用真實 LINE 使用者測試登入、會員建立／連結、登出與重登入。
- 本專案既有 LINE/SELF 身分對應表已建立，使用 RLS 保護，原會員資格、價格與佣金不因此更動。

**發布狀態**：上述三篇已製作並刊登於 SHE 官網 LINE 專區；未透過 LINE OA Manager 送出貼文／廣播，因此 LINE OA 發布狀態為 **待發佈**。
