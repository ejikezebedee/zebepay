import type { FastifyInstance } from "fastify";
import { store } from "../data/store.js";
import { getBankingRepositories } from "../repositories/repositoryProvider.js";
import { requireAdminPermission, requireCustomerSession } from "../services/sessionAuth.js";

export async function registerCustomerRoutes(app: FastifyInstance) {
  app.get("/v1/customers", async (request, reply) => {
    try {
      requireAdminPermission(request.headers.authorization, "customers:read");
      return { data: store.customers };
    } catch (error) {
      return reply.code(403).send({ error: "CUSTOMER_READ_DENIED", message: (error as Error).message });
    }
  });

  app.get("/v1/customers/:customerId/summary", async (request, reply) => {
    const { customerId } = request.params as { customerId: string };

    try {
      const session = requireCustomerSession(request.headers.authorization);
      if (session.customerId !== customerId) {
        return reply.code(403).send({ error: "CUSTOMER_READ_DENIED", message: "Customer session cannot access another customer." });
      }
    } catch (error) {
      return reply.code(401).send({ error: "CUSTOMER_AUTH_REQUIRED", message: (error as Error).message });
    }

    const repositories = getBankingRepositories();
    const customer = await repositories.customers.findCustomerById(customerId);
    const accounts = await repositories.accounts.listCustomerAccounts(customerId);
    const accountIds = new Set(accounts.map((account) => account.id));
    const transfers = await repositories.transfers.listBySourceAccounts([...accountIds]);
    const ledgerEntries = (
      await Promise.all(accounts.map((account) => repositories.ledger.listAccountEntries(account.id)))
    )
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);

    return {
      data: {
        customer,
        accounts,
        transfers,
        ledgerEntries,
      },
    };
  });
}
