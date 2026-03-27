# Contributing

Thanks for considering a contribution to `mcp-skill-doctor`.

## What We Want

- Reproducible bug reports
- Small, focused fixes
- Clear fixture-based test cases for startup failures
- Improvements to diagnostics and remediation hints

## Development Workflow

1. Fork the repository
2. Create a branch for your change
3. Keep changes scoped to a single concern
4. Update docs or examples when behavior changes
5. Open a pull request with a clear before/after description

## Local Checks

Run the current smoke commands before opening a PR:

```bash
node src/cli.js check --config examples/broken-server.json
node src/cli.js check --config examples/valid-server.json
node src/cli.js probe --command node -- args examples/fake-server.js
node src/cli.js probe --command node -- args examples/crash-server.js
```

## Good First Contributions

- Add new failure fixtures
- Improve error messages
- Add JSON output mode
- Add client-aware config readers
- Improve path and env diagnostics

## Scope Guardrails

Please avoid expanding the project into a full MCP inspector, marketplace, or hosted service in a single PR. The core product is a fast local startup doctor.
