import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (request.method === "DELETE") {
    const { pattern } = await request.json();
    await prisma.redirect.deleteMany({
      where: { 
        shopDomain: session.shop,
        pattern 
      } 
    });
    return json({ message: "Redirect deleted" }, { status: 200 });
  }

  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { pattern, toPath } = await request.json();

  try {
    const redirect = await prisma.redirect.create({
      data: {
        shopDomain: session.shop,
        fromPath: pattern,
        toPath,
        shopifyId: "",
        pattern,
        isWildcard: true,
        isActive: true
      }
    });

    return json(redirect);
  } catch (error) {
    console.error("Failed to create wildcard redirect:", error);
    return json({ error: "Failed to create redirect" }, { status: 500 });
  }
}; 