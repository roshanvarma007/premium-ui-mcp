# Testing the local build

Install the clone you are working in (no npm publish needed) into Claude Code and Claude
Desktop. Windows paths are written with forward slashes where the shell allows it; Node and
the MCP clients accept them.

## 0. Build

```bash
cd F:/premium-ui-mcp
npm install
npm run build
```

Re-run `npm run build` after any code change, then restart the client (Claude Desktop) or
run `/mcp` and reconnect (Claude Code). The entry point is `F:/premium-ui-mcp/dist/index.js`;
it needs Node 22 or newer and speaks MCP over stdio. There is no network access and no
telemetry.

Quick check that the build works, from any folder:

```bash
npx -y @modelcontextprotocol/inspector --cli node F:/premium-ui-mcp/dist/index.js --method tools/list
```

You should see 8 tools: `get_design_direction`, `get_theme_code`, `list_directions`,
`check_contrast`, `get_anti_patterns`, `review_ui`, `get_layout_blueprint`,
`get_review_rubric`.

## 1. Claude Code (CLI)

Needs the `claude` command on your PATH.

```bash
claude mcp add --transport stdio --scope user premium-ui -- node F:/premium-ui-mcp/dist/index.js
```

- `--scope user` makes it available in every project (stored in `~/.claude.json`).
  Use `--scope local` (the default) to limit it to the current project.
- Options go before the name; everything after `--` is the server command.

Verify and remove:

```bash
claude mcp list
claude mcp get premium-ui
claude mcp remove premium-ui
```

Inside a session, `/mcp` shows the status of each server. The tools appear as
`mcp__premium-ui__get_design_direction` and so on.

## 2. Claude Desktop

1. Open **Settings > Developer > Edit Config**. This creates
   `claude_desktop_config.json` if it does not exist and opens it. On Windows it lives in
   `%APPDATA%\Claude\`. For the Microsoft Store build, that folder is redirected into the app's
   package folder, which is why the Edit Config button is the safest way to find it.
2. Add the server (keep any existing `mcpServers` entries):

```json
{
  "mcpServers": {
    "premium-ui": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["F:\\premium-ui-mcp\\dist\\index.js"]
    }
  }
}
```

   Use the absolute path to `node.exe`: the desktop app does not necessarily inherit your
   shell's PATH (or the version `nvm` selected). Check yours with `where node`. Any Node 22+
   works, for example `C:\\nvm4w\\nodejs\\node.exe`.
3. **Fully quit** Claude Desktop (including the tray icon), then start it again.
4. Confirm it loaded: open the **+** menu in the message box, then Connectors, and look for
   `premium-ui` with its tools.
5. If it does not appear, read the logs in `%APPDATA%\Claude\logs\`: `mcp.log` for connections
   and `mcp-server-premium-ui.log` for the server's own stderr output.

Per the Claude Code docs, servers in `claude_desktop_config.json` are also loaded into local
sessions of the **Code tab** inside the Claude desktop app. If you use Claude Code through the
desktop app and do not have the `claude` CLI, step 2 is all you need.

## 3. The Skill (optional but recommended)

The Skill teaches Claude when and how to call the tools (brief first, theme before screens,
review loop).

Claude Code (personal skill, picked up without a restart):

```bash
mkdir -p ~/.claude/skills && cp -r F:/premium-ui-mcp/skills/premium-ui ~/.claude/skills/
```

Claude Desktop (chat) takes skills as a ZIP with the skill folder at the top level. Build it
outside the repo:

```powershell
Compress-Archive -Path F:\premium-ui-mcp\skills\premium-ui -DestinationPath $env:TEMP\premium-ui.zip -Force
```

Then upload it under Customize > Skills (check the current Anthropic help article if the
menu has moved).

## 4. Try it

- "Build a landing page for a household budgeting app for couples. Calm and trustworthy. Plain HTML."
- "Design the home screen of a Jetpack Compose banking app."
- "Review this component for AI-look problems" (paste code, or point it at a file).

You should see it ask for any missing brief fields, call `get_design_direction`, write the
theme files first, build with tokens only, and run `review_ui` before presenting.

## 5. Uninstall

```bash
claude mcp remove premium-ui
```

For Desktop, delete the `premium-ui` entry from `claude_desktop_config.json` and restart. For
the Skill, delete `~/.claude/skills/premium-ui`.
