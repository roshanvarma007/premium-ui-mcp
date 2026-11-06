// Checklist for Claude to apply to a screenshot it can see. The server never analyzes images.

export interface RubricCriterion {
  id: string;
  name: string;
  question: string;
  pass: string[];
  fail: string[];
  weight: 1 | 2 | 3;
}

export const RUBRIC: readonly RubricCriterion[] = [
  {
    id: 'focal-point',
    name: 'One focal point',
    question: 'Within two seconds, is it obvious what matters most on this screen?',
    pass: [
      'One element clearly dominates through size, weight or isolation',
      'Exactly one primary action',
    ],
    fail: [
      'Several elements compete at the same visual weight',
      'Two or more solid accent buttons in view',
    ],
    weight: 3,
  },
  {
    id: 'hierarchy',
    name: 'Hierarchy',
    question:
      'Can you read the screen in order (title, key content, supporting detail, actions) without effort?',
    pass: ['Size and weight steps are clear and few', 'Secondary text is visibly muted'],
    fail: ['Everything is bold or the same size', 'Hierarchy relies on color alone'],
    weight: 3,
  },
  {
    id: 'spacing-rhythm',
    name: 'Spacing rhythm',
    question:
      'Do gaps repeat in a consistent rhythm, with more space between groups than within them?',
    pass: [
      'Related items are tight, groups are separated generously',
      'Margins are equal on both sides',
    ],
    fail: [
      'Random-looking gaps',
      'Cramped edges or content touching containers',
      'Every gap the same size',
    ],
    weight: 2,
  },
  {
    id: 'alignment',
    name: 'Alignment',
    question: 'Do edges line up on a small number of vertical lines?',
    pass: ['Text, cards and controls share left edges', 'Numbers align right in columns'],
    fail: [
      'Centered and left-aligned text mixed without reason',
      'Items a few pixels off each other',
    ],
    weight: 2,
  },
  {
    id: 'contrast',
    name: 'Contrast and legibility',
    question: 'Is all text easy to read, including muted text and text on images?',
    pass: [
      'Body text is dark on light (or light on dark) with clear contrast',
      'No text under about 12px',
    ],
    fail: [
      'Grey-on-grey captions',
      'Text over busy imagery without a plate',
      'Thin weights at small sizes',
    ],
    weight: 3,
  },
  {
    id: 'density',
    name: 'Density fits the product',
    question:
      'Is the amount of information right for the audience (calm for consumers, dense but ordered for experts)?',
    pass: ['Whitespace is used deliberately', 'Dense views keep a strict grid'],
    fail: ['Empty hero with nothing to do', 'Wall of cards with no breathing room'],
    weight: 1,
  },
  {
    id: 'color-restraint',
    name: 'Color restraint',
    question: 'Is there one accent, with neutrals doing the structural work?',
    pass: [
      'Accent used only for primary actions, selection and key data',
      'Semantic colors only for meaning',
    ],
    fail: [
      'Several accent colors',
      'Colored backgrounds on every section',
      'Gradients used as decoration',
    ],
    weight: 2,
  },
  {
    id: 'typography',
    name: 'Typography',
    question: 'Are there few type sizes, a deliberate pairing and good line lengths?',
    pass: ['At most about 5 sizes visible', 'Line length about 45-75 characters for body text'],
    fail: [
      'Many slightly different sizes',
      'Default system or Inter everywhere when a direction defines fonts',
      'Full-width paragraphs',
    ],
    weight: 2,
  },
  {
    id: 'consistency',
    name: 'Consistency',
    question: 'Do the same things look the same (buttons, cards, radii, icons)?',
    pass: [
      'At most 3 corner radii',
      'One icon set and stroke weight',
      'Buttons share height and style by role',
    ],
    fail: ['Mixed radii and icon styles', 'Some cards with shadows, some without, for no reason'],
    weight: 2,
  },
  {
    id: 'ai-look',
    name: 'Free of the AI look',
    question: 'Would a designer mistake this for a generated template?',
    pass: ['Palette, type and layout feel chosen for this product'],
    fail: [
      'Navy or near-black with cyan or purple',
      'Glassmorphism, glows, gradient blobs',
      'Emoji as icons',
      'Generic copy such as "Welcome to the future of X"',
    ],
    weight: 3,
  },
  {
    id: 'states',
    name: 'States and realism',
    question: 'Does the content look real, and are empty, loading and error states considered?',
    pass: ['Realistic names, numbers and copy', 'Visible handling of edge cases where relevant'],
    fail: ['Lorem ipsum or placeholder copy', 'Only the perfect happy path'],
    weight: 1,
  },
  {
    id: 'touch',
    name: 'Touch and interaction',
    question: 'Are interactive elements obviously interactive and large enough to tap?',
    pass: ['Targets look at least about 44-48 high', 'Clear pressed, selected and disabled states'],
    fail: ['Tiny icon-only controls', 'Links that look like plain text'],
    weight: 1,
  },
];

export function rubricMaxScore(): number {
  return RUBRIC.reduce((n, c) => n + c.weight * 2, 0);
}
