import { createHash, timingSafeEqual } from "node:crypto";

export function sandboxPasswordHash(password: string): string {
  return createHash("sha256").update(`zebepay-sandbox:${password}`).digest("hex");
}

export function verifySandboxPassword(password: string, expectedHash: string): boolean {
  const actual = Buffer.from(sandboxPasswordHash(password), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
