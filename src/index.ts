#!/usr/bin/env node
// Entry point: stdio MCP server. stdout is reserved for protocol messages;
// every log line must go to stderr.
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';

const handle = serveStdio(() => createServer(), {
  onerror: (error) => {
    console.error(`[premium-ui-mcp] ${error.message}`);
  },
});

const shutdown = () => {
  void handle.close().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
