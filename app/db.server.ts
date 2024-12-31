import { PrismaClient } from "@prisma/client";
import { PostgreSQLSessionStorage } from "@shopify/shopify-app-session-storage-postgresql";

let prisma: PrismaClient;
let sessionStorage: PostgreSQLSessionStorage;

declare global {
  var __db__: PrismaClient;
}

// Initialize PostgreSQL session storage
const dbUrl = process.env.DATABASE_URL || "postgres://shopify:shopify123@localhost:5432/shopify_app_db";

sessionStorage = new PostgreSQLSessionStorage(dbUrl);

// Initialize Prisma client
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  prisma = global.__db__;
  prisma.$connect();
}

export { prisma, sessionStorage };
