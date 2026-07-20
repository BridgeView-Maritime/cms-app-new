import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // Check if email features are turned off
  if (process.env.IS_EMAIL_ON === 'false') {
    console.log(`[EMAIL BYPASS] Destination: ${options.email} | Subject: ${options.subject}`);
    return { id: 'bypass-id', mock: true };
  }
  // 1. Create your SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    // 👇 Parse as an integer and cast string "true" to a strict Boolean flag
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true', 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Keep this block active to handle network environment fluctuations
    tls: {
      rejectUnauthorized: false
    }
  });

  // 2. Define mail options
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'CMS System'}" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // 3. Dispatch Email
  return await transporter.sendMail(mailOptions);
};