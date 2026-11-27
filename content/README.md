# FeltPrep content

Lessons live in `lessons/`, one Markdown file each, in the subset that `web/src/lib/lessons/markdown.ts` reads. Each starts with a header naming its `id` (the file name without `.md`), `title`, `summary`, the `spots` it teaches (spot IDs from `solutions/registry.json`) and its `order`. The build refuses a lesson that names an unknown spot or strays outside the subset.

## License

The text of the lessons in this directory is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/) (`CC-BY-SA-4.0`): anyone may share and adapt it, with credit to FeltPrep, under the same terms. Every lesson page says so and links to the license.

This license covers the lesson text only. FeltPrep’s code is under the GNU AGPL, version 3 or later (`LICENSE` at the repository root), and the FeltPrep name, logo and artwork are reserved and covered by neither license (D-12 in `BUILD.md`).

Lessons are original writing. Charts, ranges, hand examples and wording are not copied from books, training sites or solver products; the numbers a lesson quotes come from FeltPrep’s own registered solutions.
