# VSX — Server & Deployment Notes

What the backend is, how the cloud build was updated, and the current release state.
Written 2026-09-11 after the independent release verification + GitHub Pages update.

## 1. Architecture

| Layer | Location | Tech |
| --- | --- | --- |
| Game client | `src/` | Vue 3 (`<script setup>`, TS), Vite build (`base: '/VSX/'`) |
| Auth/save backend | `server/auth.ts` | `node:http`, no framework |
| Storage | `server/db.ts` | `better-sqlite3`, WAL mode, `vantage-strike.db` |

- **Roots:** backend binds `process.env.PORT || 4187` on all interfaces (no host arg →
  dual-stack `::`); console log prints `127.0.0.1` for cosmetics only (see §5 caveat).
- **Passwords:** scrypt, per-user random salt, constant-time compare.
- **Sessions:** 64-hex tokens, 30-day expiry, sliding renewal on active use.
- **Shutdown:** `db.close()` on SIGINT, SIGTERM **and** `process.once('exit')` (in `server/db.ts`;
  SIGINT/SIGTERM hooks duplicated in `auth.ts` — idempotent). Prevents Windows
  `EBUSY`/`SQLITE_BUSY` file locks. Vite watcher ignores `*.db`, `*.db-journal`, `*.db-wal`.

### API

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| POST | `/api/register` | – | 201 `{user, token}`; 400/409 on bad username/password/dup |
| POST | `/api/login` | – | 200 `{user, token}`; 401 wrong creds |
| POST | `/api/logout` | token | 204, deletes session |
| GET | `/api/me` | token | 200 `{user}` ; 401 otherwise |
| GET | `/api/save` | token | 200 `{save, updatedAt}` (`save: null` for new accounts); 401 |
| POST | `/api/save` | token | 200 `{updatedAt}`, upsert, 1 MB cap → 413 |

Auth via `X-Auth-Token` header (client stores in `localStorage`). CORS: `*` with
`Content-Type, X-Auth-Token` allowed — the API is usable from other origins if hosted.

## 2. Local development

```
npm install            # better-sqlite3 prebuilt for win32-x64 — no node-gyp needed
npm run dev:full       # vite dev (:5173 proxy /api → :4187) + node server/auth.ts
npm run server         # backend only (port 4187)
npm run typecheck      # vue-tsc --noEmit (decoupled — run on demand)
npm run build          # esbuild/rolldown bundle → dist/
npm run check          # typecheck + build (pre-release gate)
```

Import conventions: `src/` uses extensionless imports (no `.ts`); `.vue` extensions are
required (Vite's default `resolve.extensions` excludes `.vue`). The only `.ts`-suffixed
import in the repo is `server/auth.ts → './db.ts'` — Node's native TS runner needs it.

## 3. GitHub release state (as of this update)

- **Repo:** `github.com/Braverakupo/VSX` (public; project Pages).
- **`master`** = source. Was fast-forwarded from `41c90e5` (pre-monorepo flat layout)
  to **`b72335d`** — the full `apps/vantage-strike/` monorepo incl. auth feature.
  Clones of `master` now get everything.
- **`gh-pages`** = built site (deploy branch, force-pushed). Old deploy
  (`index-DnKgGXHk.js`, pre-auth) → new **`b50d6b5`** (`index-CcDXqoJ2.js`,
  `index-CxLAGX_B.css`, sessions/auth UI included).
- **Live:** `https://braverakupo.github.io/VSX/` — verified 200 on `/`, `/index.html`,
  and the new JS/CSS assets after deploy.

### How the site was updated (reproducible, Windows-safe)

```bat
cd apps\vantage-strike
npm run build                      :: dist/ (deterministic; hashes stable if src unchanged)
cd ..\..                           :: repo root
git worktree add --detach .deploy-ghpages origin/gh-pages
git -C .deploy-ghpages rm -rf . -q
:: copy dist\* and an empty .nojekyll into .deploy-ghpages
git -C .deploy-ghpages add -A
git -C .deploy-ghpages commit -m "deploy(gh-pages): rebuild VSX"
git -C .deploy-ghpages push origin HEAD:refs/heads/gh-pages --force
git worktree remove --force .deploy-ghpages
```

`.nojekyll` must always be re-added (keeps Pages from Jekyll-processing the bundle).

## 4. Verification record (2026-09-11)

- `npm run typecheck` → rc 0 · `npm run build` → rc 0 · `npm run check` → rc 0.
- `dist/` regenerated (fresh mtimes; bundle hashes deterministic/diff-stable).
- UTF-8: 56/56 tracked+untracked source files strict UTF-8, no BOM (incl. the previously
  mixed-encoding `LoginOverlay.vue` / `login_button_fix.txt`).
- Live API smoke (against the running server on :4187): unauth save→401; register→201;
  login→200; `/api/me`→200; fresh save→`null`; POST save→200; GET echoes payload; forged
  token→401; logout→204; post-logout→401. All passed; test rows deleted afterwards.
- DB state after cleanup: 1 user (`Bravera`, real gameplay save), 4 sessions, 1 save row,
  `PRAGMA integrity_check: ok`. DB files are git-ignored (`*.db`, `*.db-journal`, `*.db-shm`).

## 5. Known limitations & decisions

- **GitHub Pages is static** — it does not run `server/auth.ts` and there is no `/api`
  route to proxy to. The deployed game runs fully in **guest mode** (localStorage saves),
  but the account UI (login/register/cloud-save) will show errors on the live site until the
  backend runs somewhere reachable. Options, in order of effort:
  1. Host `server/auth.ts` on an always-on Node host (Render/Railway/Fly, free tiers; the
     Linux `better-sqlite3` prebuild exists). Build the client with
     `VITE_API_BASE=https://your-host` — `useAuth.ts` then calls that origin (CORS is
     already `*` server-side). Unset = relative `/api/*` (dev proxy / static 405).
  2. Gate the auth UI behind a build flag for Pages-only releases.
- **Privacy:** GH Pages project sites are public-only on the free plan; private Pages
  requires GitHub Pro ($4/mo). A free alternative for a *really* private deployment is
  Cloudflare Pages/Netlify with a private repo (no per-visitor password protection on free
  tiers; Cloudflare Access gating needs a paid plan).
- **Bind log wording:** server logs `127.0.0.1:PORT` while actually binding all interfaces —
  cosmetic only.
- **Security:** the `origin` remote previously embedded a GitHub PAT in the URL
  (`https://ghp_…@github.com/…`). That token is now considered **compromised — rotate it**:
  GitHub → Settings → Developer settings → Personal access tokens → delete it, create a new
  one, and store it via Git Credential Manager / `gh auth login`, **not** in the remote URL.
  The remote URL was stripped back to the plain HTTPS form; `credential.helper = manager` is
  configured so pushes keep working.

## 6. Current refs (quick reference)

```
origin/master   b72335d  feat(auth): account system + login UI (source of truth)
origin/gh-pages b50d6b5  deploy(gh-pages): rebuild VSX with auth UI (live site)
live            https://braverakupo.github.io/VSX/
```
