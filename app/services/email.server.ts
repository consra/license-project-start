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
  const subject = `New404 Errors detected for ${shopDomain}`;
  
  const htmlContent = `
    <h2>New 404 errors detected</h2>

    <p> Hello, he is Seo Wizard</p>
    <p> We have detected new 404 errors on your store. Please check the report below to see the details.</p>
    <p> Please login to your store to see the report in the analytics section.</p>

    <p>
      Best regards,
      <br>
      SEO Wizard
    </p>
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