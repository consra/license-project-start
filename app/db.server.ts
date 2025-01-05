import { PrismaClient } from "@prisma/client";
import { PostgreSQLSessionStorage } from "@shopify/shopify-app-session-storage-postgresql";

let prisma: PrismaClient;
let sessionStorage: PostgreSQLSessionStorage;

declare global {
  var __db__: PrismaClient;
}

// Initialize PostgreSQL session storage
const dbUrl = process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD 
  ? `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}`
  :  "postgres://shopify:shopify123@localhost:5432/shopify_app_db";

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
