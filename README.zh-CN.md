# mcp-skill-doctor

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-ready-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Release](https://img.shields.io/github/v/release/Hazel-Lin/mcp-skill-doctor)](https://github.com/Hazel-Lin/mcp-skill-doctor/releases)

诊断你的本地 MCP server 或 skill 为什么起不来。

`mcp-skill-doctor` 是一个本地优先的 CLI，专门处理 MCP 落地时最烦的那层摩擦：`PATH`、`cwd`、环境变量、路径引用，以及进程刚启动就退出。

如果你在做 MCP server 或 agent skill，这个工具适合在你开始怀疑客户端之前先跑一遍。

## 为什么要做它

- `Inspector` 适合在 server 已经连上之后继续测试
- `Validator` 负责检查协议合规性
- `mcp-skill-doctor` 负责在它们之前，先找出你本地为什么起不来

如果你想看一个真实的失败报告，可以直接跑：

```bash
pnpm run check:broken
```

## 它能查什么

- 命令是否在 `PATH` 里
- `cwd` 或引用文件是否存在
- 必需的环境变量是否缺失
- 进程是否一启动就退出
- 本地 `stdio` 场景下是否有 transport 不匹配

## MVP 范围

- 诊断本地 `stdio` MCP server 启动问题
- 检查命令可用性、配置结构、工作目录和必需环境变量
- 探测目标进程是否能正常启动或提前退出
- 输出带 `PASS / WARN / FAIL` 的可执行结果和修复建议

## 为什么值得 star

- 小而实用，几分钟就能看懂
- 每次接新 MCP server 都能用
- 本地可跑，适合分享给同事或朋友
- 解决的是真实启动摩擦，而不是抽象协议话题

## 快速开始

```bash
pnpm install
pnpm run check:valid
pnpm run probe:fake
```

## 配置格式

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

## 命令说明

### `check`

检查配置、本地环境和启动前提条件。

```bash
pnpm run check:valid
```

### `probe`

启动一个本地进程，观察它是否能正常启动，还是会提前退出。

```bash
pnpm run probe:fake
```

## 输出示例

```text
FAIL command "uvx-not-installed" not found in PATH
FAIL cwd does not exist: /.../examples/missing-dir
FAIL missing env var OPENAI_API_KEY
FAIL referenced path does not exist: examples/missing-server.js
PASS process started successfully: node
```

## 已验证命令

当前版本已经用下面这些命令做过 smoke test：

```bash
pnpm run check:broken
pnpm run check:valid
pnpm run probe:fake
pnpm run probe:crash
```

## 路线图

- Claude Desktop / Cursor / Cline 的 client-aware 配置诊断
- HTTP transport 检查
- 更安全的自动修复建议
- skill audit 和安全检查

## 开源信息

- License: [MIT](./LICENSE)
- 贡献指南: [CONTRIBUTING.md](./CONTRIBUTING.md)
- 安全政策: [SECURITY.md](./SECURITY.md)
- 行为准则: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

如果你想贡献，建议从一个小 fixture、更清晰的诊断结果，或者一个新的启动失败场景开始。

## 状态

`v0.1.0` 是第一个公开版本。这个项目故意保持窄范围：先解决本地启动诊断，其他能力后面再加。
