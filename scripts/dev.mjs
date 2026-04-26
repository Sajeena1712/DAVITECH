import { spawn } from "node:child_process";

function run(command, args, env) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env,
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
      return;
    }
    process.exit(code ?? 0);
  });

  return child;
}

const apiServer = run(process.execPath, ["./server.mjs"], {
  ...process.env,
  PORT: process.env.PORT || "4173",
});

const viteServer = run(process.execPath, ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1"], {
  ...process.env,
});

function shutdown(code = 0) {
  apiServer.kill();
  viteServer.kill();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
