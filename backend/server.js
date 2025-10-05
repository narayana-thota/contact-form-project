import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

dotenv.config();
const app = express();

// --- Pre-Flight Check for Environment Variables ---
const requiredEnvVars = [
    'MONGODB_URI',
    'ZOHO_CLIENT_ID',
    'ZOHO_CLIENT_SECRET',
    'ZOHO_REFRESH_TOKEN',
    'ZOHO_ACCOUNT_ID',
    'PORTFOLIO_OWNER_EMAIL'
];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        console.error(`❌ FATAL ERROR: Environment variable ${varName} is not defined.`);
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

// --- Mongoose Schema and Model ---
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model("Contact", contactSchema);

// --- Zoho API Function ---
const getZohoAccessToken = async () => {
    try {
        const response = await axios.post(
            `https://accounts.zoho.in/oauth/v2/token`, // This stays .in because it's the regional auth server
            null,
            {
                params: {
                    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                    client_id: process.env.ZOHO_CLIENT_ID,
                    client_secret: process.env.ZOHO_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                }
            }
        );
        console.log("✅ Successfully obtained new Zoho Access Token.");
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Failed to get Zoho Access Token:", error.response ? error.response.data : error.message);
        return null;
    }
};

// --- API Routes ---
app.get('/', (req, res) => {
    res.send("🚀 Welcome to the Contact Form API!");
});

// Main endpoint to handle form submissions
app.post('/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const contact = new Contact({ name, email, phone, message });
        await contact.save();
        console.log("✅ Contact submission saved to MongoDB.");
    } catch (dbError) {
        console.error("❌ Database Save Error:", dbError);
        return res.status(500).json({ error: "Failed to save your message. Please try again." });
    }

    try {
        const accessToken = await getZohoAccessToken();
        if (!accessToken) {
            throw new Error("Could not obtain Access Token to send email.");
        }

        const fromAddress = `narayanathota@zohomail.in`;
        const toAddress = process.env.PORTFOLIO_OWNER_EMAIL;

        const mimeContent = [
            `From: "Portfolio Notification" <${fromAddress}>`,
            `To: ${toAddress}`,
            `Reply-To: ${email}`,
            `Subject: 🚀 New Contact Form Submission from ${name}`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            `<h2>You have a new message from your portfolio:</h2><hr>`,
            `<h3>Details:</h3>`,
            `<ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> <a href="mailto:${email}">${email}</a></li><li><strong>Phone:</strong> ${phone}</li></ul>`,
            `<h3>Message:</h3><p>${message}</p>`
        ].join('\r\n');

        // ✅ CHANGE 1: Using the global .com API endpoint
        const createDraftResponse = await axios.post(
            `https://mail.zoho.com/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`,
            { content: mimeContent },
            { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
        );

        const messageId = createDraftResponse.data.data.id;
        
        // ✅ CHANGE 2: Using the global .com API endpoint
        await axios.post(
            `https://mail.zoho.com/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages/${messageId}/send`,
            {},
            { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
        );

        console.log('✅ Notification email sent successfully via Zoho API.');

    } catch (emailError) {
        console.error("❌ Zoho API Email Send Error:", emailError.response ? emailError.response.data : emailError.message);
    }

    res.status(201).json({ success: true, message: "Form submitted successfully!" });
});


// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
