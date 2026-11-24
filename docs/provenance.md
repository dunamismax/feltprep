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

### The license text · 2026-11-24

- **Files here:** `LICENSE`.
- **Source:** `https://www.gnu.org/licenses/agpl-3.0.txt`, fetched on 2026-11-24.
- **License:** the text itself may be copied and distributed verbatim, and may not be changed.
- **Copyright:** Free Software Foundation, Inc.
- **Changes:** none.
- **Verified:** 34,523 bytes, SHA-256 `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`, byte-identical to the copy in the owner’s `lorehallow` repository.

No code, data, model, font or artwork has been imported yet.
