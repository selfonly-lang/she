# SHE

Source for https://she.self.com.tw/ (Vercel project `beautiself/she-self-women`).

The initial commit preserves the seven HTML pages served by the existing production deployment when the empty GitHub repository was connected. The pages contain their existing styles and scripts. Public Supabase configuration is part of the browser application; private credentials must never be added to this repository.

## Local development

Use Node 22 and run `npm run dev` from this directory. The local server serves the pages and `/api/auth` on port 8092. There are no third-party Node dependencies and no build step. Database-backed screens require access to the configured Supabase service. Run `npm test` for the isolated sign-in/linking handler tests.

The repository should deploy through its existing Vercel Git connection. Preserve that project's domain and deployment settings. Publishing these files does not migrate or replace Supabase data, roles, prices, commissions, or authentication settings.

## Official LINE

The owner confirmed on 2026-10-20 that FOBI 2026 belongs within SHE as an event-marketing/activity module. `/events/` links to the existing FOBI site; `/line/` identifies `@673opbay` as FOBI event support. General SHE product/member support scope is pending. Do not describe it as SHE-exclusive support or change FOBI notification settings.

The member page supports LINE Login, creating a private profile and explicitly linking existing Email accounts. SELF mother-site linking is optional and uses its existing OAuth service. See [the activation and validation instructions](docs/auth-setup.md) for the required server-only Vercel settings, additive Supabase migration and exact callbacks. Joining the official account and signing into SHE are separate integrations. Missing configuration keeps social login disabled while Email registration remains available.
