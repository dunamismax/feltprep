# Provenance

The record of everything in this repository that came from somewhere else: code, test fixtures, data tables, trained models, solver output, fonts, icons, images, sounds and text. [AGENTS.md](../AGENTS.md#10-imports-and-provenance) has the steps to follow before an import. An import and its record land in the same commit.

## FeltPrep’s own license

FeltPrep’s code is licensed under the GNU Affero General Public License, version 3 or later (`AGPL-3.0-or-later`; D-9 in [BUILD.md](../BUILD.md#settled-decisions)). [`LICENSE`](../LICENSE) is the license’s unmodified text.

The license covers the code. The terms for lesson text and for the FeltPrep name and artwork are a separate, open decision (Q-12 in BUILD.md); none of either exists yet.

## What may be imported

An import’s terms must allow its use in an AGPL-3.0-or-later work. Read the source’s own license file and file headers; do not rely on this table for anything it does not name.

| Source terms | May it be imported? | What to keep |
| --- | --- | --- |
| MIT, BSD (2- or 3-clause), ISC, Apache-2.0 | Yes | The copyright and permission notice, in `licenses/` and in the file’s header |
| GPL-3.0-only or GPL-3.0-or-later | Yes. Section 13 of both licenses allows combining the two. The imported file stays under the GPL | The file’s license statement, and a line in its header saying it remains GPL |
| AGPL-3.0-only or AGPL-3.0-or-later | Yes | Its notices |
| GPL-2.0-only | No | — |
| GPL with added terms, such as the indemnification section on RiverMind’s `poker_ai/` | Not without the owner | — |
| No license found, or terms you cannot read in full | No | — |
| Anything else | Ask the owner | — |

## Record format

One entry per import, newest first, under [Imports](#imports):

```markdown
### <what it is> · <date imported>

- **Files here:** the paths in this repository.
- **Source:** the repository or publication, the path and the commit or version.
- **License:** the SPDX identifier, where the terms were read, and where the notice is kept.
- **Copyright:** who holds it.
- **Changes:** what was altered on import, or “none”.
- **Verified:** how the copy was checked: the tests that pass here, or the published hash it matches.
```

## Imports

### The rules engine and its rules from RiverMind Poker · 2026-11-24

- **Files here:** `docs/rules.md`; in `web/src/lib/engine/`: `cards.ts`, `evaluator.ts`, `state.ts`, `pots.ts`, `seating.ts`, `random.ts`, `history.ts`, `view.ts`, `fuzz.ts`, `testing.ts`, `index.ts`, `rules.json` and the specs `cards.spec.ts`, `evaluator.spec.ts`, `rules.spec.ts`, `history.spec.ts`, `view.spec.ts`, `fuzz.spec.ts`; in `web/scripts/`: `engine/parity.ts`, `engine-bench.ts` and `engine-parity.ts`.
- **Source:** `https://github.com/dunamismax/rivermind-poker` at commit `233b9c67934df790f13e02f4ce56209496712203` (2026-11-24), exported with `git archive`. The engine files are unchanged from there to `e5e7353`, RiverMind’s `main` on the day. Paths there: `web/src/lib/engine/` for the cards, the evaluator and their specs; `web/src/lib/server/engine/` for everything else in the engine, `parity.ts` included; `web/scripts/` for the two scripts; `docs/rules.md`. The SHA-256 of each source file, as exported, is listed below.
- **License:** GPL-3.0-or-later, read in RiverMind’s `LICENSE`, `pyproject.toml` and `web/package.json`. The license text is kept in [`licenses/GPL-3.0.txt`](../licenses/GPL-3.0.txt) (RiverMind’s `LICENSE`, SHA-256 `3972dc97…fb36986`). Each imported TypeScript file starts with a header naming its source and saying it stays under the GPL; `rules.json` cannot carry a comment and is covered here; `docs/rules.md` says so in its introduction. Combining GPL-3.0 files with FeltPrep’s AGPL-3.0-or-later code is allowed by section 13 of both licenses (D-9). The evaluator is adapted from Deuces by Will Drevo under the MIT License, as its own header says; the notice is in [`licenses/Deuces.txt`](../licenses/Deuces.txt), copied from RiverMind’s, SHA-256 `402e31e5…c9d5027`.
- **Copyright:** the RiverMind Poker contributors (the owner of both projects); the Deuces portions, Will Drevo (2013).
- **Changes:** the files under `web/src/lib/server/engine/` moved beside the cards and evaluator in `web/src/lib/engine/`, with their relative imports adjusted, and `parity.ts` moved to `web/scripts/engine/` because it hashes with `node:crypto`. `random.ts`: `cryptoRandom` draws from the Web Crypto API with rejection sampling instead of `node:crypto`’s `randomInt`, so no engine file imports a Node module. `engine-parity.ts` takes the RiverMind copy to compare against as `--reference` instead of assuming it runs inside RiverMind. Type-only edits for FeltPrep’s stricter lint: arrays built with `new Array(n).fill(…)` got a type argument, unneeded type assertions were removed in `state.ts`, one assertion the rule misreads in `evaluator.ts` is kept with a comment, and an error is passed through `String()` in a message. Prettier reformatted the files to FeltPrep’s settings; `rules.json` is byte-identical and excluded from formatting. Comments were updated where they named RiverMind’s paths. `docs/rules.md`: a new introduction, rule 1.1 describes the Web Crypto source, and the rules for joining, held seats, seats emptying and filling, and timeouts (2.2 to 2.4, parts of 5.2, 13) are marked as not used by FeltPrep; the numbering is unchanged.
- **Verified:** every imported spec passes here, with all 33 fixtures. One run of RiverMind’s differential check against its Python reference at `233b9c6` (Python 3.12.15 through `uv`, in a scratch export of the commit): `pnpm run engine:parity -- --reference <export> --all-five` replayed 5,000 fuzzed hands (625 at each of 2 to 9 seats) with every hand record, final state and per-state digest byte-identical, and the evaluator’s rank digests identical on 100,000 seeded hands each of five, six and seven cards and on all 2,598,960 five-card hands (SHA-256 `af14c746cc10125be8d2b9eac27f2f5ebeb464d28756f0a2c0f5ffe5192746fc`). The type-only changes and the new `cryptoRandom` were in place for that run.
- **Source hashes** (SHA-256 of each file at `233b9c6`):

  ```text
  79055de5b43b0a6d4fa8e7d39cbf385dcd07d0a15c3780dadba10be6489110f4  web/src/lib/engine/cards.ts
  0ed0a7a4c708cf36eef0dd3529d72961180160ed5fb5f49db4026188d6a96242  web/src/lib/engine/cards.spec.ts
  60ad2c11fec6308b506e20f70f3f70853890c99cd6498a50dfa80481a496c765  web/src/lib/engine/evaluator.ts
  d20bfeb53b2b101b7798979e6ccf484ac374e877fdd0e3f0ebb75ba05075f296  web/src/lib/engine/evaluator.spec.ts
  96dd70db415cf2dde1f8a9a8847ee1b5af4e11fedc9eae9d5060200013ada5bc  web/src/lib/server/engine/state.ts
  cdb9f1cdfba6751c23d06f327091176abd3905822c891b9c4304f837e02d7b83  web/src/lib/server/engine/pots.ts
  eb679d743c44e48611668c78f6427e4f7eadd03ef1cf0457cbf941067eee1f26  web/src/lib/server/engine/seating.ts
  daa34c7976b67c9dba28a17829926e80193a904c0345e62d145eb824099f78e9  web/src/lib/server/engine/random.ts
  88b27af5d84900c7ed32e9ae5e4370e961532565c56e6ba48e26cf4f90e98b75  web/src/lib/server/engine/history.ts
  30274a02c9d3ad410202277860bfc3e4a76ea7e28961fc6fb2c06403c330678f  web/src/lib/server/engine/view.ts
  7ad259a85c290a17ac9f83e0e00c63da70177d051ac3fe3460694dd04065d5b7  web/src/lib/server/engine/fuzz.ts
  a08e9cbb4f44328cc6f44de148244c7dca0d266b3badee733c4653585b85ac7d  web/src/lib/server/engine/testing.ts
  5a679996a58057b8550d651881c4439ca51c30e9ebbe5c21bcce9c694756c875  web/src/lib/server/engine/index.ts
  6c60557ec8114ad173099e6ca39837baa29d4b6789a3e4de2e71d93e3bbb1f8c  web/src/lib/server/engine/parity.ts
  7550916b3c5aa64cabf7bd5521924751600ea126fc89d2bd76c657b1e65da507  web/src/lib/server/engine/rules.spec.ts
  714be5b1fe066a8bf62574f0481b322e6e09d36e2cb53461647964aea6bb71a0  web/src/lib/server/engine/history.spec.ts
  fdf2fe094efca6e543cc17a543a545d477bae00725ec8eec0b8a022e2fd21a21  web/src/lib/server/engine/view.spec.ts
  28130b160d63a474130253559c0db8fc7c26bb3e632797abcd7671150da5053d  web/src/lib/server/engine/fuzz.spec.ts
  4add7d9b7798251a41b79c1952d225aa19a87a5bc0569bd39b02251d17e43036  web/src/lib/server/engine/rules.json
  a2a332cdbf62f90274cae9512c61776fe1db7514a9c0f8f298b60fd2284088a7  web/scripts/engine-bench.ts
  53529d703b3303ca275196d5507ac41bb4cb7d443eab75b1843f593ac92ac294  web/scripts/engine-parity.ts
  63641be8ca4788a60c1904c47bdd30a38c33dc780c81434d6d5681e960933446  docs/rules.md
  ```

### The app scaffold from sv · 2026-11-24

- **Files here:** the starting point of `web/`: `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `drizzle.config.ts`, `eslint.config.js`, `prettier.config.js`, `.prettierignore`, `.gitignore`, `pnpm-workspace.yaml`, `.vscode/`, `static/robots.txt`, `src/app.html`, `src/app.d.ts`, `src/env.ts`, `src/lib/index.ts`, `src/lib/server/db/` and `src/routes/+layout.svelte`.
- **Source:** the output of `sv create` from the `sv` package, version 1.7.0 (`https://github.com/sveltejs/cli`), with the minimal TypeScript template and the add-ons prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter (node) and drizzle (postgresql).
- **License:** MIT, read in the package’s own `LICENSE` (SHA-256 `5d370bd735429fe179b36a40b5e9da846ad283c3d64bfb9eb99cba4eff9f6b2c`). The notice is kept in [`licenses/sv-cli.txt`](../licenses/sv-cli.txt), and the JavaScript and TypeScript configuration files that started from it say so in a header line. JSON, YAML and ignore files cannot carry a comment and are covered by the notice file.
- **Copyright:** the contributors to `sveltejs/cli`.
- **Changes:** most of it. Every dependency pinned to the host baseline; `postgres` replaced by `pg` with `drizzle-orm/node-postgres`; the demo schema, example tests, favicon and README removed; the database made optional; six Playwright projects against the production build; the scripts, home page, theme and `/healthz` written for FeltPrep.
- **Verified:** the full gate in [AGENTS.md](../AGENTS.md#7-commands) passes from a clean copy (see P1.1’s evidence in BUILD.md). The installed packages’ licenses were listed with `pnpm licenses list`: all MIT, ISC, BSD, Apache-2.0 or BlueOak-1.0.0, except `lightningcss` (MPL-2.0), a build-time dependency of Tailwind CSS whose code is not served.

### The license text · 2026-11-24

- **Files here:** `LICENSE`.
- **Source:** `https://www.gnu.org/licenses/agpl-3.0.txt`, fetched on 2026-11-24.
- **License:** the text itself may be copied and distributed verbatim, and may not be changed.
- **Copyright:** Free Software Foundation, Inc.
- **Changes:** none.
- **Verified:** 34,523 bytes, SHA-256 `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`, byte-identical to the copy in the owner’s `lorehallow` repository.

No data table, model, font or artwork has been imported yet. Packages installed from the registry are listed with exact versions in `web/package.json` and `web/pnpm-lock.yaml`.
