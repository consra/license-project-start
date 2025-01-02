import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { paths, toPath } = await request.json();

  // Create redirects in a transaction
  await prisma.$transaction(async (tx) => {
    // Create redirects
    await tx.redirect.createMany({
      data: paths.map((fromPath: string) => ({
        shopDomain: session.shop,
        fromPath,
        toPath,
        isActive: true,
      })),
    });

    // Update NotFoundError records
    await tx.notFoundError.updateMany({
      where: {
        shopDomain: session.shop,
        path: {
          in: paths,
        },
      },
      data: {
        redirected: true,
        redirectTo: toPath,
      },
    });
  });

  return json({ success: true });
}; 