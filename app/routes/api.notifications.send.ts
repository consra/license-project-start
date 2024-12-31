import { json, type ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../db.server";
import { sendNotificationEmail } from "../services/email.server";

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
    // Get all active notification settings
    const settings = await prisma.notificationSettings.findMany({
      where: { enabled: true }
    });

    for (const setting of settings) {
      const { shopDomain, email, frequency, lastSentAt } = setting;
      
      // Check if notification is due
      const now = new Date();
      const lastSent = lastSentAt || new Date(0);
      let shouldSend = false;

      switch (frequency) {
        case 'daily':
          shouldSend = now.getTime() - lastSent.getTime() >= 24 * 60 * 60 * 1000;
          break;
        case 'weekly':
          shouldSend = now.getTime() - lastSent.getTime() >= 7 * 24 * 60 * 60 * 1000;
          break;
        case 'monthly':
          shouldSend = now.getTime() - lastSent.getTime() >= 30 * 24 * 60 * 60 * 1000;
          break;
      }

      if (shouldSend) {
        // Get error stats since last notification
        const errorCount = await prisma.notFoundError.count({
          where: {
            shopDomain,
            timestamp: { gt: lastSent }
          }
        });

        const topErrors = await prisma.notFoundError.groupBy({
          by: ['path'],
          where: {
            shopDomain,
            timestamp: { gt: lastSent }
          },
          _count: true,
          orderBy: {
            _count: {
              path: 'desc'
            }
          },
          take: 5
        });

        // Send email
        await sendNotificationEmail({
          email,
          shopDomain,
          errorCount,
          topErrors: topErrors.map(e => ({
            path: e.path,
            count: e._count
          })),
          period: frequency
        });

        // Update lastSentAt
        await prisma.notificationSettings.update({
          where: { id: setting.id },
          data: { lastSentAt: now }
        });
      }
    }

    return json({ success: true });
  } catch (error) {
    console.error('Failed to process notifications:', error);
    return json({ error: "Failed to process notifications" }, { status: 500 });
  }
}; 