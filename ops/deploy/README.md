# deploy

- **frontend** → Netlify (static export). Config: repo-root `netlify.toml`.
- **backend** → container (Fly.io / Railway / Render). Add `Dockerfile` here.

Keep one file per target; reference env via the provider's secret store.
