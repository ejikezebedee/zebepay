import type { NotificationChannel, NotificationMessage } from "@zebepay/shared";
import { store } from "../data/store.js";
import { appendAuditEvent } from "./audit.js";

function makeId(): string {
  return `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function queueNotification(input: {
  customerId?: string;
  adminUserId?: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}): NotificationMessage {
  const notification: NotificationMessage = {
    id: makeId(),
    status: "queued",
    createdAt: new Date().toISOString(),
    ...input,
  };

  store.notifications.push(notification);
  appendAuditEvent({
    actorId: input.customerId ?? input.adminUserId ?? "system",
    actorRole: input.customerId ? "customer" : "system",
    action: "notification.queue",
    entityType: input.relatedEntityType ?? "notification",
    entityId: input.relatedEntityId ?? notification.id,
    message: `Notification queued: ${input.subject}`,
    metadata: { channel: input.channel },
  });

  return notification;
}

export function listNotifications(customerId?: string): NotificationMessage[] {
  return store.notifications.filter((notification) => !customerId || notification.customerId === customerId);
}
