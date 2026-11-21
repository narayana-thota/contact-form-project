import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import { connectDB } from "./config/db.js";
import Contact from "./database/contactmodel.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow requests without an Origin header (e.g. curl/Postman).
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin is not allowed by CORS."));
    }
}));

app.use(express.json({ limit: "20kb" }));

const emailConfigured = Boolean(
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_VERIFIED_SENDER &&
    process.env.PORTFOLIO_OWNER_EMAIL
);

if (emailConfigured) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.warn("SendGrid is not fully configured. Contact submissions will still be saved.");
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function validateContact({ name, email, phone, message }) {
    if (![name, email, phone, message].every(
        (value) => typeof value === "string" && value.trim()
    )) {
        return "All fields are required.";
    }

    if (name.trim().length > 100) return "Name must be 100 characters or fewer.";
    if (email.trim().length > 254) return "Email must be 254 characters or fewer.";
    if (phone.trim().length > 30) return "Phone must be 30 characters or fewer.";
    if (message.trim().length > 5000) return "Message must be 5000 characters or fewer.";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) return "Please provide a valid email address.";

    return null;
}

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Portfolio Contact API is running."
    });
});

app.post("/contact", async (req, res) => {
    const payload = req.body || {};
    const validationError = validateContact(payload);

    if (validationError) {
        return res.status(400).json({
            success: false,
            message: validationError
        });
    }

    const contactData = {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        message: payload.message.trim()
    };

    let savedContact;

    try {
        savedContact = await Contact.create(contactData);
        console.log(`Contact submission saved. ID: ${savedContact._id}`);
    } catch (error) {
        console.error("MongoDB save error:", error);
        return res.status(500).json({
            success: false,
            message: "Your message could not be saved. Please try again later."
        });
    }

    let emailSent = false;

    if (emailConfigured) {
        const safeName = escapeHtml(contactData.name);
        const safeEmail = escapeHtml(contactData.email);
        const safePhone = escapeHtml(contactData.phone);
        const safeMessage = escapeHtml(contactData.message).replace(/\r?\n/g, "<br>");

        try {
            await sgMail.send({
                to: process.env.PORTFOLIO_OWNER_EMAIL,
                from: process.env.SENDGRID_VERIFIED_SENDER,
                replyTo: contactData.email,
                subject: `New portfolio contact from ${contactData.name}`,
                text: [
                    `Name: ${contactData.name}`,
                    `Email: ${contactData.email}`,
                    `Phone: ${contactData.phone}`,
                    `Message: ${contactData.message}`
                ].join("\n"),
                html: `
                    <h2>New Portfolio Contact</h2>
                    <ul>
                        <li><strong>Name:</strong> ${safeName}</li>
                        <li><strong>Email:</strong> ${safeEmail}</li>
                        <li><strong>Phone:</strong> ${safePhone}</li>
                    </ul>
                    <h3>Message</h3>
                    <p>${safeMessage}</p>
                `
            });

            emailSent = true;
            console.log("Contact notification email sent.");
        } catch (error) {
            console.error(
                "SendGrid email error:",
                error.response?.body || error.message
            );
        }
    }

    return res.status(201).json({
        success: true,
        message: "Your contact message has been saved.",
        emailSent,
        contactId: savedContact._id
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

app.use((error, req, res, next) => {
    console.error("Request error:", error);
    if (res.headersSent) return next(error);

    const status = error.status === 400 ? 400 : 500;
    return res.status(status).json({
        success: false,
        message: status === 400
            ? "Invalid JSON request body."
            : "An unexpected server error occurred."
    });
});

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Contact API listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
