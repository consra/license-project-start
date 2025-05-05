import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);

  if (request.method === "POST") {
    try {
      const { enabled, toPath } = await request.json();

      // Upsert the auto-fix settings in the database
      const settings = await prisma.autoFixSettings.upsert({
        where: {
          shopDomain: session.shop,
        },
        update: {
          enabled,
          toPath,
        },
        create: {
          shopDomain: session.shop,
          enabled,
          toPath,
        },
      });

      return json({ success: true, settings });
    } catch (error) {
      console.error("Error saving auto-fix settings:", error);
      return json({ error: "Failed to save auto-fix settings" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  try {
    // Get the current auto-fix settings
    const settings = await prisma.autoFixSettings.findUnique({
      where: {
        shopDomain: session.shop,
      },
    });

    return json({
      settings: settings || { enabled: false, toPath: "" },
    });
  } catch (error) {
    console.error("Error getting auto-fix settings:", error);
    return json({ error: "Failed to get auto-fix settings" }, { status: 500 });
  }
} 