const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"Auth App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Email Verification Code",

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: 40px auto;
        padding: 30px;
        border: 1px solid #ddd;
        border-radius: 12px;
      ">
        <h2>Verify your email</h2>

        <p>Your verification code is:</p>

        <div style="
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 25px 0;
        ">
          ${otp}
        </div>

        <p>This code will expire in 10 minutes.</p>

        <p style="color: #777;">
          If you didn't request this code, you can ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = sendOtpEmail;