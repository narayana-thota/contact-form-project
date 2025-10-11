import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

dotenv.config();
const app = express();

// --- Check Environment Variables ---
const requiredEnvVars = [
  "MONGODB_URI",
  "ZOHO_CLIENT_ID",
  "ZOHO_CLIENT_SECRET",
  "ZOHO_REFRESH_TOKEN",
  "ZOHO_ACCOUNT_ID",
  "EMAIL_USER",
  "PORTFOLIO_OWNER_EMAIL",
  "ZOHO_API_URL"
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

// --- Function: Get Zoho Access Token ---
const getZohoAccessToken = async () => {
  try {
    const res = await axios.post(
      "https://accounts.zoho.in/oauth/v2/token",
      null,
      {
        params: {
          refresh_token: process.env.ZOHO_REFRESH_TOKEN,
          client_id: process.env.ZOHO_CLIENT_ID,
          client_secret: process.env.ZOHO_CLIENT_SECRET,
          grant_type: "refresh_token"
        }
      }
    );
    console.log("✅ Successfully obtained new Zoho Access Token.");
    return res.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get Zoho Access Token:", error.response?.data || error.message);
    return null;
  }
};

// --- API ---
app.get("/", (req, res) => res.send("🚀 Portfolio Contact API running!"));

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

  // 2️⃣ Send Email via Zoho API
  try {
    const token = await getZohoAccessToken();
    if (!token) throw new Error("Could not obtain access token");

    await axios.post(
      `${process.env.ZOHO_API_URL}/${process.env.ZOHO_ACCOUNT_ID}/messages`,
      {
        fromAddress: process.env.EMAIL_USER,
        toAddress: process.env.PORTFOLIO_OWNER_EMAIL,
        subject: `🚀 New Contact from ${name}`,
        content: `<h2>New portfolio contact:</h2>
                  <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Phone:</strong> ${phone}</li>
                  </ul>
                  <h3>Message:</h3><p>${message}</p>`
      },
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );

    console.log("✅ Email sent successfully via Zoho API!");
  } catch (error) {
    console.error("❌ Zoho API Email Send Error:", error.response?.data || error.message);
  }

  res.status(201).json({ success: true, message: "Form submitted successfully!" });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
