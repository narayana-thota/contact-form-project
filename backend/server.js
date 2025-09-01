
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
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

// --- Nodemailer Transporter Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true, // SSL required for port 465
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, // App-specific password from Zoho
    },
});

// --- API Routes ---
app.get("/", (req, res) => {
    res.send("🚀 Welcome to the Contact Form API!");
});

// Main endpoint to handle form submissions
app.post("/contact", async (req, res) => {
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
        from: process.env.EMAIL_USER, // Must always be your verified Zoho email
        to: process.env.PORTFOLIO_OWNER_EMAIL, // Your personal inbox
        subject: `🚀 New Contact Form Submission from ${name}`,
        replyTo: email, // Visitor’s email so you can reply directly
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
        console.log("✅ Notification email sent successfully via Zoho.");
    } catch (emailError) {
        console.error("❌ Email Send Error:", emailError);
        // Still return success since DB save worked
    }

    // --- Step 3: Respond to the frontend ---
    res.status(201).json({ success: true, message: "Form submitted successfully!" });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
