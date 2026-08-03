(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const msg = document.getElementById("form-msg");
    btn.disabled = true;
    msg.hidden = false;
    msg.className = "form-msg";
    msg.textContent = "Sending…";

    const payload = Object.fromEntries(new FormData(form).entries());
    const endpoint = form.dataset.endpoint || "/api/contact";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send");
      msg.className = "form-msg ok";
      msg.textContent = "Thank you. Your message has been received.";
      form.reset();
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message || "Something went wrong.";
    } finally {
      btn.disabled = false;
    }
  });
})();
