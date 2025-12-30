//register.js:
document.getElementById("registerBtn").onclick = async () => {
    const name = document.getElementById("name").value.trim();
    const ageValue = document.getElementById("age").value;
    const age = Number(ageValue);
    const gender = document.getElementById("gender").value;
    const location = document.getElementById("location").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const msg = document.getElementById("errorMsg");

    // Reset Message
    msg.textContent = "";
    msg.classList.add("d-none");

    // ❌ LEERE FELDER
    if (!name || !ageValue || !gender || !location || !email || !password) {
        msg.textContent = "Please fill in all fields.";
        msg.classList.remove("d-none");
        return;
    }

    // ❌ NAME MIT ZAHLEN
    if (/\d/.test(name)) {
        msg.textContent = "Name must not contain numbers.";
        msg.classList.remove("d-none");
        return;
    }

    // ❌ ALTER
    if (age < 18) {
        msg.textContent = "You must be at least 18 years old.";
        msg.classList.remove("d-none");
        return;
    }

    // ❌ GENDER PLATZHALTER
    if (gender === "placeholder") {
        msg.textContent = "Please select a gender.";
        msg.classList.remove("d-none");
        return;
    }

    // ❌ PASSWORT
    if (password.length < 6) {
        msg.textContent = "Password must be at least 6 characters.";
        msg.classList.remove("d-none");
        return;
    }

    // 🔐 SERVER REQUEST
    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            age,
            gender,
            location,
            email,
            password
        })
    });

    const data = await res.json();

    if (!res.ok) {
        msg.textContent = data.message || "Registration failed.";
        msg.classList.remove("d-none");
        return;
    }

    // ✅ ERFOLG
    if (data.needsProfile) {
        window.location.href = "/create-profile";
    } else {
        window.location.href = "/index";
    }

};
