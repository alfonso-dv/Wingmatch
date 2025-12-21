const form = document.getElementById("profileForm");
const result = document.getElementById("result");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const profile = {
        name: document.getElementById("name").value.trim(),
        age: Number(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        location: document.getElementById("location").value.trim()
    };

    // einfache Validierung (MUST)
    if (!profile.name || !profile.gender || !profile.location || profile.age < 18) {
        result.textContent = "❌ Please fill in all fields correctly.";
        return;
    }

    const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });

    const data = await response.json();

    result.textContent = data.message;
});
