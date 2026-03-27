# MVP PRD: mcp-skill-doctor

## 1. Summary

`mcp-skill-doctor` is a local-first CLI that diagnoses why a local MCP server or skill will not start. The MVP focuses on the setup/debugging entry point, not protocol compliance or full observability.

## 2. Problem

Developers trying to use MCP tools often hit the same failure pattern:

- The config looks correct, but the server does not start
- The command is missing from `PATH`
- A required env var is unset
- The working directory or referenced file does not exist
- The process starts and exits immediately

Today, these failures cost too much time because the user does not know which layer is broken.

## 3. Target User

- Indie developers and AI builders integrating local MCP servers
- Builders using local skills and agent workflows
- Tool authors who want fewer setup-related support requests

## 4. Product Positioning

`mcp-skill-doctor` sits before inspector/validator tools.

- Inspector answers: "Now that it connects, what can I test?"
- Validator answers: "Does it comply with the spec?"
- `mcp-skill-doctor` answers: "Why does it not even start correctly on this machine?"

## 5. MVP Goal

Help a user run one CLI command and immediately identify the most likely startup failure with a concrete remediation hint.

## 6. MVP Scope

### In Scope

- CLI interface
- Generic config-file-based diagnosis
- Local `stdio` process startup checks
- Command existence checks
- `cwd` path checks
- `requiredEnv` checks
- Basic startup probe with timeout and early-exit detection
- Human-readable report with `PASS / WARN / FAIL`

### Out of Scope

- GUI / dashboard
- Hosted service
- Protocol-compliance test suite
- Full MCP handshake validation
- Automatic fixes
- HTTP transport support
- Multi-client integrations

## 7. User Stories

1. As a builder, I want to point the tool at a config file and know whether the local command can run.
2. As a builder, I want to know which env var or path is missing before opening my MCP client.
3. As a builder, I want to see whether the process exits immediately so I stop guessing.

## 8. CLI Design

### Command 1

`check --config <path>`

Expected behavior:

- Reads config JSON
- Validates required fields
- Checks command availability
- Checks working directory
- Checks required env vars
- Optionally probes the process

### Command 2

`probe --command <cmd> -- args...`

Expected behavior:

- Spawns the provided command
- Watches startup for a short timeout
- Reports spawn errors or early exit

## 9. Success Criteria

- A broken sample config produces at least one meaningful `FAIL`
- A valid sample config produces only `PASS`/`WARN`
- A user can understand the output without reading source code
- README quick start works locally

## 10. Risks

- Scope creep into inspector/validator territory
- Trying to support too many client formats too early
- Overfitting the config shape to one ecosystem

## 11. Phase 2 Extensions

- Claude Desktop / Cursor config readers
- MCP config auto-discovery
- Security checks
- JSON output for CI usage
- Test fixture pack for common failure modes
