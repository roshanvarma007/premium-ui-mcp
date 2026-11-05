import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

describe('createServer', () => {
  it('builds a server instance', () => {
    expect(createServer()).toBeDefined();
  });
});
