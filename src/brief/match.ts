// Maps a structured design brief to a ranked list of directions.
// Pure and deterministic: same brief, same ranking, same reasons.
import type { PlatformId, Surface } from '../platforms.js';
import type { Direction } from '../schema/direction.schema.js';
import { concepts, termMatches, words } from './vocab.js';

export interface Brief {
  product_type: string;
  audience?: string | undefined;
  feelings?: string[] | undefined;
  platform: PlatformId;
  surface?: Surface | undefined;
  constraints?: string[] | undefined;
}

export interface ScoredDirection {
  id: string;
  score: number;
  /** Positive signals, most important first. */
  matched: string[];
  /** Negative signals (avoid_for hits). */
  conflicts: string[];
}

export type MatchResult =
  | { status: 'ok'; ranked: ScoredDirection[] }
  | { status: 'needs_clarification'; questions: string[]; ranked: ScoredDirection[] };

const W = {
  productBestFor: 10,
  productBestForExtra: 3,
  audienceBestFor: 4,
  feelingMood: 4,
  productMood: 2,
  surface: 5,
  productAvoid: -20,
  audienceAvoid: -12,
} as const;

const SURFACE_TERMS: Record<Surface, string[]> = {
  game: ['game', 'games', 'casual games', 'puzzle games'],
  ecommerce: ['e-commerce', 'ecommerce', 'shop', 'store', 'marketplace', 'retail'],
  dashboard: ['dashboard', 'analytics', 'saas', 'productivity', 'admin'],
  landing: [],
  app: [],
};

export function scoreDirection(d: Direction, brief: Brief): ScoredDirection {
  const product = concepts(brief.product_type);
  const audience = concepts(brief.audience ?? '');
  const feelings = concepts((brief.feelings ?? []).join(' '));
  const matched: string[] = [];
  const conflicts: string[] = [];
  let score = 0;

  const productHits = d.best_for.filter((t) => termMatches(t, product));
  if (productHits.length > 0) {
    score += W.productBestFor + W.productBestForExtra * Math.min(productHits.length - 1, 3);
    matched.push(`built for ${productHits.slice(0, 3).join(', ')}`);
  }
  const audienceHits = d.best_for.filter(
    (t) => termMatches(t, audience) && !productHits.includes(t),
  );
  if (audienceHits.length > 0) {
    score += W.audienceBestFor;
    matched.push(`audience fits ${audienceHits.slice(0, 2).join(', ')}`);
  }

  const moodHits = d.mood.filter((m) => termMatches(m, feelings));
  if (moodHits.length > 0) {
    score += W.feelingMood * Math.min(moodHits.length, 3);
    matched.push(`feels ${moodHits.slice(0, 3).join(', ')}`);
  }
  const productMoodHits = d.mood.filter((m) => termMatches(m, product) && !moodHits.includes(m));
  score += W.productMood * Math.min(productMoodHits.length, 2);

  if (brief.surface) {
    const terms = SURFACE_TERMS[brief.surface];
    if (terms.some((t) => d.best_for.some((b) => termMatches(t, concepts(b))))) {
      score += W.surface;
      matched.push(`suits ${brief.surface} surfaces`);
    }
  }

  const avoidProduct = d.avoid_for.filter((t) => termMatches(t, product));
  const avoidAudience = d.avoid_for.filter((t) => termMatches(t, audience));
  if (avoidProduct.length > 0) {
    score += W.productAvoid;
    conflicts.push(`not meant for ${avoidProduct.join(', ')}`);
  }
  if (avoidAudience.length > 0) {
    score += W.audienceAvoid;
    conflicts.push(`audience conflicts: ${avoidAudience.join(', ')}`);
  }

  return { id: d.id, score, matched, conflicts };
}

/** Questions to ask when the brief is too thin to choose with confidence (max 4). */
export function clarifyingQuestions(brief: Brief): string[] {
  const q: string[] = [];
  if (concepts(brief.product_type).size === 0) {
    q.push(
      'What exactly are you building? Name the product category (for example: budgeting app, jewelry store, puzzle game, developer docs).',
    );
  }
  if (!brief.audience || words(brief.audience).length === 0) {
    q.push(
      'Who is it for? (for example: first-time investors, busy parents, enterprise IT admins)',
    );
  }
  if (!brief.feelings || brief.feelings.length === 0) {
    q.push(
      'What should it feel like, in 2 or 3 words? (for example: calm and trustworthy, bold and playful, quiet luxury)',
    );
  }
  if (!brief.surface) {
    q.push(
      'Which surface comes first: a landing page, an app screen, a dashboard, a store or a game UI?',
    );
  }
  return q.slice(0, 4);
}

export function matchBrief(directions: readonly Direction[], brief: Brief): MatchResult {
  const ranked = directions
    .map((d) => scoreDirection(d, brief))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const top = ranked[0];
  const hasSignal = top !== undefined && top.score > 0 && top.matched.length > 0;
  if (!hasSignal) {
    const questions = clarifyingQuestions(brief);
    return {
      status: 'needs_clarification',
      questions:
        questions.length > 0
          ? questions
          : [
              'None of the shipped directions clearly fits this product. Describe the product category and the feeling you want in other words, or pick one from list_directions.',
            ],
      ranked,
    };
  }
  return { status: 'ok', ranked };
}
