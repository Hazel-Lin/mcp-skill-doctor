# mcp-skill-doctor

Diagnose why your local MCP server or skill will not start.

`mcp-skill-doctor` is a CLI-first troubleshooting tool for the most painful part of MCP adoption: setup and startup failures on a local machine.

## MVP Scope

- Diagnose local `stdio` MCP server startup issues
- Validate command availability, config shape, working directory, and required environment variables
- Probe whether the target process starts cleanly or exits immediately
- Print actionable `PASS / WARN / FAIL` results with remediation hints

## Quick Start

```bash
node src/cli.js check --config examples/broken-server.json
node src/cli.js probe --command node -- args examples/fake-server.js
```

## Config Format

```json
{
  "name": "example-server",
  "command": "node",
  "args": ["examples/fake-server.js"],
  "cwd": ".",
  "transport": "stdio",
  "requiredEnv": ["OPENAI_API_KEY"]
}
```

## Commands

### `check`

Validate config, local environment, and startup preconditions.

```bash
node src/cli.js check --config path/to/server.json
```

### `probe`

Start a local process and watch whether it spawns correctly or exits too early.

```bash
node src/cli.js probe --command node -- args path/to/server.js
```

## Example Output

```text
FAIL command "uvx-not-installed" not found in PATH
FAIL cwd does not exist: /.../examples/missing-dir
FAIL missing env var OPENAI_API_KEY
FAIL referenced path does not exist: examples/missing-server.js
PASS process started successfully: node
```

## Verified Commands

The current MVP was smoke-tested with:

```bash
node src/cli.js check --config examples/broken-server.json
node src/cli.js check --config examples/valid-server.json
node src/cli.js probe --command node -- args examples/fake-server.js
node src/cli.js probe --command node -- args examples/crash-server.js
```

## Roadmap

- Client-aware config diagnosis for Claude Desktop / Cursor / Cline
- HTTP transport checks
- Safer auto-fix suggestions
- Skill audit and security linting

## Open Source

- License: [MIT](./LICENSE)
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

If you want to contribute, start with a small fixture, a clearer diagnostic, or a new startup failure case.
