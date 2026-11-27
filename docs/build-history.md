# Build history

Handoff entries moved out of [BUILD.md](../BUILD.md#handoff-log), which keeps the newest eight. Oldest last.

### 2026-11-24 · Planning · Foundational documents

- **Completed:** README.md, AGENTS.md and BUILD.md written and committed as the first commit on `main`. `origin` was given GitHub and Codeberg push URLs, as the owner’s other repositories have. No code exists.
- **Verified:** read both reference repositories’ AGENTS.md, README.md and BUILD.md; RiverMind’s engine, bots, tests, licenses and evaluations at `233b9c6`. Ran its TypeScript engine benchmark and a 16,000-hand fuzz read-only from a scratch directory (results in the reuse assessment). Checked that the links between the three documents resolve and that every cited RiverMind path exists. Not run: RiverMind’s pytest, Vitest and parity suites.
- **Open decisions:** Q-1 to Q-11 raised with defaults.
- **Next ready task:** P1.1, starting with the current SvelteKit 3 documentation and `sv create` in `web/`.
