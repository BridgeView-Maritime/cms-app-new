// server/utils/sendEmail.js
import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // 1. Create your SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true', 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // 👇 FORCE NODEMAILER TO PREFER IPV4 ADDRESSES
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 10000,
    socketTimeout: 20000,
    dns: {
      preferIPv4: true
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