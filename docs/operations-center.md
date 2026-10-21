# SHE operations center

Entry: /operations/; linked from /workspace/.

Implemented 2026-10-21:
- Verified selfonly@gmail.com assigned super_admin via database role table.
- Existing AD product bulk management retained at /manage-products/.
- Four membership tier descriptions and configurable sales commission percentages; all disabled with null rates until administrator configures them. Product audience and tier prices remain in product management; benefits text is descriptive, not arbitrary authorization code.
- Sales draft entry, actual payment reference confirmation, locked paid amounts/parties, refund reversal.
- Commission snapshot based on seller tier at calculation time, rounded to TWD cents. Paid/completed orders only; unique order/beneficiary; approval and reversal. No automatic payout or payment provider integration.
- Immutable manual receipts/disbursements journal with unique reversal records. This is an operational cashbook, not statutory double-entry accounting. Manual journal is independent of order receipt status; avoid duplicate entry.
- Financial audit records; access restricted to finance/super_admin; members retain their own order/commission reads.
- Private member/super_admin support threads, explicit owner/staff checks on messages, close/reopen. Manual refresh; latest 100 messages; no email/LINE send or AI integration.
- Lists use 50-row pagination and per-page JSON export. Product/member selectors currently show up to 1,000 records.

Verification:
- npm test: 30 existing tests pass; production asset build passes.
- test/sql/operations-verification.sql executed against the database within ROLLBACK: paid-only commission, correct 25.11 rounding, immutable rate snapshot, duplicate prevention, approval/refund reversal, ledger reversal and duplicate reversal passed.
- Transactional RLS probe: unrelated authenticated identity cannot read thread/messages/ledger/audit or insert messages into another thread. All fixtures rolled back.
- All five new tables have RLS. No configured commission rates or synthetic transactions persisted.
- Security advisor: no new operations findings. Existing project-level leaked-password-protection warning and unrelated FOBI function warnings remain outside this change. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Browser verification covers published guest entry and login boundary; privileged UI flow still requires account-owner sign-in.

Deferred existing scope: LINE Login credentials, personal AI service key, payment provider checkout/referral attribution, bank reconciliation and payouts. No credentials or rates fabricated.
