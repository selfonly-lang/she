# Member LINE module — 2026-10-22

/line-connect/ provides official-account ID/URL validation, opening the link for owner confirmation, private per-member defaults, pending-page link updates and published-page link review. All membership levels can save private defaults; existing page eligibility remains in force.

Published-page changes use she_line_link_requests and the security-invoker she_review_line_link RPC. Only super_admin/editor can review. Approval updates contact_url on the same page, preserving slug/status; existing public read policy remains published-only. Defaults are owner-only and automatically loaded for new studio pages. Existing page links take precedence.

Tests: 30 existing auth/contact/routing tests pass. Database transaction rollback verified private defaults, approved link application to the same published page, and denial of cross-member request reads/review. No test pages or settings persisted.

Platform LINE Login remains unconfigured: production readiness reports missing LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET, SHE_SUPABASE_SERVICE_ROLE_KEY. Official-account contact links do not provide Login or Messaging API credentials. No automatic LINE messages are sent.
