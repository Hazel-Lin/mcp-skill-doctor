# Findings

## Product Findings

- `mcp-skill-doctor` should target the setup/debugging entry point rather than generalized MCP observability.
- The MVP should focus on why a local MCP server will not start or connect correctly.
- Actionable remediation is part of the product value, not a nice-to-have.

## Implementation Findings

- Planning files and implementation should live in the same new project root.
- Node.js is available locally and is the fastest path to a zero-dependency CLI MVP.
- The MVP should avoid client-specific config parsing in the first release.
- A generic config format is sufficient for the first build if the scope stays on local startup diagnosis.
- A simple `check` + `probe` CLI pair is enough to demonstrate value in the first release.
- Early-exit detection plus actionable hints already creates a convincing MVP wow moment.
- For open-source readiness, the project needs clear scope guardrails so contributors do not expand it into a generic inspector or platform.
- For the local repo, `pnpm run ...` is a more reliable validation path than `pnpm exec mcp-skill-doctor` before publishing the package.
