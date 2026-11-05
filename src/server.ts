import { McpServer } from '@modelcontextprotocol/server';
import { SERVER_NAME, SERVER_VERSION } from './version.js';

/**
 * Builds a fully configured MCP server instance.
 * Called once per connection by the stdio entry point, and directly by tests.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  return server;
}
