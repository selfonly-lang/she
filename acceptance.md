# SHE 驗收清單 / Acceptance checklist

## 原型可測 / Prototype review
- [ ] 首頁、人物、文章、註冊、工作台、設定與指南切換中英文。
- [ ] 語言切換保留路由及註冊／專頁表單值。
- [ ] 以虛構國際 Email 註冊，不要求 LINE 或台灣電話。
- [ ] 錯誤測試碼顯示錯誤，246810 可繼續。
- [ ] 身分複選；至少一項；條款與成人確認必要，行銷不預選。
- [ ] 三種版型有不同內容層次，切換不丟失文字。
- [ ] 模組顯示控制、長姓名、多語輸入與英文介紹回退。
- [ ] 草稿儲存、預覽、送審、退回原因、核准快照、撤下。
- [ ] 搜尋、語言／身分篩選、排序、關注與收藏。
- [ ] 合作表單必填、日期／時區、接受／婉拒／補充／封鎖／檢舉。
- [ ] 本機內容草稿及排程狀態；排程明示不會背景發布。
- [ ] 本機匯出、登出、重設；圖片型別與 5MB 限制。
- [ ] 影片入口明示圖片動態概念，暫停及字幕可用。
- [ ] Guide lists connected vs simulated features accurately.
- [ ] Modal focus trap, Escape, focus restoration and keyboard controls.
- [ ] Desktop/mobile visual review, 200% zoom, screen reader and contrast checks.

## 正式上線阻擋項 / Production release gates — not implemented by the prototype
- [ ] Audit original code, deploy flow, legacy routes, data and member identity.
- [ ] Live email delivery, expiration, resend limits and non-enumeration.
- [ ] SELF/LINE verified OAuth flows, state/PKCE as applicable and safe account linking.
- [ ] Real sessions, recovery, verified email change, revocation and MFA.
- [ ] Server-side object ownership, role scope and negative authorization tests.
- [ ] Private contact/document fields absent from all public API responses.
- [ ] Immutable published versions, atomic review and concurrent editing rules.
- [ ] Upload content validation, access scope, media rights and deletion.
- [ ] Invitation sender verification, quotas, blocking, reports and notification delivery.
- [ ] Source/translation versions, stale translation review and fallback coverage.
- [ ] Locale URLs, hreflang, canonical, sitemaps and localized social previews.
- [ ] Existing women/catalog/admin/studio/s/c URLs preserved or mapped explicitly.
- [ ] True scheduled jobs execute once, retry safely and respect timezone/DST.
- [ ] Account export/deletion verify ownership and apply retention policy.
- [ ] Backup restoration and migration rollback rehearsed on staging.
- [ ] Representative international devices, long names, RTL-readiness, captions and WCAG checks.
- [ ] Measured performance and real error monitoring; no unverified compliance claims.
- [ ] Production terms, operating countries, age policy and support responsibility confirmed.
- [ ] Owner approves the review version before replacing she.self.com.tw.

## Scope
No FOBI contest management, roster transfer, shared login, payment, votes or guaranteed outcomes.
所有原型資料為本機示意，不能作為上述正式驗收通過證明。
