document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent form from submitting the default way

    const loadingMessage = document.getElementById("loadingMessage");
    const successMessage = document.getElementById("successMessage");
    const contactForm = document.getElementById("contactForm");

    // Hide any previous success message and show loading spinner
    successMessage.classList.add("hidden");
    loadingMessage.classList.remove("hidden");

    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        message: document.getElementById("message").value.trim(),
    };

    // Updated with your new Render domain + /api/contact endpoint
    fetch("https://contact-form-project-1-2qi5.onrender.com/api/contact", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    })
    .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to submit form");
        }
        return data;
    })
    .then((data) => {
        loadingMessage.classList.add("hidden");
        if (data.success) {
            successMessage.classList.remove("hidden");
            contactForm.reset();
        } else {
            alert("Error: " + (data.message || "Submission failed."));
        }
    })
    .catch((error) => {
        loadingMessage.classList.add("hidden");
        console.error("Error:", error);
        alert(error.message || "An error occurred. Please try again later.");
    });
});
