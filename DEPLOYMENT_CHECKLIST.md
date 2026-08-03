# FinSight AI — Deployment Readiness Report & Checklist

> Generated during deployment preparation. No project source code, backend, or frontend files were modified.

---

## 1. Environment Verified

| Item | Value |
|---|---|
| Local Node.js | v24.13.1 |
| Local npm | 11.8.0 |
| Frontend | Vite 5 + React 18 + Tailwind CSS 3 |
| Backend | Express 4 + Mongoose 9 (CommonJS, entry `src/index.js`) |
| Database | MongoDB (Mongoose) |

---

## 2. Build Commands — VERIFIED ✅

| Scope | Command | Result |
|---|---|---|
| Root build | `npm run build` → `npm --prefix frontend run build` → `vite build` | ✅ PASSED (dist generated) |
| Frontend dev | `npm --prefix frontend run dev` | ✅ present |
| Backend dev | `npm --prefix backend run dev` (nodemon) | ✅ present |
| Backend start (prod) | `npm start` → `node src/index.js` | ✅ present |
| Frontend preview | `npm run preview` (frontend) | ✅ present |
| Lint | `npm run lint` → `eslint .` (frontend) | ✅ present |

Build output confirmed in `frontend/dist/assets/`:
- `index-BRZY2o1r.js` (~915 KB)
- `index-H2JkhRmq.css` (~55 KB)

---

## 3. Environment Variables — VERIFIED

Source of truth: `backend/src/config/env.js`, `backend/src/middleware/auth.js`, `backend/src/controllers/authController.js`.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGODB_URI` | **YES** | — | App throws if missing (`required()` in env.js) |
| `PORT` | No | `4000` | Render injects its own `PORT`; env.js respects it via `process.env.PORT || 4000` |
| `NODE_ENV` | No | `development` | Set to `production` in prod; disables Mongoose `autoIndex` |
| `CLIENT_ORIGIN` | **For prod** | `http://localhost:5173` | CORS allowlist — **must** be set to the deployed Vercel URL |
| `JWT_SECRET` / `JWT_KEY` | **For prod** | `dev-only-secret` | Falls back to an insecure default — **must** be set in prod |
| `JWT_EXPIRES_IN` | No | `1d` | |
| `SMTP_HOST` | No | `smtp.gmail.com` | Empty SMTP_USER/PASS ⇒ Ethereal (dev only) |
| `SMTP_PORT` | No | `587` | |
| `SMTP_USER` | For real email | `''` | If empty, verification emails go to Ethereal test inboxes |
| `SMTP_PASS` | For real email | `''` | |
| `SMTP_FROM` | No | `noreply@finsightai.com` | |

`.env.example` (backend) currently defines only: `NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_ORIGIN`.
Missing from example: `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

---

## 4. package.json Scripts — VERIFIED ✅

- Root: `dev`, `build`, `lint` (delegates to `npm --prefix frontend`).
- Frontend (`type: module`): `dev`, `build`, `preview`, `lint`.
- Backend (`type: commonjs`, `main: src/index.js`): `dev` (nodemon), `start` (node).
- No missing production entry point. Backend needs **no build step**.

---

## 5. .gitignore — VERIFIED ✅

Correctly ignores:
- `node_modules`, `npm-debug.log*`, `yarn-*`
- `logs`, `*.log`
- `.env`, `.env.*` (confirmed `.env` is NOT tracked by git)
- `frontend/dist`
- `backend/uploads/`
- `.vscode`, `.idea`, `backup_scripts/`, `*.bak`
- OS files (`.DS_Store`, `Thumbs.db`)

---

## 6. Deployment Compatibility

### Frontend → Vercel

| Check | Status | Notes |
|---|---|---|
| Vite static build | ✅ | Outputs `dist` |
| SPA routing (BrowserRouter) | ⚠️ | **No `vercel.json`** exists → deep links (`/dashboard`, `/login`) will 404 without an SPA rewrite |
| API calls | ⚠️ | Frontend calls relative `/api/*` (fetch + XHR). The Vite dev proxy (`localhost:4000`) is **dev-only**. On Vercel, `/api` must be rewritten/proxied to Render, or the frontend must use an absolute API URL via a `VITE_` env var |
| Env config | ⚠️ | No `VITE_*` env vars are read anywhere in `frontend/src` |

### Backend → Render

| Check | Status | Notes |
|---|---|---|
| Node service entry | ✅ | `npm start` → `node src/index.js` |
| PORT binding | ✅ | Uses `process.env.PORT` (Render injects it) |
| Health endpoint | ✅ | `/health` returns `{ status, server, database }` |
| File uploads (core feature) | ⚠️ | Uploads are written to local disk `process.cwd()/uploads`. **Render filesystem is ephemeral** (and free tier is read-only outside `/tmp`). Files will be lost on restart/deploy, and password-unlock/processing reads from disk. **Requires a persistent disk mount or object storage (e.g., S3).** |
| Email verification | ⚠️ | Without SMTP creds, falls back to Ethereal (users never receive real verification emails) |
| DB indexes | ⚠️ | `autoIndex` is disabled when `NODE_ENV=production`. Unique/text indexes must be created manually in MongoDB Atlas |
| DNS override | ⚠️ | `database.js` force-sets DNS to `8.8.8.8` / `1.1.1.1`; usually fine, but verify connectivity from the host |

### Deployment manifests

- `vercel.json` — ❌ missing
- `render.yaml` — ❌ missing (optional; dashboard config works)
- `Procfile` — ❌ missing (optional on Render)
- `Dockerfile` — ❌ missing (not required for Vercel/Render)

---

## 7. Production-Readiness Verdict

**Frontend: build is production-ready; Vercel config is incomplete.**
**Backend: starts as-is, but is NOT fully production-ready** for the core upload workflow until the disk/ephemeral-storage issue and production SMTP/JWT/CORS env are resolved.

### Required before deploy (gaps found)
1. **CRITICAL** — Add `vercel.json` with an SPA rewrite (`/` → `index.html`) and `/api/*` proxy to the Render backend (or use `VITE_API_URL` + absolute fetch base).
2. **CRITICAL** — Resolve ephemeral filesystem: add a Render persistent disk at the uploads path **or** migrate file storage to object storage (S3). Core upload → unlock → process flow depends on file persistence.
3. **HIGH** — Set production `JWT_SECRET` (default is `dev-only-secret`).
4. **HIGH** — Set `CLIENT_ORIGIN` to the deployed Vercel URL (CORS).
5. **HIGH** — Configure real `SMTP_HOST/PORT/USER/PASS/FROM` so verification emails reach users.
6. **MEDIUM** — Create MongoDB indexes manually (unique `owner_user_hash`, `unique_user_transaction_hash`, text index) since `autoIndex` is off in production.
7. **MEDIUM** — Add `JWT_SECRET`/`SMTP_*` entries to `backend/.env.example`.
8. **LOW** — Optional `render.yaml` for infra-as-code.

---

## 8. Deployment Checklist

### A. Vercel (Frontend)
- [ ] Push the repo to GitHub (Vercel imports from git).
- [ ] Import project; set **Root Directory = `frontend`**.
- [ ] Build command: `npm run build` · Output directory: `dist`.
- [ ] Add `vercel.json` (repo root or frontend root) with SPA rewrite and `/api` proxy to the Render URL.
- [ ] Or set `VITE_API_URL` and update API calls to use it (would require source change — currently source uses relative `/api`, so prefer the proxy/rewrite route to avoid source edits).
- [ ] Environment: no required `VITE_*` vars if `/api` proxy is used.
- [ ] Deploy and verify deep links: `/`, `/login`, `/register`, `/dashboard`, `/dashboard/upload`.

### B. Render (Backend)
- [ ] Create a **Web Service**; connect the repo; **Root Directory = `backend`**.
- [ ] Build command: `npm install` (or `npm ci`). Start command: `npm start`.
- [ ] Environment variables:
  - `MONGODB_URI` (MongoDB Atlas connection string) — **required**
  - `NODE_ENV=production`
  - `CLIENT_ORIGIN=https://<your-app>.vercel.app`
  - `JWT_SECRET=<strong random value>`
  - `JWT_EXPIRES_IN=1d`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- [ ] **Add a persistent disk** mounted at the uploads directory (e.g., `/opt/render/project/src/uploads`) **or** implement object storage for statement files.
- [ ] In MongoDB Atlas, create the schema indexes manually (User email unique, BankStatementUpload `{ownerUserId, contentHashSha256}` unique, Transaction `{ownerUserId, transactionHash}` unique, Transaction `{statementId, date}`, Transaction text index on `description`).
- [ ] Deploy; verify `GET /health` returns `{"status":"ok","database":"connected"}`.

### C. Post-Deploy Smoke Test
- [ ] Landing page loads on the Vercel URL.
- [ ] Register a new account → a real verification email arrives (SMTP configured).
- [ ] Verify email → login succeeds (JWT stored).
- [ ] Upload a PDF/CSV statement → file persists → transactions parse and display.
- [ ] Upload a password-protected PDF → unlock modal flow works.
- [ ] AI Insights, Financial Coach, health score, and CSV export all render correct data.
- [ ] Dashboard deep-link refresh works (SPA rewrite confirmed).

---

*End of report. Nothing in `backend/` or `frontend/` source was changed.*

