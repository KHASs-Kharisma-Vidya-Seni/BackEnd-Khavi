import { createTransport } from "nodemailer";
import configureEnvSelf from "../utility/dote-env.js";

configureEnvSelf();

// Nodemailer transporter
const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SERVICE,
    pass: process.env.EMAIL_PASSWORD_SERVICE,
  },
});

// Function to send Token verification email
function sendTokenVerificationEmail(email, token) {
  const mailOptions = {
    from: process.env.EMAIL_SERVICE, // ganti dengan email Anda
    to: email,
    subject: "Email Verification",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
      <div style="margin-bottom: 20px;">
        <img style="max-width: 200px;" src="https://i.ibb.co.com/nrN88dr/contrast-font-KHASs-1.png" alt="KHAVI App" />
      </div>
      <h2 style="color: #333; margin-bottom: 10px;">Verifikasi Email Anda</h2>
      <p style="color: #555; margin-bottom: 20px;">
        Hai! Terima kasih telah bergabung dengan KHAVI App. Silakan klik tombol di bawah untuk memverifikasi alamat email Anda.
      </p>
      <div style="margin-bottom: 20px;">
        <a href="${process.env.DEPLOYMENT_URL}/api/auth/verify/${token}" style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; transition: background-color 0.3s;">
          Verifikasi Email
        </a>
      </div>
      <p style="color: #777; font-size: 12px; margin-bottom: 10px;">
        Jika Anda tidak mendaftar untuk akun ini, silakan abaikan email ini.
      </p>
      <p style="color: #777; font-size: 12px; margin-bottom: 20px;">
        Terima kasih! 🌟 Dikirimkan oleh Ikbar dari tim KHAVI App
      </p>
      <blockquote style="margin: 0;">
        <p style="color: #777; font-size: 12px; font-style: italic;">
          "Mimpi itu gratis, tapi kelelahan menjalankannya adalah berbayar." - Anonymous
        </p>
      </blockquote>
    </div>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

// Fungsi untuk mengirim email reset password
function sendResetPasswordEmail(email, token) {
  // Konfigurasi opsi email
  const mailOptions = {
    from: "shigurekawai@gmail.com",
    to: email,
    subject: "Reset Password",
    html: `<p>Click <a href="http://localhost:5173/reset-password/${token}">here</a> to reset your password.</p>`,
  };

  // Kirim email
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending reset password email:", err);
    } else {
      console.log("Reset password email sent:", info.response);
    }
  });
}

export { sendTokenVerificationEmail, sendResetPasswordEmail };
