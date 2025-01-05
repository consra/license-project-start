import { prisma } from "../db.server";
import { sendNotificationEmail } from "./email.server";

export async function processNotifications() {
  try {
    // Get all active notification settings
    const settings = await prisma.notificationSettings.findMany({
      where: { enabled: true }
    });

    for (const setting of settings) {
      const { shopDomain, email, frequency, lastSentAt } = setting;
      
      // Check if notification is due based on frequency
      if (!shouldSendNotification(frequency, lastSentAt)) {
        continue;
      }

      // Get unresolved 404 errors since last notification
      const errors = await prisma.notFoundError.findMany({
        where: {
          shopDomain,
          redirected: false,
          timestamp: {
            gt: lastSentAt || new Date(0)
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      if (errors.length > 0) {
        // Send notification email
        await sendNotificationEmail({
          email,
          shopDomain,
          errorCount: errors.length,
          topErrors: errors.slice(0, 5).map(e => ({
            path: e.path,
            count: 1
          })),
          period: frequency
        });

        // Update last sent timestamp
        await prisma.notificationSettings.update({
          where: { id: setting.id },
          data: { lastSentAt: new Date() }
        });
      }
    }
  } catch (error) {
    console.error('Failed to process notifications:', error);
  }
}

function shouldSendNotification(frequency: string, lastSentAt: Date | null): boolean {
  if (!lastSentAt) return true;

  const hours = (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60);
  
  switch (frequency) {
    case 'daily':
      return hours >= 24;
    case 'weekly':
      return hours >= 168; // 7 days
    case 'monthly':
      return hours >= 720; // 30 days
    default:
      return false;
  }
} 