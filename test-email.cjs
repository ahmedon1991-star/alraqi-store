require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("Testing SMTP setup...");
console.log("Host:", process.env.SMTP_HOST);
console.log("User:", process.env.SMTP_USER);
console.log("Pass length:", process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: process.env.SMTP_USER,
  subject: "Test via node",
  text: "Hello"
}).then(info => {
  console.log("SUCCESS:", info);
}).catch(err => {
  console.error("ERROR:", err);
});
