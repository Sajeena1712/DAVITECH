import { cp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");
const worktreeDir = path.join(repoRoot, ".gh-pages-tmp");

function runGit(args, cwd = repoRoot) {
  execFileSync("git", args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  });
}

async function removeExceptGit(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    await rm(path.join(dir, entry.name), { recursive: true, force: true });
  }
}

async function prepareWorktree(repoUrl) {
  await rm(worktreeDir, { recursive: true, force: true });

  try {
    runGit(["clone", "--depth", "1", "--branch", "gh-pages", "--single-branch", repoUrl, worktreeDir]);
  } catch {
    runGit(["clone", repoUrl, worktreeDir]);
    runGit(["checkout", "--orphan", "gh-pages"], worktreeDir);
    runGit(["rm", "-rf", "."], worktreeDir);
  }
}

async function copyDist() {
  await removeExceptGit(worktreeDir);
  const entries = await readdir(distDir, { withFileTypes: true });
  for (const entry of entries) {
    await cp(path.join(distDir, entry.name), path.join(worktreeDir, entry.name), {
      recursive: true,
    });
  }
  await writeFile(path.join(worktreeDir, ".nojekyll"), "");
}

async function main() {
  const repoUrl = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  if (!repoUrl) {
    throw new Error("Missing git origin remote.");
  }

  await stat(distDir);
  await prepareWorktree(repoUrl);
  await copyDist();

  runGit(["add", "-A"], worktreeDir);

  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: worktreeDir,
    encoding: "utf8",
  }).trim();

  if (!status) {
    console.log("No changes to publish.");
    return;
  }

  runGit(["commit", "-m", "Deploy GitHub Pages site"], worktreeDir);
  runGit(["push", "origin", "gh-pages"], worktreeDir);
  console.log("Published dist to gh-pages.");
  await rm(worktreeDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
