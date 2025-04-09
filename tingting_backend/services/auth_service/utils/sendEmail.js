import nodeMailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS, SMTP_HOST, SMTP_PORT } from "../config/env.js";
import { emailTemplate } from "./email-template.js";

export const sendEmail = async (email, otp) => {
  const transporter = nodeMailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
  const message = emailTemplate(otp);
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: `Mã xác nhận đổi mật khẩu từ TingTing`,
    html: message,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
