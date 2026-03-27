#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

type Status = "PASS" | "WARN" | "FAIL";

type Diagnostic = {
  status: Status;
  message: string;
  hint?: string;
};

type Config = {
  name?: string;
  command?: string;
  args?: unknown;
  cwd?: string;
  transport?: string;
  requiredEnv?: unknown;
};

type NormalizedConfig = {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  transport: string;
  requiredEnv: string[];
};

function printUsage(): void {
  console.log(`mcp-skill-doctor

Usage:
  mcp-skill-doctor check --config <path>
  mcp-skill-doctor probe --command <cmd> -- args...
`);
}

function result(status: Status, message: string, hint?: string): Diagnostic {
  return { status, message, hint };
}

function printResults(results: Diagnostic[]): void {
  for (const item of results) {
    console.log(`${item.status} ${item.message}`);
    if (item.hint) {
      console.log(`     hint: ${item.hint}`);
    }
  }
}

function exitFromResults(results: Diagnostic[]): void {
  process.exitCode = results.some((item) => item.status === "FAIL") ? 1 : 0;
}

function parseFlags(tokens: string[]): Record<string, string | boolean | string[]> {
  const flags: Record<string, string | boolean | string[]> = {};
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "--") {
      flags["--"] = tokens.slice(i + 1);
      break;
    }

    if (!token.startsWith("--")) {
      i += 1;
      continue;
    }

    const next = tokens[i + 1];
    if (!next || next.startsWith("--")) {
      flags[token] = true;
      i += 1;
      continue;
    }

    flags[token] = next;
    i += 2;
  }

  return flags;
}

function safeReadJson(filePath: string): { data?: Config; error?: Error } {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { data: JSON.parse(raw) as Config };
  } catch (error) {
    return { error: error as Error };
  }
}

function commandExists(command: string): string {
  const probe = spawnSync("sh", ["-lc", `command -v ${shellQuote(command)}`], {
    stdio: "pipe",
    encoding: "utf8"
  });

  return probe.status === 0 ? probe.stdout.trim() : "";
}

function shellQuote(value: string): string {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeConfig(configPath: string, config: Config): NormalizedConfig {
  return {
    name: config.name || "unnamed-server",
    command: config.command || "",
    args: Array.isArray(config.args) ? config.args.map((arg) => String(arg)) : [],
    cwd: config.cwd ? path.resolve(path.dirname(configPath), config.cwd) : process.cwd(),
    transport: config.transport || "stdio",
    requiredEnv: Array.isArray(config.requiredEnv) ? config.requiredEnv.map((item) => String(item)) : []
  };
}

function validateConfigShape(config: NormalizedConfig): Diagnostic[] {
  const results: Diagnostic[] = [];

  if (!config.command) {
    results.push(result("FAIL", 'missing required string field "command"', "Add a runnable command such as node, npx, uvx, or python."));
  } else {
    results.push(result("PASS", `command field present: ${config.command}`));
  }

  results.push(result("PASS", `args array present (${config.args.length} entries)`));

  if (config.transport !== "stdio") {
    results.push(result("WARN", `transport "${config.transport}" is outside MVP support`, "The MVP focuses on local stdio startup diagnosis."));
  } else {
    results.push(result("PASS", "transport is stdio"));
  }

  return results;
}

function looksLikeLocalPath(value: string): boolean {
  return (
    value.includes("/") ||
    value.endsWith(".js") ||
    value.endsWith(".mjs") ||
    value.endsWith(".ts") ||
    value.endsWith(".py") ||
    value.endsWith(".json")
  );
}

function runCheck(configPath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    results.push(result("FAIL", `config file not found: ${absolutePath}`, "Pass a valid JSON config path."));
    return results;
  }

  results.push(result("PASS", `config file exists: ${absolutePath}`));

  const { data, error } = safeReadJson(absolutePath);
  if (error || !data) {
    results.push(result("FAIL", `failed to parse JSON: ${error?.message ?? "Unknown error"}`, "Fix the config file syntax and try again."));
    return results;
  }

  const config = normalizeConfig(absolutePath, data);
  results.push(result("PASS", `target name: ${config.name}`));
  results.push(...validateConfigShape(config));

  if (config.command) {
    const resolvedCommand = commandExists(config.command);
    if (resolvedCommand) {
      results.push(result("PASS", `command "${config.command}" found at ${resolvedCommand}`));
    } else {
      results.push(result("FAIL", `command "${config.command}" not found in PATH`, `Install ${config.command} or add it to PATH.`));
    }
  }

  if (fs.existsSync(config.cwd)) {
    results.push(result("PASS", `cwd exists: ${config.cwd}`));
  } else {
    results.push(result("FAIL", `cwd does not exist: ${config.cwd}`, "Fix the config cwd or create the directory."));
  }

  for (const envKey of config.requiredEnv) {
    if (process.env[envKey]) {
      results.push(result("PASS", `env var present: ${envKey}`));
    } else {
      results.push(result("FAIL", `missing env var ${envKey}`, `Export ${envKey} before starting the server.`));
    }
  }

  const missingArgPath = config.args.find((arg) => looksLikeLocalPath(arg) && !fs.existsSync(path.resolve(config.cwd, arg)));
  if (missingArgPath) {
    results.push(result("FAIL", `referenced path does not exist: ${missingArgPath}`, "Fix the args entry or create the missing file."));
  }

  return results;
}

function runProbe(command: string, args: string[]): Promise<Diagnostic[]> {
  return new Promise((resolve) => {
    if (!command) {
      resolve([result("FAIL", "missing probe command", "Pass --command <cmd> and optional args after --.")]);
      return;
    }

    const results: Diagnostic[] = [];
    const child = spawn(command, args, {
      stdio: "pipe",
      env: process.env
    });

    let settled = false;
    let stderr = "";

    const done = (items: Diagnostic[]): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(items);
    };

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: Error) => {
      done([result("FAIL", `process failed to spawn: ${error.message}`, "Check whether the command exists and is executable.")]);
    });

    child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
      const reason = signal ? `signal ${signal}` : `code ${code ?? "unknown"}`;
      const hint = stderr.trim()
        ? `stderr: ${stderr.trim().slice(0, 160)}`
        : "The process exited before the startup timeout completed.";
      done([result("WARN", `process exited early with ${reason}`, hint)]);
    });

    setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore cleanup errors.
      }

      results.push(result("PASS", `process started successfully: ${command}`));
      if (stderr.trim()) {
        results.push(result("WARN", "process wrote to stderr during startup", `stderr: ${stderr.trim().slice(0, 160)}`));
      }
      done(results);
    }, 1200);
  });
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "check") {
    const flags = parseFlags(rest);
    const configPath = flags["--config"];
    if (typeof configPath !== "string") {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const results = runCheck(configPath);
    printResults(results);
    exitFromResults(results);
    return;
  }

  if (command === "probe") {
    const flags = parseFlags(rest);
    const probeCommand = flags["--command"];
    const tailArgs = Array.isArray(flags["--"]) ? flags["--"] : [];
    const extraArgs = tailArgs[0] === "args" ? tailArgs.slice(1) : tailArgs;

    if (typeof probeCommand !== "string") {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const results = await runProbe(probeCommand, extraArgs);
    printResults(results);
    exitFromResults(results);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL unexpected error: ${message}`);
  process.exitCode = 1;
});
