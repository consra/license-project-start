import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  if (request.method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { shopifyId, fromPath } = await request.json();

  try {
    await admin.graphql(`
      mutation urlRedirectDelete($id: ID!) {
        urlRedirectDelete(id: $id) {
          deletedUrlRedirectId
        }
      }
    `, {
      variables: {
        id: shopifyId,
      }
    });

    await prisma.redirect.deleteMany({
      where: {
        shopDomain: session.shop,
        fromPath: fromPath,
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error("Failed to delete redirect:", error);
    return json({ error: "Failed to delete redirect" }, { status: 500 });
  }
}; 