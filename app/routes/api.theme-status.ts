import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { themeId, isActive } = await request.json();

  const status = await prisma.themeStatus.upsert({
    where: {
      shopDomain_themeId: {
        shopDomain: session.shop,
        themeId: themeId,
      },
    },
    update: {
      isActive,
    },
    create: {
      shopDomain: session.shop,
      themeId: themeId,
      isActive,
    },
  });

  return json(status);
}; 