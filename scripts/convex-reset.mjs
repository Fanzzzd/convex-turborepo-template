#!/usr/bin/env node
import { spawn } from "node:child_process";
import readline from "node:readline";

const PHRASE = "ERASE ALL DOMAIN DATA";

function ask(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  console.log(
    "\nWARNING: This will permanently delete ALL app data, including users and auth tables.\n"
  );
  console.log(`To proceed, type the exact phrase: \n\n  ${PHRASE}\n`);

  const input = await ask(
    "Type the phrase to confirm (or press Enter to cancel): "
  );
  if (input.trim() !== PHRASE) {
    console.log("Aborted — confirmation phrase did not match.");
    process.exit(1);
  }

  console.log("\nResetting all data using Convex import --replace-all ...\n");
  const child = spawn(
    "pnpm",
    [
      "-C",
      "packages/backend",
      "exec",
      "convex",
      "import",
      "--replace-all",
      "--table",
      "users",
      "../../scripts/empty.json",
      "-y",
    ],
    { stdio: "inherit" }
  );

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
