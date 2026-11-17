
document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault();

    document.getElementById("loadingMessage").classList.remove("hidden");

    const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        message: document.getElementById("message").value,
    };

    fetch("https://contact-form-project-1-2qi5.onrender.com/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error("Failed to submit form");
        }
        return response.json();
    })
    .then((data) => {
        document.getElementById("loadingMessage").classList.add("hidden");

        if (data.success) {
            document.getElementById("successMessage").classList.remove("hidden");
            document.getElementById("contactForm").reset();
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch((error) => {
        document.getElementById("loadingMessage").classList.add("hidden");
        console.error("Error:", error);
        alert("Something went wrong. Please try again.");
    });
});
