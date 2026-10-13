// Usage: npm run hash-password -- <password>
// Prints a bcrypt hash to paste into AUTH_USERS. Never commit the result.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Please use a password of at least 8 characters.");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\nHash (paste as-is in Vercel's AUTH_USERS):");
console.log(hash);
console.log("\nSame hash for .env.local (each $ escaped as \\$):");
console.log(hash.replace(/\$/g, "\\$"));
