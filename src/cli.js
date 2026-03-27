#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const PASS = "PASS";
const WARN = "WARN";
const FAIL = "FAIL";

function printUsage() {
  console.log(`mcp-skill-doctor

Usage:
  node src/cli.js check --config <path>
  node src/cli.js probe --command <cmd> -- args...
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  return { command, rest };
}

function parseFlags(tokens) {
  const flags = {};
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

function result(status, message, hint) {
  return { status, message, hint };
}

function printResults(results) {
  for (const item of results) {
    console.log(`${item.status} ${item.message}`);
    if (item.hint) {
      console.log(`     hint: ${item.hint}`);
    }
  }
}

function exitFromResults(results) {
  const hasFail = results.some((item) => item.status === FAIL);
  process.exitCode = hasFail ? 1 : 0;
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { data: JSON.parse(raw) };
  } catch (error) {
    return { error };
  }
}

function commandExists(command) {
  const probe = spawnSync("sh", ["-lc", `command -v ${shellQuote(command)}`], {
    stdio: "pipe",
    encoding: "utf8"
  });

  return probe.status === 0 ? probe.stdout.trim() : "";
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeConfig(configPath, config) {
  return {
    name: config.name || "unnamed-server",
    command: config.command || "",
    args: Array.isArray(config.args) ? config.args : [],
    cwd: config.cwd ? path.resolve(path.dirname(configPath), config.cwd) : process.cwd(),
    transport: config.transport || "stdio",
    requiredEnv: Array.isArray(config.requiredEnv) ? config.requiredEnv : []
  };
}

function validateConfigShape(config) {
  const results = [];

  if (!config.command || typeof config.command !== "string") {
    results.push(result(FAIL, 'missing required string field "command"', "Add a runnable command such as node, npx, uvx, or python."));
  } else {
    results.push(result(PASS, `command field present: ${config.command}`));
  }

  if (!Array.isArray(config.args)) {
    results.push(result(FAIL, '"args" must be an array', 'Use "args": ["server.js"] style JSON.'));
  } else {
    results.push(result(PASS, `args array present (${config.args.length} entries)`));
  }

  if (config.transport !== "stdio") {
    results.push(result(WARN, `transport "${config.transport}" is outside MVP support`, "The MVP focuses on local stdio startup diagnosis."));
  } else {
    results.push(result(PASS, "transport is stdio"));
  }

  return results;
}

function runCheck(configPath) {
  const results = [];
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    results.push(result(FAIL, `config file not found: ${absolutePath}`, "Pass a valid JSON config path."));
    return results;
  }

  results.push(result(PASS, `config file exists: ${absolutePath}`));

  const { data, error } = safeReadJson(absolutePath);
  if (error) {
    results.push(result(FAIL, `failed to parse JSON: ${error.message}`, "Fix the config file syntax and try again."));
    return results;
  }

  const config = normalizeConfig(absolutePath, data);
  results.push(...validateConfigShape(config));

  if (config.command) {
    const resolvedCommand = commandExists(config.command);
    if (resolvedCommand) {
      results.push(result(PASS, `command "${config.command}" found at ${resolvedCommand}`));
    } else {
      results.push(result(FAIL, `command "${config.command}" not found in PATH`, `Install ${config.command} or add it to PATH.`));
    }
  }

  if (fs.existsSync(config.cwd)) {
    results.push(result(PASS, `cwd exists: ${config.cwd}`));
  } else {
    results.push(result(FAIL, `cwd does not exist: ${config.cwd}`, "Fix the config cwd or create the directory."));
  }

  for (const envKey of config.requiredEnv) {
    if (process.env[envKey]) {
      results.push(result(PASS, `env var present: ${envKey}`));
    } else {
      results.push(result(FAIL, `missing env var ${envKey}`, `Export ${envKey} before starting the server.`));
    }
  }

  const missingArgPath = config.args.find((arg) => looksLikeLocalPath(arg) && !fs.existsSync(path.resolve(config.cwd, arg)));
  if (missingArgPath) {
    results.push(result(FAIL, `referenced path does not exist: ${missingArgPath}`, "Fix the args entry or create the missing file."));
  }

  return results;
}

function looksLikeLocalPath(value) {
  return typeof value === "string" && (
    value.includes("/") ||
    value.endsWith(".js") ||
    value.endsWith(".mjs") ||
    value.endsWith(".py") ||
    value.endsWith(".json")
  );
}

function runProbe(command, args) {
  return new Promise((resolve) => {
    if (!command) {
      resolve([result(FAIL, "missing probe command", "Pass --command <cmd> and optional args after --.")]);
      return;
    }

    const results = [];
    const child = spawn(command, args, {
      stdio: "pipe",
      env: process.env
    });

    let settled = false;
    let stderr = "";

    const done = (items) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(items);
    };

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      done([
        result(FAIL, `process failed to spawn: ${error.message}`, "Check whether the command exists and is executable.")
      ]);
    });

    child.on("exit", (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      const hint = stderr.trim() ? `stderr: ${stderr.trim().slice(0, 160)}` : "The process exited before the startup timeout completed.";
      done([
        result(WARN, `process exited early with ${reason}`, hint)
      ]);
    });

    setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch (_error) {
        // Ignore cleanup errors.
      }

      results.push(result(PASS, `process started successfully: ${command}`));
      if (stderr.trim()) {
        results.push(result(WARN, "process wrote to stderr during startup", `stderr: ${stderr.trim().slice(0, 160)}`));
      }
      done(results);
    }, 1200);
  });
}

async function main() {
  const { command, rest } = parseArgs(process.argv.slice(2));

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "check") {
    const flags = parseFlags(rest);
    const configPath = flags["--config"];
    if (!configPath || typeof configPath !== "string") {
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
    const results = await runProbe(probeCommand, extraArgs);
    printResults(results);
    exitFromResults(results);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL unexpected error: ${error.message}`);
  process.exitCode = 1;
});
