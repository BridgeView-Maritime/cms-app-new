import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // Hardcoding the service bypasses the host/port lookup entirely
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER, // Will read your Railway SMTP_USER variable
      pass: process.env.SMTP_PASS, // Will read your Railway 16-character App Password
    }
  });

  const mailOptions = {
    from: `"CMS System" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  return await transporter.sendMail(mailOptions);
};