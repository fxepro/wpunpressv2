# ops

Operational assets for running Unpress in production.

- `deploy/` — backend container + platform configs. The **frontend** deploys from
  the repo-root `netlify.toml` (base `frontend`, publish `out`); the **backend**
  (Fastify) deploys as a container.
- `ci/` — CI/CD pipeline definitions (typecheck + build both apps, run tests,
  deploy on `main`). Mirror into `.github/workflows/` when wiring the provider.
- `runbooks/` — incident response and operational docs.

Secrets live in each app's `.env` (templates: `backend/.env.example`,
`frontend/.env.example`) and in the provider's secret store — never committed.
