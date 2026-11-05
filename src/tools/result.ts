// Helpers for building tool results: concise text for the model, plus structured JSON.

export interface ToolText {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function ok(text: string, structured?: Record<string, unknown>): ToolText {
  return structured
    ? { content: [{ type: 'text', text }], structuredContent: structured }
    : { content: [{ type: 'text', text }] };
}

export function fail(message: string): ToolText {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/** Pretty JSON (key order as authored) in a fenced block, for embedding in text output. */
export function json(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}
