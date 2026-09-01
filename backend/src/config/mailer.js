// src/config/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT  || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send password reset email.
 * @param {string} toEmail
 * @param {string} resetLink
 */
async function sendPasswordResetEmail(toEmail, resetLink) {
  const mailOptions = {
    from: `"College ERP" <${process.env.SMTP_USER}>`,
    to:   toEmail,
    subject: 'Password Reset Request - College ERP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1e3a5f; margin-bottom: 8px;">🔐 Password Reset</h2>
        <p style="color: #374151; margin-bottom: 16px;">
          You have requested a password reset for your College ERP account.
          Click the button below to set a new password.
        </p>
        <a href="${resetLink}"
           style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#6b7280; font-size: 13px; margin-top: 20px;">
          This link will expire in <strong>1 hour</strong>.<br/>
          If you did not request this, please ignore this email.
        </p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin: 20px 0;"/>
        <p style="color: #9ca3af; font-size: 12px;">College ERP System</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };
