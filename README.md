# SHE

Source for https://she.self.com.tw/ (Vercel project `beautiself/she-self-women`).

The initial commit preserves the seven HTML pages served by the existing production deployment when the empty GitHub repository was connected. The pages contain their existing styles and scripts. Public Supabase configuration is part of the browser application; private credentials must never be added to this repository.

## Local development

From this directory, run `python -m http.server 8090 --bind 127.0.0.1` and inspect the homepage and the `/admin/`, `/catalog/`, `/women/`, `/studio/`, `/manage-products/`, and `/people/` routes. No dependency installation or build is needed for these static files. Database-backed screens require access to the configured Supabase service.

The repository should deploy through its existing Vercel Git connection. Preserve that project's domain and deployment settings. Publishing these files does not migrate or replace Supabase data, roles, prices, commissions, or authentication settings.

## Official LINE

The official account is `@673opbay` (display name `Sheself`). The join link is `https://line.me/R/ti/p/@673opbay`. Joining the official account and logging into SHE with LINE are separate integrations; LINE member authentication requires its own verified login-channel and callback configuration.
