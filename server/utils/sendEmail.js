import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // Will correctly resolve to false for port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Your new 16-digit Google App Password
    },
    dns: {
      preferIPv4: true // Prevents IPv6 resolution timeouts
    },
    tls: {
      rejectUnauthorized: false // Prevents dynamic routing SSL certificate drops
    }
  });

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'CMS System'}" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  return await transporter.sendMail(mailOptions);
};