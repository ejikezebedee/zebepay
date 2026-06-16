import type { FastifyInstance } from "fastify";
import { listNotifications } from "../services/notifications.js";
import { requireCustomerSession } from "../services/sessionAuth.js";

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/v1/notifications", async (request, reply) => {
    const query = request.query as { customerId?: string };
    try {
      const session = requireCustomerSession(request.headers.authorization);
      const customerId = query.customerId ?? session.customerId;
      if (customerId !== session.customerId) {
        return reply.code(403).send({ error: "NOTIFICATION_READ_DENIED", message: "Customer session cannot access another customer's notifications." });
      }
      return { data: listNotifications(customerId) };
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }
  });
}
