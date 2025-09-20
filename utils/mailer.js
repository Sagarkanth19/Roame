const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,  // "apikey"
    pass: process.env.BREVO_PASS,  // your smtp key
  },
});

async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Roamé" <${process.env.BREVO_SENDER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Mail sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Mail error:", err);
    throw err;
  }
}

module.exports = sendMail;
