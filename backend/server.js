import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";

dotenv.config();
const app = express();

// --- Check Environment Variables ---
const requiredEnvVars = [
  "MONGODB_URI",
  "SENDGRID_API_KEY",
  "SENDGRID_VERIFIED_SENDER",
  "PORTFOLIO_OWNER_EMAIL"
];
for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`❌ Missing environment variable: ${v}`);
    process.exit(1);
  }
}

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Successfully connected to MongoDB Atlas!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Schema ---
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  message: String,
  submittedAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model("Contact", contactSchema);

// --- Configure SendGrid ---
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- Root API ---
app.get("/", (req, res) => res.send("🚀 Portfolio Contact API (SendGrid) running!"));

// --- POST /contact ---
app.post("/contact", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone || !message)
    return res.status(400).json({ error: "All fields are required." });

  // 1️⃣ Save contact to MongoDB
  try {
    const contact = new Contact({ name, email, phone, message });
    await contact.save();
    console.log("✅ Contact submission saved to MongoDB.");
  } catch (err) {
    console.error("❌ Database Error:", err);
    return res.status(500).json({ error: "Failed to save your message." });
  }

  // 2️⃣ Send Email via SendGrid
  try {
    const msg = {
      to: process.env.PORTFOLIO_OWNER_EMAIL, // Your portfolio email
      from: process.env.SENDGRID_VERIFIED_SENDER, // Verified sender in SendGrid
      subject: `🚀 New Contact from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Message: ${message}
      `,
      html: `
        <h2>New Portfolio Contact:</h2><hr>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Phone:</strong> ${phone}</li>
        </ul>
        <h3>Message:</h3>
        <p>${message}</p>
      `
    };

    await sgMail.send(msg);
    console.log("✅ Email sent successfully via SendGrid!");
  } catch (error) {
    console.error("❌ SendGrid Email Send Error:", error.response?.body || error.message);
  }

  res.status(201).json({ success: true, message: "Form submitted successfully!" });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
