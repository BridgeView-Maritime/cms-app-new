// server/utils/sendEmail.js
import { Resend } from 'resend';

// Initialize with the variable injected by Railway
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (options) => {
  // Note: On the free tier without a custom domain verified, 
  // Resend requires you to send 'from' their default testing email.
  return await resend.emails.send({
    from: 'CMS System <onboarding@resend.dev>',
    to: options.email,
    subject: options.subject,
    html: options.html,
  });
};