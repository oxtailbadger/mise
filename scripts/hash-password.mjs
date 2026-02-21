/**
 * Run once to generate the HOUSEHOLD_PASSWORD_HASH value for your .env:
 *   node scripts/hash-password.mjs
 */
import { createInterface } from "readline";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Enter household password: ", async (password) => {
  rl.close();
  const hash = await bcrypt.hash(password, 10);
  const b64 = Buffer.from(hash).toString("base64");
  console.log("\nAdd this to your .env file:");
  console.log(`HOUSEHOLD_PASSWORD_HASH_B64="${b64}"`);
});
