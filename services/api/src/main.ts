import Fastify from "fastify";
import cors from "@fastify/cors";
import { store } from "./data/store.js";
import { registerCustomerRoutes } from "./routes/customers.js";
import { registerReferenceRoutes } from "./routes/reference.js";
import { registerTransferRoutes } from "./routes/transfers.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerBeneficiaryRoutes } from "./routes/beneficiaries.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerProviderWorkflowRoutes } from "./routes/providerWorkflows.js";
import { registerSecurityRoutes } from "./routes/security.js";
import { registerStatementRoutes } from "./routes/statements.js";
import { assertProductionPersistenceReady, buildProductionReadinessReport } from "./services/storageReadiness.js";
import "./types.js";

assertProductionPersistenceReady();

const app = Fastify({ logger: true });
app.decorate("zebepayStore", store);

await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(",") ?? false,
});

await app.register(registerCustomerRoutes);
await app.register(registerReferenceRoutes);
await app.register(registerTransferRoutes);
await app.register(registerAdminRoutes);
await app.register(registerAuthRoutes);
await app.register(registerBeneficiaryRoutes);
await app.register(registerStatementRoutes);
await app.register(registerSecurityRoutes);
await app.register(registerNotificationRoutes);
await app.register(registerProviderWorkflowRoutes);

app.get("/health", async () => ({
  status: "ok",
  service: "zebepay-api",
}));

app.get("/ready", async () => {
  const report = buildProductionReadinessReport();

  return {
    status: process.env.NODE_ENV === "production" && !report.ready ? "blocked" : "ok",
    service: "zebepay-api",
    productionReady: report.ready,
    blockers: report.blockers,
  };
});

app.get("/v1/product", async () => ({
  name: "Zebepay",
  market: "Nigeria",
  currency: "NGN",
  moneyUnit: "kobo",
  boundary: "Commercial source-code platform. Buyer handles licensing and regulated providers.",
}));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
