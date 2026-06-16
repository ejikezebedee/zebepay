import type { AuditEvent, AuditEventAction, AuditSeverity, AdminRole } from "@zebepay/shared";
import { store } from "../data/store.js";

interface AuditInput {
  actorId: string;
  actorRole: AdminRole | "system" | "customer";
  action: AuditEventAction;
  severity?: AuditSeverity;
  entityType: string;
  entityId: string;
  message: string;
  metadata?: AuditEvent["metadata"];
}

export function appendAuditEvent(input: AuditInput): AuditEvent {
  const event: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    severity: "info",
    createdAt: new Date().toISOString(),
    ...input,
  };

  store.auditEvents.push(event);
  return event;
}

export function listAuditEvents(): AuditEvent[] {
  return [...store.auditEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
