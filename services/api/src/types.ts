import type { ZebepayStore } from "./data/store.js";

declare module "fastify" {
  interface FastifyInstance {
    zebepayStore: ZebepayStore;
  }
}
