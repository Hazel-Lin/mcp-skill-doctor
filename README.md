# mcp-skill-doctor

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-ready-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Release](https://img.shields.io/github/v/release/Hazel-Lin/mcp-skill-doctor)](https://github.com/Hazel-Lin/mcp-skill-doctor/releases)

Local-first CLI to diagnose why your MCP server or skill will not start.

It checks the boring but expensive stuff first: `PATH`, `cwd`, required env vars, missing files, and processes that exit before the client can use them.

If you build MCP servers or agent skills, this is the quick pre-flight check worth keeping around.

中文版本请见 [README.zh-CN.md](./README.zh-CN.md).

## Why this exists

- `Inspector` helps after a server is already reachable
- `Validator` checks protocol compliance
- `mcp-skill-doctor` finds the reason your local setup fails before either of those help

Try `pnpm run check:broken` to see a realistic failure report.

## What it catches

- Command not found in `PATH`
- Missing `cwd` or referenced file
- Missing required environment variables
- Processes that exit immediately
- Transport mismatch for local `stdio` setups

## MVP Scope

- Diagnose local `stdio` MCP server startup issues
- Validate command availability, config shape, working directory, and required environment variables
- Probe whether the target process starts cleanly or exits immediately
- Print actionable `PASS / WARN / FAIL` results with remediation hints

## Why star this

- Small enough to understand in one sitting
- Useful every time you wire up a new MCP server
- Easy to run locally and easy to share with teammates
- Built around real startup friction, not abstract spec talk

## Quick Start

```bash
pnpm install
pnpm run check:valid
pnpm run probe:fake
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
pnpm run check:valid
```

### `probe`

Start a local process and watch whether it spawns correctly or exits too early.

```bash
pnpm run probe:fake
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
pnpm run check:broken
pnpm run check:valid
pnpm run probe:fake
pnpm run probe:crash
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

## Status

`v0.1.0` is the first public release. The project is intentionally narrow: local startup diagnosis first, everything else later.
