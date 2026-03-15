import nodemailer from "nodemailer";

// Using environment variables for security
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"الراقي للمنتجات السودانية" <noreply@alraqi-store.com>';

const transporter = (SMTP_HOST && SMTP_USER && SMTP_PASS) 
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendPasswordResetEmail(email: string, resetLink: string, userName: string) {
  if (!transporter) {
    console.log("⚠️ Email provider not configured. Reset link generated in console:");
    console.log(`Link: ${resetLink}`);
    return false;
  }

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e7ec; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #1b705c; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">استعادة كلمة المرور</h1>
      </div>
      <div style="padding: 30px; background-color: white;">
        <p style="font-size: 18px; color: #333;">أهلاً بك يا ${userName}،</p>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجر الراقي. 
          إذا كنت قد قمت بهذا الطلب، يرجى الضغط على الزر أدناه:
        </p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetLink}" style="background-color: #1b705c; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">تعيين كلمة مرور جديدة</a>
        </div>
        <p style="font-size: 14px; color: #888;">هذا الرابط ساري المفعول لمدة ساعة واحدة فقط.</p>
        <p style="font-size: 14px; color: #888;">إذا لم تطلب هذا التغيير، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e1e7ec;">
        <p style="font-size: 12px; color: #999; margin: 0;">&copy; 2026 الراقي للمنتجات السودانية. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "استعادة كلمة المرور - متجر الراقي",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return false;
  }
}
