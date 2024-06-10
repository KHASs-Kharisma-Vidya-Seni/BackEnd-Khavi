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
      <h2 style="color: #333; text-align: center;">Verifikasi Email Anda</h2>
      <p style="color: #555; text-align: center;">
        Terima kasih telah mendaftar! Klik tombol di bawah untuk memverifikasi alamat email Anda.
      </p>
      <div style="text-align: center; margin: 20px;">
        <a href="http://localhost:${process.env.PORT}/api/auth/verify/${token}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verifikasi Email
        </a>
      </div>
      <p style="color: #777; text-align: center; font-size: 12px;">
        Jika Anda tidak mendaftar akun ini, harap abaikan email ini.
      </p>
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
