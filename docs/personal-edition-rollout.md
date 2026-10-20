# SHE personal edition rollout — 2026-10-21

## Implemented
- React/Motion crossfade/zoom hero, five-person selector group, existing horizontal marquee, pause/reduced motion.
- Card opens full-viewport personal brand experience. Story / curated shop / service / official LINE contact; product detail retains personal branding.
- /s/:slug route; #view=shop links to personal shop. Only published profiles requested, explicit public field list. No auth-bypassing proxy.
- Selection references stored in she_people.selected_product_ids (additive migration applied). Existing RLS unchanged; max 100 IDs; public product query/RLS filters available records. IDs grant no pricing or order authority.
- Four-step editor, AD catalog selection, official LINE @ID/share-link normalizer with local apply vs save state distinction.
- Large-button member workspace; role-dependent admin navigation; product brand/category/search filters, visible-only batch selection.
- Existing order/commission/payment read-only views with empty/error states. No synthetic balances, commissions, payments or checkout.
- she-line-connect reusable skill validated and saved separately in Skills git workspace.

## Release blockers / remaining business work
1. Existing anonymous she_people SELECT fails because is_moderator function is not executable by anon. Prior proposed public policy split was rejected by automatic approval. docs/proposed-she-public-people-read.sql is NOT applied; explicit approval needed. No published profiles exist at review time; image examples are labeled illustrative.
2. LINE Login/SELF linking retains existing platform server routes. Need real configured-provider sign-in/callback verification by account owner; no secrets collected in chat. Personal official account contact links are not Messaging API authorization.
3. Messaging API sending requires tenant-channel secret storage, verified recipient linking across providers, signed webhook validation and an explicitly authorized live send test.
4. Commercial checkout/referral attribution, commission rates, refund reversal and settlement cycle are not defined. Existing finance records are presented, but no new automatic commission engine or money transfers have been activated. Decide rules before implementing transactional settlement/RPCs.
5. Existing editor uses new pending versions for changes to published profiles. Each version retains its own slug. Stable alias across approved revisions requires a dedicated version/alias model; do not claim stable alias migration implemented.
6. Existing member auth sends preview admin to canonical production. Signed-in editor saves, admin changes and finance permissions must be verified in an approved authenticated test workflow; unauthenticated controls remain disabled. No test members or fabricated published profiles were inserted.
7. AD products currently come from existing synchronized SHE catalog records. No new AD sync job or product source mutation was performed.

## Validation
- Build succeeded; 27 automated tests cover current auth boundaries, routing, URL validation and curated-product filtering.
- Browser verified hero, card-to-personal transition, sample shop with real AD catalog items, inline product detail, 390px mobile page, LINE ID -> official URL with unsaved notice, disabled guest save and catalog picker.
- Skill forward-tested independently on official account contact + login friend prompt + automatic purchase message scenario.
