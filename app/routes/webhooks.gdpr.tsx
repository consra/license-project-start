import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  try {
    if (topic === "customers/data_request") {
      // Handle data request
      console.log(`Handling data request for ${shop}`);
    } else if (topic === "customers/redact") {
      // Handle data redact
      console.log(`Handling data redact for ${shop}`);
    } else if (topic === "shop/redact") {
      // Handle shop redact
      prisma.notFoundError.deleteMany({ where: { shopDomain: shop } });
      prisma.redirect.deleteMany({ where: { shopDomain: shop } });
      prisma.notificationSettings.deleteMany({ where: { shopDomain: shop } });
    }
  } catch (error) {
    console.error('Error handling GDPR webhook:', error);
  }

  return new Response();
};
