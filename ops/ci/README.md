# ci

CI/CD pipeline definitions. Suggested stages: install → typecheck → build
(frontend + backend) → test → deploy on `main`. When using GitHub Actions, the
live workflows go in `.github/workflows/`; keep reusable scripts here.
