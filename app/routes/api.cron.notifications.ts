import { json, type ActionFunctionArgs } from "@remix-run/node";
import { processNotifications } from "../services/notifications.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processNotifications();
    return json({ success: true });
  } catch (error) {
    console.error("Failed to process notifications:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}; 

