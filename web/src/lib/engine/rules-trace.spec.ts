// Gate A's rules trace: every numbered rule FeltPrep keeps in docs/rules.md
// has at least one hand-worked fixture, imported (rules.json, by its `rule`
// field) or FeltPrep's own (fixtures.ts, by its `rules`). A rule marked
// “Not used by FeltPrep”, alone or by its section, needs none. Adding a rule
// to docs/rules.md without a fixture fails here.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HAND_FIXTURES } from './fixtures.ts';
import { RULE_HANDS } from './testing.ts';

const NOT_USED = '**Not used by FeltPrep.**';
const text = readFileSync(new URL('../../../../docs/rules.md', import.meta.url), 'utf8');

/** Every numbered rule, and whether FeltPrep uses it. */
function numberedRules(): Map<string, boolean> {
	const rules = new Map<string, boolean>();
	for (const section of text.split(/^## /m).slice(1)) {
		const body = section.slice(section.indexOf('\n') + 1).trimStart();
		const sectionUnused = body.startsWith(NOT_USED);
		for (const match of section.matchAll(/^(\d+\.\d+)\. (.*)$/gm)) {
			rules.set(match[1], !(sectionUnused || match[2].startsWith(NOT_USED)));
		}
	}
	return rules;
}

const rules = numberedRules();
const kept = [...rules].filter(([, used]) => used).map(([rule]) => rule);

const traced = new Map<string, string[]>();
const trace = (rule: string, name: string) => traced.set(rule, [...(traced.get(rule) ?? []), name]);
for (const fixture of RULE_HANDS) {
	for (const rule of fixture.rule.split(/,\s*/)) trace(rule, fixture.name);
}
for (const fixture of HAND_FIXTURES) for (const rule of fixture.rules) trace(rule, fixture.name);

describe('rules trace', () => {
	it('reads the numbered rules and the ones FeltPrep does not use', () => {
		expect(rules.size).toBeGreaterThanOrEqual(45);
		expect([...rules].filter(([, used]) => !used).map(([rule]) => rule)).toEqual([
			'2.2',
			'2.3',
			'2.4',
			'13.1',
			'13.2'
		]);
	});

	it.each(kept)('rule %s has a hand-worked fixture', (rule) => {
		expect(traced.get(rule) ?? []).not.toEqual([]);
	});

	it('names only rules that exist', () => {
		// The imported fixtures name rule 10 as a whole in two places.
		const unknown = [...traced.keys()].filter((rule) => !rules.has(rule) && rule !== '10');
		expect(unknown).toEqual([]);
	});
});
