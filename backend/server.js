require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Import Nodemailer

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contactform';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch(err => console.error("MongoDB connection error:", err));

// Define Contact Schema and Model
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// Routes
app.get('/', (req, res) => {
    res.send("Welcome to the Contact Form API!");
});

// Endpoint to Handle Contact Form Submissions (Updated with Email Notification)
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        // Validate input
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // 1. Create and save contact form submission to MongoDB
        const contact = new Contact({ name, email, phone, message });
        await contact.save();
        console.log("Contact saved to MongoDB.");

        // --- 2. Send Email Notification ---
        // Create a transporter object using your email service (e.g., Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address from environment variables
                pass: process.env.EMAIL_PASS, // Your Gmail App Password from environment variables
            },
        });

        // Setup email data
        const mailOptions = {
            from: `"Portfolio Site" <${process.env.EMAIL_USER}>`, // Sender address
            to: 'your-personal-email@example.com', // <<-- CHANGE THIS to your personal email
            subject: '🚀 New Contact Form Submission!',
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

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Notification email sent successfully.');

        // Respond to the frontend
        res.status(201).json({ success: true, message: "Form submitted successfully!" });

    } catch (err) {
        console.error("Error processing submission:", err);
        res.status(500).json({ error: "An error occurred. Please try again later." });
    }
});

// Optional health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
