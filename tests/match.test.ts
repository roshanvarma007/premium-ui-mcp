import { describe, expect, it } from 'vitest';
import { type Brief, clarifyingQuestions, matchBrief, scoreDirection } from '../src/brief/match.js';
import { concepts, stem, termMatches } from '../src/brief/vocab.js';
import { getDirection, getDirections } from '../src/directions/index.js';

const fintech = getDirection('fintech-trust')!;
const brief = (b: Partial<Brief>): Brief => ({ product_type: '', platform: 'react', ...b });

describe('vocab', () => {
  it('stems consistently across inflections', () => {
    expect(stem('banking')).toBe(stem('bank'));
    expect(stem('payments')).toBe(stem('payment'));
    expect(stem('games')).toBe(stem('game'));
    expect(stem('investing')).toBe(stem('invest'));
  });
  it('drops hype words and expands synonyms', () => {
    const c = concepts('A premium modern fintech app');
    expect(c.has(stem('premium'))).toBe(false);
    expect(c.has(stem('bank'))).toBe(true);
  });
  it('matches multi-word terms only when every word is present', () => {
    expect(termMatches('kids games', concepts('puzzle games for kids'))).toBe(true);
    expect(termMatches('kids games', concepts('puzzle games'))).toBe(false);
  });
});

describe('scoreDirection', () => {
  it('scores a clear fintech brief highly with readable reasons', () => {
    const s = scoreDirection(
      fintech,
      brief({ product_type: 'personal budgeting app', feelings: ['calm', 'trustworthy'] }),
    );
    expect(s.score).toBeGreaterThanOrEqual(18);
    expect(s.matched.join(' ')).toMatch(/built for/);
    const feels = s.matched.find((m) => m.startsWith('feels'))!;
    expect(feels).toMatch(/calm/);
    expect(feels).toMatch(/trustworthy/);
  });
  it('maps synonyms (trusted, secure, stocks)', () => {
    const s = scoreDirection(
      fintech,
      brief({ product_type: 'stock trading platform', feelings: ['secure', 'trusted'] }),
    );
    expect(s.score).toBeGreaterThan(10);
  });
  it('penalizes avoid_for hits', () => {
    const s = scoreDirection(fintech, brief({ product_type: 'casual games for kids' }));
    expect(s.score).toBeLessThan(0);
    expect(s.conflicts.length).toBeGreaterThan(0);
  });
});

describe('matchBrief', () => {
  it('returns ok for a specific brief', () => {
    const r = matchBrief(getDirections(), brief({ product_type: 'online banking dashboard' }));
    expect(r.status).toBe('ok');
    expect(r.ranked[0]!.id).toBe('fintech-trust');
  });
  it('asks for clarification when the brief is vague', () => {
    const r = matchBrief(getDirections(), brief({ product_type: 'an app' }));
    expect(r.status).toBe('needs_clarification');
    if (r.status === 'needs_clarification') {
      expect(r.questions.length).toBeGreaterThan(0);
      expect(r.questions.length).toBeLessThanOrEqual(4);
    }
  });
  it('asks for clarification when nothing fits rather than guessing', () => {
    const r = matchBrief(
      getDirections(),
      brief({ product_type: 'nightclub event listings', audience: 'party goers' }),
    );
    expect(r.status).toBe('needs_clarification');
  });
  it('is deterministic', () => {
    const b = brief({ product_type: 'insurance claims portal', feelings: ['calm'] });
    expect(JSON.stringify(matchBrief(getDirections(), b))).toBe(
      JSON.stringify(matchBrief(getDirections(), b)),
    );
  });
});

describe('clarifyingQuestions', () => {
  it('asks only for what is missing, at most four', () => {
    expect(clarifyingQuestions(brief({ product_type: 'thing' }))).toHaveLength(4);
    expect(
      clarifyingQuestions(
        brief({
          product_type: 'budgeting app',
          audience: 'students',
          feelings: ['calm'],
          surface: 'app',
        }),
      ),
    ).toEqual([]);
  });
});
