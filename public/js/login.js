document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const msg = document.getElementById("msg");

    msg.textContent = "";
    msg.classList.add("d-none");

    // 🔍 VALIDIERUNG
    if (!email || !password) {
        msg.textContent = "Please fill in all fields.";
        msg.classList.remove("d-none");
        return;
    }

    if (!email.includes("@")) {
        msg.textContent = "Please enter a valid email address.";
        msg.classList.remove("d-none");
        return;
    }

    // 🔐 SERVER REQUEST
    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
        msg.textContent = data.message;
        msg.classList.remove("d-none");
        return;
    }

    msg.textContent = "Login successful!";

    setTimeout(() => {
        window.location.href = "/index";
    }, 700);
};
