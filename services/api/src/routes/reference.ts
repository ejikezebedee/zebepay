import type { FastifyInstance } from "fastify";
import { kycTierDailyLimitsKobo, nigerianBanks } from "@zebepay/shared";

export async function registerReferenceRoutes(app: FastifyInstance) {
  app.get("/v1/reference/banks", async () => ({
    data: nigerianBanks,
  }));

  app.get("/v1/reference/kyc-tiers", async () => ({
    data: Object.fromEntries(
      Object.entries(kycTierDailyLimitsKobo).map(([tier, limit]) => [tier, Number(limit)]),
    ),
  }));
}
