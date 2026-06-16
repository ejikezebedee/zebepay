import { rolePermissions, type AdminRole, type AdminUser } from "@zebepay/shared";
import { store } from "../data/store.js";

export function getAdminUser(actorId: string): AdminUser | undefined {
  return store.adminUsers.find((admin) => admin.id === actorId && admin.active);
}

export function can(role: AdminRole, permission: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function requirePermission(actorId: string, permission: string): AdminUser {
  const actor = getAdminUser(actorId);

  if (!actor) {
    throw new Error("Admin actor was not found or is inactive.");
  }

  if (!can(actor.role, permission)) {
    throw new Error(`Admin role ${actor.role} cannot perform ${permission}.`);
  }

  return actor;
}
