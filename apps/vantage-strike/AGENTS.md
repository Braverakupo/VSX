# Agent Instructions for Vantage Strike

## Tech Stack & Architecture

* **Languages:** Use **TypeScript** for all new scripts, components, and logic structures. Avoid raw JavaScript.
* **Import Standards:** Use **extensionless imports** (e.g., `import { foo } from './foo'`) rather than explicit `.ts` extensions to prevent `vue-tsc` and `tsserver` resolution loops and CPU spikes[cite: 1].
* **State Persistence:** Use **better-sqlite3** via prebuilt binaries specifically configured for Windows execution to bypass Windows build toolchain and `node-gyp` compilation restrictions[cite: 1].
* **Frontend Framework:** Vue 3 (Composition API with `<script setup>`, TypeScript, and `tsconfig.json` configured with `"moduleResolution": "bundler"` to support extensionless imports)[cite: 1].
* **TypeScript Strictness & Unions:** Avoid dynamic union-key assignments (e.g., `data.value[key] = ...`) when dealing with mixed entity arrays; use explicit conditional branches instead[cite: 1].
* **Vite & Vue Scaffolding:** Ensure a `src/vite-env.d.ts` file containing `/// <reference types="vite/client" />` and module declarations for `*.vue` is present in all Vite-based Vue 3 projects to prevent module resolution errors[cite: 1].

## Code Intelligence & Toji Workflows

* **Structural Exploration:** Use Toji's local SQLite symbol index and Tree-sitter graph memory for codebase reconnaissance rather than scanning raw directories manually.
* **Impact & Blast Radius (`/toji-blast`):** For any modifications touching shared state, backend SQLite scripts, or runtime UI definitions (`cssScripts.ts`), leverage Toji's relationship tracking to map out dependency ripple effects before editing files.
* **Agent Context Preservation:** Rely on Toji's targeted lookups to keep active token windows clean and prevent context drift during rapid development cycles.

## Pi Agent Team Roles & Workflow Guide

Invoke specific agents using the `$` prefix (e.g., `$fixer`, `$oracle`) or let the automatic team routing coordinate tasks based on these operational boundaries:

* **`$explorer` (Reconnaissance):** Use for fast codebase mapping, finding file locations, or inspecting project layouts. Must strictly respect extensionless import conventions and Windows-compatible path resolution[cite: 3].
* **`$librarian` (Dependency & API Research):** Use for researching dependencies, library updates, or canonical references. Focus strictly on packages compatible with Windows `better-sqlite3` binaries, Vue 3 esm-bundler configurations, and Vite toolchain constraints[cite: 3].
* **`$oracle` (Deep Architecture & Reasoning):** Use for complex trade-offs, root-cause analysis, and tricky debugging. Handles asynchronous state synchronization between Vue 3 Pinia stores, SQLite write-ahead logging (WAL) transactions, and module resolution loops[cite: 3].
* **`$designer` (UI/UX & Design System):** Use for component layouts and UI flow consistency. Must enforce canonical CSS variables (`--z-*`) and runtime template components (`ZButton`, `ZOverlay`, `ZConfirmDialog`) from `cssScripts.ts` without introducing raw Tailwind[cite: 3].
* **`$fixer` (Precision Code Modification):** Use for bounded edits, targeted bug fixes, or adding tests. Must strictly adhere to project rules: extensionless imports, no dynamic union keys on mixed arrays, mandatory graceful DB shutdowns (`db.close()`), and native Windows-safe syntax (no Unix tools like `rm -rf` or background ampersands `&`)[cite: 1, 3].
* **`$reviewer` (Build Gatekeeper & QA):** Use to critique changes and hunt for regressions. Audits PRs/code for forbidden `.ts` extensions, unmanaged database file locks, missing graceful shutdowns, and decoupled type-checking compliance[cite: 1, 3].
* **`$observer` (Visual Artifact Inspector):** Use when inspecting screenshots, UI output, or non-code visual assets to evaluate alignment with layout primitives and faction themes (`[data-faction="..."]`)[cite: 3].

## Agent Collaboration & Task Pipelines

When executing complex tasks, follow these multi-agent pipelines to maintain build stability and enforce project constraints:

1. **Code Changes & Feature Work:**
   * **Step 1 (`$explorer` + Toji):** Run structural reconnaissance and `/toji-blast` to map out dependencies and analyze the code blast radius before touching any files.
   * **Step 2 (`$oracle` or `$designer`):** Validate proposed architecture or UI layout against `cssScripts.ts` design tokens, runtime templates, and Vue esm-bundler constraints.
   * **Step 3 (`$fixer`):** Implement the bounded fix strictly using extensionless imports, Windows-safe paths, and proper SQLite shutdowns (`db.close()`).
   * **Step 4 (`$reviewer`):** Audit the final change for forbidden `.ts` extensions, unmanaged file locks, or type-checking regressions.
2. **Quick Tweaks:**
   * For simple style updates or minor template additions, bypass the pipeline and delegate directly to `$fixer` with no over-engineering or preamble[cite: 1].

## Directory Structure & Organization

* **`src/`**: Frontend application source code[cite: 1].
* **`src/components/`**: Reusable Vue Single File Components (`.vue`)[cite: 1].
* **`src/composables/`**: Composition API logic, state management, and reactive hooks[cite: 1].
* **`src/types.ts`**: Global TypeScript interfaces, type aliases, and unions[cite: 1].
* **`server/`**: Backend integration, `better-sqlite3` state persistence, and server-side logic scripts[cite: 1].

## UI & Design System Standards

* **Design Tokens & Primitives:** Always use the canonical CSS variables (`--z-*`) and layout primitives (`.z-btn`, `.z-pbar`, `.zo`, etc.) defined in `templatecss.css`. Do not introduce unapproved global CSS files or random color hex codes[cite: 1].
* **UI Runtime & Components:** Reuse the built-in Vue components (`ZButton`, `ZOverlay`, `ZConfirmDialog`) and state hooks (`useConfirm`) provided in `cssScripts.ts` rather than building custom one-off modals or buttons[cite: 1].
* **Faction Theming:** Handle visual faction shifts using the `[data-faction="..."]` attribute mechanism via `applyTheme()` rather than manual inline color overrides[cite: 1].

## Workflow & Behavior Guidelines (Windows Environment)

* **Build Checks & Shell Compatibility:** Do not run automated shell verification or build commands for minor styling or component mounting unless explicitly asked. **Explicitly bar Unix-only inline commands** (such as background job ampersands `&`, `sleep`, or `/tmp` paths) when targeting Windows. Ensure all `package.json` scripts and test commands use cross-platform or native Windows-compatible syntax (avoiding bash-specific utilities like `rm -rf`)[cite: 1].
* **No Over-Engineering:** For simple UI updates, template additions, or style tweaks, apply changes directly without exhaustive planning or preamble[cite: 1].
* **Concise Output:** Keep responses brief. Show the code updates rather than explaining standard programming concepts[cite: 1].
* **Build & Compilation Performance:**
  * **Decouple Type-Checking from Bundling:** Maintain separated scripts optimized for Windows terminals (PowerShell / Command Prompt) to prevent full-project type analysis (`vue-tsc`) from blocking builds or causing Windows CPU spikes[cite: 1]:

| Script | What it does | When to use |
| --- | --- | --- |
| `dev` | esbuild transpile, hot reload, no type-check | Every iteration[cite: 1] |
| `build` | esbuild bundling, no type-check | Fast local build/deploy |
| `typecheck` | `vue-tsc --noEmit` strict check | On demand, or as a gate before release[cite: 1] |
| `check` | `typecheck + build` chained | Final pre-release validation[cite: 1] |

  * **Leverage Vite's Esbuild:** Let Vite handle fast transpilation during development (`npm run dev`), dropping build times to sub-seconds by bypassing inline compilation overhead[cite: 1].
* **File Locking & Watchers:** Configure development file watchers and server scripts to ignore database files (`*.db`, `*.db-journal`, `*.db-wal`) to prevent `EBUSY` or `SQLITE_BUSY` conflicts with `better-sqlite3` file locks on Windows[cite: 1]. Ensure server scripts implement graceful shutdowns (`db.close()`) on process termination[cite: 1].
* **Cross-Platform Paths:** Use Node's `path` module (`path.join` / `path.resolve`) or explicit forward-slash normalization for all file system traversals and asset loaders to avoid Windows backslash incompatibility[cite: 1].