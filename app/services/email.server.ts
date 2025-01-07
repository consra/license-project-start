import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type NotificationData = {
  email: string;
  shopDomain: string;
  errorCount: number;
  topErrors: Array<{path: string; count: number}>;
  period: string;
};

export async function sendHelpEmail({
  email,
  name,
  question
}: {
  email: string;
  name: string;
  question: string;
}) {
  const subject = `Support request from ${name}`;
  const htmlContent = `
    <p>New support request from ${name} (${email})</p>
    <p>Question: ${question}</p>
  `;

  try {
    await resend.emails.send({
      from: 'SEO Wizard <no-reply@seo-wizzard.org>',
      to: 'seowizzard.storesense@gmail.com',
      subject,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}


export async function sendNotificationEmail({
  email,
  shopDomain,
  errorCount,
  topErrors,
  period
}: NotificationData) {
  const subject = `404 Report for ${shopDomain}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f6f8;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://seo-wizzard.org/logo.png" alt="SEO Wizard" style="width: 120px; margin-bottom: 24px;">
            <h1 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 28px; font-weight: 600;">404 Error Report</h1>
            <p style="margin: 0; color: #6d7175; font-size: 16px;">Weekly Summary for ${shopDomain}</p>
          </div>

          <div style="background-color: #f6f6f7; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
            <div style="text-align: center;">
              <div style="font-size: 36px; font-weight: 600; color: #1a1a1a;">${errorCount}</div>
              <div style="color: #6d7175;">Broken Links Detected</div>
            </div>
          </div>

          <div style="background-color: white; border-radius: 8px; margin-bottom: 32px;">
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">Top Broken Links</h2>
            <div style="border: 1px solid #e1e3e5; border-radius: 8px;">
              ${topErrors.map((error, index) => `
                <div style="padding: 16px; ${index !== topErrors.length - 1 ? 'border-bottom: 1px solid #e1e3e5;' : ''}">
                  <div style="color: #1a1a1a; font-weight: 500; font-size: 15px; margin-bottom: 4px;">${error.path}</div>
                  <div style="color: #6d7175; font-size: 13px; display: flex; align-items: center;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #de3618; margin-right: 8px;"></span>
                    ${error.count} ${error.count === 1 ? 'visit' : 'visits'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://${shopDomain}/admin/apps/seo-wizzard-7" 
               style="background-color: #008060; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
              View Full Report
            </a>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e1e3e5;">
            <p style="margin: 0 0 8px 0; color: #6d7175; font-size: 14px;">
              You're receiving this ${period} report because you enabled notifications.
            </p>
            <p style="margin: 0; font-size: 14px;">
              <a href="https://${shopDomain}/admin/apps/seo-wizzard-7/settings" 
                 style="color: #008060; text-decoration: none; font-weight: 500;">
                Manage notification settings
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'SEO Wizard <no-reply@seo-wizzard.org>',
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