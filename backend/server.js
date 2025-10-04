import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios"; // ✅ We now use Axios to make API calls, not Nodemailer
import cors from "cors";

dotenv.config();
const app = express();

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

// --- Zoho API Authentication ---
// This section handles our new, advanced authentication flow.
let zohoAccessToken = null; // We will store the temporary "one-hour pass" here.

// This function uses your permanent Refresh Token to get a temporary Access Token.
const getZohoAccessToken = async () => {
    try {
        const response = await axios.post(
            `https://accounts.zoho.in/oauth/v2/token`,
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
        zohoAccessToken = response.data.access_token;
        console.log("✅ Successfully obtained new Zoho Access Token.");
    } catch (error) {
        console.error("❌ Failed to get Zoho Access Token:", error.response ? error.response.data : error.message);
        zohoAccessToken = null;
    }
};

// --- API Routes ---
app.get('/', (req, res) => {
    res.send("🚀 Welcome to the Contact Form API!");
});

// Main endpoint to handle form submissions
app.post('/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    // Basic validation
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: "All fields are required." });
    }

    // --- Step 1: Save submission to the database ---
    try {
        const contact = new Contact({ name, email, phone, message });
        await contact.save();
        console.log("✅ Contact submission saved to MongoDB.");
    } catch (dbError) {
        console.error("❌ Database Save Error:", dbError);
        return res.status(500).json({ error: "Failed to save your message. Please try again." });
    }

    // --- Step 2: Send the email notification using the Zoho API ---
    try {
        if (!zohoAccessToken) {
            console.log("Access Token not found, requesting a new one...");
            await getZohoAccessToken();
            if (!zohoAccessToken) {
                throw new Error("Could not obtain Access Token to send email.");
            }
        }
        
        // This is the clever, two-step trick: Create a draft, then send it.
        const fromAddress = `narayanathota@zohomail.in`; // Your verified Zoho email
        const toAddress = process.env.PORTFOLIO_OWNER_EMAIL;

        // The email content must be in a special format called MIME.
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

        // First, create the draft.
        const createDraftResponse = await axios.post(
            `https://mail.zoho.in/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`,
            { content: mimeContent },
            { headers: { Authorization: `Zoho-oauthtoken ${zohoAccessToken}` } }
        );
        
        console.log('✅ Draft created successfully.');
        
        // Second, send the draft.
        const messageId = createDraftResponse.data.data.id;
        await axios.post(
            `https://mail.zoho.in/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages/${messageId}/send`,
            {},
            { headers: { Authorization: `Zoho-oauthtoken ${zohoAccessToken}` } }
        );

        console.log('✅ Notification email sent successfully via Zoho API.');

    } catch (emailError) {
        console.error("❌ Zoho API Email Send Error:", emailError.response ? emailError.response.data : emailError.message);
        // If the token expired, try one more time.
        if (emailError.response && emailError.response.data.data.errorCode === 'INVALID_OAUTHTOKEN') {
            console.log("Access Token expired, refreshing and retrying...");
            zohoAccessToken = null; // Clear the old token
            // Here you could add logic to retry sending the email one more time.
        }
    }

    // --- Step 3: Respond to the frontend ---
    res.status(201).json({ success: true, message: "Form submitted successfully!" });
});


// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    // Get the first Access Token when the server starts.
    await getZohoAccessToken(); 
    // This will automatically refresh the token every 50 minutes.
    setInterval(getZohoAccessToken, 50 * 60 * 1000); 
});
