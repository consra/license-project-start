import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type NotificationData = {
  email: string;
  shopDomain: string;
  errorCount: number;
  topErrors: Array<{path: string; count: number}>;
  period: string;
};

export async function sendNotificationEmail({
  email,
  shopDomain,
  errorCount,
  topErrors,
  period
}: NotificationData) {
  const subject = `404 Error Report for ${shopDomain} - ${period}`;
  
  const htmlContent = `
    <h2>404 Error Report for ${shopDomain}</h2>
    <p>Period: ${period}</p>
    <p>Total new 404 errors: ${errorCount}</p>
    
    <h3>Top Error Pages:</h3>
    <ul>
      ${topErrors.map(error => `
        <li>${error.path}: ${error.count} times</li>
      `).join('')}
    </ul>
    
    <p>
      <a href="https://${shopDomain}/admin/apps/seo-wizzard/analytics">
        View Full Report
      </a>
    </p>
  `;

  try {
    await resend.emails.send({
      from: 'SEO Wizard <notifications@your-domain.com>',
      to: email,
      subject,
      html: htmlContent,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
} 