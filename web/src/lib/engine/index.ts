// Imported from RiverMind Poker (https://github.com/dunamismax/rivermind-poker),
// web/src/lib/server/engine/index.ts at commit 233b9c6.
// Licensed GPL-3.0-or-later (licenses/GPL-3.0.txt): it stays under the GPL
// inside AGPL-licensed FeltPrep. Changes on import are in docs/provenance.md.
//
// No-limit Texas hold'em engine for 2 to 9 seats (docs/rules.md), ported from
// the Python reference in rivermind/engine (P4B.4). The engine is pure: states
// are immutable, there is no global mutable state, and randomness comes only
// from the caller. Every file is browser-safe.

export { buildDeck, card, cardStr, cards, cardsStr, pretty } from './cards.ts';
export { describe, evaluate, rankClass } from './evaluator.ts';
export type { Pot } from './pots.ts';
export { cryptoRandom, seededRandom, shuffle, type Random } from './random.ts';
export { blindSeats, dealOrder, initialButton, nextButton, seatsDealtIn } from './seating.ts';
export * from './state.ts';
export { opponents, seatView, stackOf, streetActions, toCall, type SeatView } from './view.ts';
