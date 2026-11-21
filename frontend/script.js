/*
 * Local development: the backend defaults to http://localhost:5000.
 * For deployment, replace the URL below with your actual deployed backend origin.
 * Do not add /contact here; the route is appended below.
 */
const API_BASE_URL = "https://contact-form-project-1-2qi5.onrender.com/"
const contactForm = document.getElementById("contactForm");
const loadingMessage = document.getElementById("loadingMessage");
const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");
const submitButton = document.getElementById("submitButton");

contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    successMessage.classList.add("hidden");
    errorMessage.classList.add("hidden");

    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        message: document.getElementById("message").value.trim()
    };

    if (Object.values(formData).some((value) => !value)) {
        errorMessage.textContent = "Please complete all fields.";
        errorMessage.classList.remove("hidden");
        return;
    }

    loadingMessage.classList.remove("hidden");
    submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/contact`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success !== true) {
            throw new Error(data.message || "Unable to submit your message.");
        }

        contactForm.reset();

        if (data.emailSent) {
            successMessage.textContent = "Thank you! Your message has been saved and an email notification was sent.";
        } else {
            successMessage.textContent = "Thank you! Your message has been saved. Email notification is currently unavailable.";
        }

        successMessage.classList.remove("hidden");
    } catch (error) {
        console.error("Contact form submission failed:", error);
        errorMessage.textContent = error.message || "Something went wrong. Please try again.";
        errorMessage.classList.remove("hidden");
    } finally {
        loadingMessage.classList.add("hidden");
        submitButton.disabled = false;
    }
});
