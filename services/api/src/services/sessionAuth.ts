import { createHmac, timingSafeEqual } from "node:crypto";
import { rolePermissions, type AdminRole } from "@zebepay/shared";
import { store } from "../data/store.js";
import { getStorageMode } from "./storageReadiness.js";

const defaultSandboxSigningSecret = "replace-this-sandbox-session-secret";

export function shouldBlockDefaultSandboxSigningSecret(nodeEnv: string | undefined, secret: string): boolean {
  return nodeEnv === "production" && secret === defaultSandboxSigningSecret;
}

function getSandboxSigningSecret(): string {
  const secret = process.env.ZEBEPAY_SANDBOX_SESSION_SECRET || defaultSandboxSigningSecret;

  if (shouldBlockDefaultSandboxSigningSecret(process.env.NODE_ENV, secret)) {
    throw new Error("ZEBEPAY_SANDBOX_SESSION_SECRET must be set outside local sandbox mode.");
  }

  return secret;
}

export type SessionPrincipal =
  | { kind: "customer"; customerId: string; userId: string; expiresAt: number }
  | { kind: "admin"; adminId: string; role: AdminRole; expiresAt: number };
export type SessionSubject =
  | { kind: "customer"; customerId: string; userId: string }
  | { kind: "admin"; adminId: string; role: AdminRole };

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSandboxSigningSecret()).update(payload).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function roleCan(role: AdminRole, permission: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function createSessionToken(principal: SessionSubject, expiresInSeconds = 900): string {
  const payload = JSON.stringify({ ...principal, expiresAt: Date.now() + expiresInSeconds * 1000 });
  const encodedPayload = base64Url(payload);
  return `sandbox.${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(authorization: string | undefined): SessionPrincipal {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const [, encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !signaturesMatch(signature, sign(encodedPayload))) {
    throw new Error("Session token is missing or invalid.");
  }

  const principal = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPrincipal;

  if (principal.expiresAt < Date.now()) {
    throw new Error("Session token has expired.");
  }

  if (getStorageMode() === "postgres") {
    return principal;
  }

  if (principal.kind === "customer") {
    const user = store.customerUsers.find((entry) => entry.id === principal.userId && entry.active);
    if (!user || user.customerId !== principal.customerId) {
      throw new Error("Customer session is no longer active.");
    }
  } else {
    const admin = store.adminUsers.find((entry) => entry.id === principal.adminId && entry.active);
    if (!admin || admin.role !== principal.role) {
      throw new Error("Admin session is no longer active.");
    }
  }

  return principal;
}

export function requireCustomerSession(authorization: string | undefined) {
  const principal = verifySessionToken(authorization);

  if (principal.kind !== "customer") {
    throw new Error("Customer session is required.");
  }

  return principal;
}

export function requireAdminSession(authorization: string | undefined) {
  const principal = verifySessionToken(authorization);

  if (principal.kind !== "admin") {
    throw new Error("Admin session is required.");
  }

  return principal;
}

export function requireAdminPermission(authorization: string | undefined, permission: string) {
  const principal = requireAdminSession(authorization);

  if (!roleCan(principal.role, permission)) {
    throw new Error(`Admin role ${principal.role} cannot perform ${permission}.`);
  }

  return principal;
}
