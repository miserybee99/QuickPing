import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('📧 SendGrid API configured');
}

// Create transporter based on environment
const createTransporter = () => {
  // If SendGrid is configured, use it instead of SMTP
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Using SendGrid API for email delivery');
    return null; // We'll use SendGrid directly
  }
  
  // Check if we have SMTP credentials configured
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('📧 Using configured SMTP server');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Development fallback - log to console
  console.log('📧 No SMTP configured - emails will be logged to console');
  return null;
};

let transporter = createTransporter();

// Generate OTP email HTML template
const generateOTPEmailHTML = (username, otp) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực Email - QuickPing</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
             background-color: #f5f5f5; margin: 0; padding: 20px; line-height: 1.6;">
  <div style="max-width: 480px; margin: 0 auto; background: white; 
              border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">💬 QuickPing</h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
      Xin chào <strong>${username}</strong>! 👋
    </p>
    
    <!-- Message -->
    <p style="font-size: 16px; color: #666; margin-bottom: 24px;">
      Cảm ơn bạn đã đăng ký tài khoản QuickPing. Đây là mã xác thực của bạn:
    </p>
    
    <!-- OTP Box -->
    <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
                border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px; font-weight: bold; color: white; 
                   letter-spacing: 8px; font-family: 'Courier New', monospace;">
        ${otp}
      </span>
    </div>
    
    <!-- Expiry Notice -->
    <p style="font-size: 14px; color: #888; text-align: center; margin-bottom: 24px;">
      ⏱️ Mã này sẽ hết hạn sau <strong>10 phút</strong>
    </p>
    
    <!-- Warning -->
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #92400e; margin: 0;">
        ⚠️ Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
        Không chia sẻ mã này với bất kỳ ai.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        © 2024 QuickPing. Kết nối mọi người.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// Generate plain text version
const generateOTPEmailText = (username, otp) => {
  return `
Xin chào ${username}!

Cảm ơn bạn đã đăng ký tài khoản QuickPing.

Mã xác thực của bạn là: ${otp}

Mã này sẽ hết hạn sau 10 phút.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

- QuickPing Team
  `.trim();
};

/**
 * Send OTP verification email
 * @param {string} email - Recipient email
 * @param {string} username - User's display name
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
export const sendOTPEmail = async (email, username, otp) => {
  try {
    const subject = '🔐 [QuickPing] Mã xác thực email của bạn';
    const htmlContent = generateOTPEmailHTML(username, otp);
    const textContent = generateOTPEmailText(username, otp);

    // Use SendGrid API if configured (best for production)
    if (process.env.SENDGRID_API_KEY) {
      console.log('📧 Sending email via SendGrid API...');
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@quickping.app',
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      const result = await sgMail.send(msg);
      console.log('📧 Email sent successfully via SendGrid');
      return { success: true, messageId: 'sendgrid-' + Date.now() };
    }

    // Use SMTP transporter if configured
    if (transporter) {
      const mailOptions = {
        from: `"QuickPing" <${process.env.SMTP_USER || 'noreply@quickping.app'}>`,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully via SMTP:', info.messageId);
      return { success: true, messageId: info.messageId };
    }

    // Development mode - log to console
    console.log('═══════════════════════════════════════════════════');
    console.log('📧 EMAIL WOULD BE SENT (Development Mode):');
    console.log('═══════════════════════════════════════════════════');
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otp}`);
    console.log('═══════════════════════════════════════════════════');
    return { success: true, messageId: 'dev-mode-' + Date.now() };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>}
 */
export const verifyEmailConnection = async () => {
  if (process.env.SENDGRID_API_KEY) {
    console.log('✅ Email service ready (SendGrid API)');
    return true;
  }
  
  if (!transporter) {
    console.log('📧 Email service in development mode (no SMTP configured)');
    return true;
  }
  
  try {
    await transporter.verify();
    console.log('✅ Email service ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return false;
  }
};

// Generate Password Reset OTP email HTML template
const generatePasswordResetOTPEmailHTML = (username, otp) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt Lại Mật Khẩu - QuickPing</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
             background-color: #f5f5f5; margin: 0; padding: 20px; line-height: 1.6;">
  <div style="max-width: 480px; margin: 0 auto; background: white; 
              border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ef4444; margin: 0; font-size: 28px;">🔐 QuickPing</h1>
    </div>
    
    <!-- Greeting -->
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
      Xin chào <strong>${username}</strong>! 👋
    </p>
    
    <!-- Message -->
    <p style="font-size: 16px; color: #666; margin-bottom: 24px;">
      Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản QuickPing. Đây là mã xác thực của bạn:
    </p>
    
    <!-- OTP Box -->
    <div style="background: linear-gradient(135deg, #ef4444, #dc2626); 
                border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px; font-weight: bold; color: white; 
                   letter-spacing: 8px; font-family: 'Courier New', monospace;">
        ${otp}
      </span>
    </div>
    
    <!-- Expiry Notice -->
    <p style="font-size: 14px; color: #888; text-align: center; margin-bottom: 24px;">
      ⏱️ Mã này sẽ hết hạn sau <strong>10 phút</strong>
    </p>
    
    <!-- Warning -->
    <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: #991b1b; margin: 0;">
        ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và không chia sẻ mã này với bất kỳ ai.
        Mật khẩu của bạn sẽ không thay đổi nếu bạn không nhập mã này.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        © 2024 QuickPing. Kết nối mọi người.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// Generate plain text version for password reset
const generatePasswordResetOTPEmailText = (username, otp) => {
  return `
Xin chào ${username}!

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản QuickPing.

Mã xác thực của bạn là: ${otp}

Mã này sẽ hết hạn sau 10 phút.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

- QuickPing Team
  `.trim();
};

/**
 * Send Password Reset OTP email
 * @param {string} email - Recipient email
 * @param {string} username - User's display name
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
export const sendPasswordResetOTPEmail = async (email, username, otp) => {
  try {
    const subject = '🔐 [QuickPing] Mã xác thực đặt lại mật khẩu';
    const htmlContent = generatePasswordResetOTPEmailHTML(username, otp);
    const textContent = generatePasswordResetOTPEmailText(username, otp);

    // Use SendGrid API if configured (best for production)
    if (process.env.SENDGRID_API_KEY) {
      console.log('📧 Sending password reset email via SendGrid API...');
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@quickping.app',
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await sgMail.send(msg);
      console.log('📧 Password reset email sent successfully via SendGrid');
      return { success: true, messageId: 'sendgrid-' + Date.now() };
    }

    // Use SMTP transporter if configured
    if (transporter) {
      const mailOptions = {
        from: `"QuickPing Security" <${process.env.SMTP_USER || 'noreply@quickping.app'}>`,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Password reset email sent successfully via SMTP:', info.messageId);
      return { success: true, messageId: info.messageId };
    }

    // Development mode - log to console
    console.log('═══════════════════════════════════════════════════');
    console.log('📧 PASSWORD RESET EMAIL (Development Mode):');
    console.log('═══════════════════════════════════════════════════');
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otp}`);
    console.log('═══════════════════════════════════════════════════');
    return { success: true, messageId: 'dev-mode-' + Date.now() };
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    throw new Error('Failed to send password reset email: ' + error.message);
  }
};

/**
 * Reinitialize transporter (useful if env vars changed)
 */
export const reinitializeTransporter = () => {
  transporter = createTransporter();
};

export default {
  sendOTPEmail,
  sendPasswordResetOTPEmail,
  verifyEmailConnection,
  reinitializeTransporter
};
