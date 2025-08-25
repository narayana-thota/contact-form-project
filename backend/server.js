require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MongoDB Connection ---
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
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

const Contact = mongoose.model('Contact', contactSchema);

// --- Nodemailer Transporter Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,   // e.g., smtp.zoho.in
    port: process.env.EMAIL_PORT,   // 465
    secure: true,                   // true for SSL
    auth: {
        user: process.env.EMAIL_USER, // e.g., narayanathota@zoho.in
        pass: process.env.EMAIL_PASS, // 16-char app-specific password
    },
});

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

    // --- Step 2: Send the email notification via Zoho ---
    const mailOptions = {
        // ✅ Must match your Zoho account to avoid 553 relay error
        from: `"Portfolio Notification" <${process.env.EMAIL_USER}>`,

        // ✅ Where you want to receive the form submission
        to: process.env.PORTFOLIO_OWNER_EMAIL,

        subject: `🚀 New Contact Form Submission from ${name}`,

        // ✅ Allows replying directly to the user
        replyTo: email,

        html: `
            <h2>You have a new message from your portfolio:</h2>
            <hr>
            <h3>Details:</h3>
            <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> <a href="mailto:${email}">${email}</a></li>
                <li><strong>Phone:</strong> ${phone}</li>
            </ul>
            <h3>Message:</h3>
            <p>${message}</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Notification email sent successfully via Zoho.');

        // ✅ Respond success only if email was sent
        return res.status(201).json({ success: true, message: "Form submitted successfully!" });

    } catch (emailError) {
        console.error("❌ Email Send Error:", emailError);

        // ✅ If email fails, notify frontend
        return res.status(500).json({ success: false, error: "Failed to send notification email." });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
