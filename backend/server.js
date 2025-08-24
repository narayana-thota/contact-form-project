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
// Using the variable name from your Render setup for consistency
const uri = process.env.MONGODB_URI; 
mongoose.connect(uri)
    .then(() => console.log("Successfully connected to MongoDB Atlas!"))
    .catch(err => console.error("MongoDB connection error:", err));

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
// This transporter is now configured to use our reliable Zoho Mail credentials
// It securely pulls the details from the environment variables on Render
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // This will be 'smtp.zoho.in'
    port: process.env.EMAIL_PORT, // This will be 465
    secure: true, // Because we are using port 465
    auth: {
        user: process.env.EMAIL_USER, // Your full Zoho email address
        pass: process.env.EMAIL_PASS, // Your Zoho account password
    },
});

// --- API Routes ---
app.get('/', (req, res) => {
    res.send("Welcome to the Contact Form API!");
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
        console.log("Contact submission saved to MongoDB.");
    } catch (dbError) {
        console.error("Database Save Error:", dbError);
        // If the database fails, we stop here and inform the client.
        return res.status(500).json({ error: "Failed to save your message. Please try again." });
    }

    // --- Step 2: Send the email notification via Zoho ---
    const mailOptions = {
        from: `"Portfolio Site" <${process.env.EMAIL_USER}>`, // From your Zoho email
        to: process.env.PORTFOLIO_OWNER_EMAIL,             // To your personal inbox
        subject: `🚀 New Contact Form Submission from ${name}`,
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
        console.log('Notification email sent successfully via Zoho.');
    } catch (emailError) {
        console.error("Email Send Error:", emailError);
        // IMPORTANT: We don't send an error response here.
        // The user's message was saved successfully, which is the most critical part.
        // The failure to send a notification is an internal issue for you to check in the logs.
    }

    // --- Step 3: Respond to the frontend ---
    res.status(201).json({ success: true, message: "Form submitted successfully!" });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
