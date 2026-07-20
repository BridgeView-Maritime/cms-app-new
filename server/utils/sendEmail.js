import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // If your SMTP_HOST is set to smtp.gmail.com, we bypass host/port strings entirely
  const isGmail = process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail');

  const transporterConfig = isGmail 
    ? {
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS, // Your 16-character Google App Password
        }
      }
    : {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        dns: {
          preferIPv4: true
        },
        tls: {
          rejectUnauthorized: false
        }
      };

  const transporter = nodemailer.createTransport(transporterConfig);

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'CMS System'}" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  return await transporter.sendMail(mailOptions);
};