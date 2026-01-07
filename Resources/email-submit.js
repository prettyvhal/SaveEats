document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const submitModal = document.getElementById("submit-modal");
  const notifModal = document.getElementById("notif-modal");
  const errorModal = document.getElementById("error-modal");
  const errorMessageBox = errorModal.querySelector(".error-message");
  const closeButtons = document.querySelectorAll(".close-btn");
  const emailSubmit = document.getElementById("email-submit-btn");
  const emailModal = document.getElementById("contact-modal");

  // Initialize EmailJS
  emailjs.init("q9IJHbZrvzd1c7uig");

  if (!form) {
    console.error("Form with id 'contact-form' not found.");
    return;
  }
  
  emailSubmit?.addEventListener("click", async (e) => {
    e.preventDefault();

    const formData = {
      name: form.name.value,
      email: form.email.value,
      subject: form.subject.value,
      location: form.location?.value.trim() || "Not provided",
      socials: form.socials?.value.trim() || "Not provided",
      number: form.number?.value.trim() || "Not provided",
      others: form.others?.value.trim() || "Not provided"
    };

    try {
      const response = await emailjs.send("service_j3pydwq", "template_acfe4gm", {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        location: formData.location,
        socials: formData.socials,
        number: formData.number,
        others: formData.others,
      });

      if (response.status === 200) {
        emailModal.classList.remove("visible")
        showNotif(`We will email you later once we validate your resto, thank you`);
        safeVibrate([50, 150, 50]);
        form.reset();
      } else {
        showError(`Unexpected response from server: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      showError(
        error?.text ||
        error?.message ||
        "Failed to send message. Check your connection"
      );
    }
  });

  function showError(message) {
    errorMessageBox.textContent = message;
    errorModal.classList.add("visible");
    safeVibrate([50, 150, 50]);
  }
});
