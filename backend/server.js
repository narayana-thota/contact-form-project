require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS

const app = express();
const PORT = process.env.PORT || 5000; // Use the port from environment variable or default to 5000

// Middleware
app.use(cors()); // Enable CORS for all domains
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// MongoDB Connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contactform';  // Use environment variable for MongoDB URI or fallback to local MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch(err => console.error("MongoDB connection error:", err));

// Define Contact Schema and Model
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }, // New phone number field
    message: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// Routes
app.get('/', (req, res) => {
    res.send("Welcome to the Contact Form API!");
});

// Endpoint to Handle Contact Form Submissions (Updated to match frontend URL)
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        // Validate input
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Create and save contact form submission
        const contact = new Contact({ name, email, phone, message });
        await contact.save();

        res.status(201).json({ success: true, message: "Form submitted successfully!" });
    } catch (err) {
        console.error("Error saving contact form submission:", err);
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
