document.addEventListener("DOMContentLoaded", function () {
  const adminOption = document.getElementById("admin-option");
  const staffOption = document.getElementById("staff-option");
  const adminForm = document.getElementById("admin-form");
  const staffForm = document.getElementById("staff-form");
  const adminNotification = document.getElementById("admin-notification");
  const staffNotification = document.getElementById("staff-notification");

  // Helper to set Cookie
  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }

  // Switch to Admin Login
  adminOption.addEventListener("click", function () {
    adminOption.classList.remove("inactive");
    adminOption.classList.add("active");
    staffOption.classList.remove("active");
    staffOption.classList.add("inactive");

    adminForm.classList.add("active");
    staffForm.classList.remove("active");

    // Hide any notifications when switching forms
    adminNotification.style.display = "none";
    staffNotification.style.display = "none";
  });

  // Switch to Staff Login
  staffOption.addEventListener("click", function () {
    staffOption.classList.remove("inactive");
    staffOption.classList.add("active");
    adminOption.classList.remove("active");
    adminOption.classList.add("inactive");

    staffForm.classList.add("active");
    adminForm.classList.remove("active");

    // Hide any notifications when switching forms
    adminNotification.style.display = "none";
    staffNotification.style.display = "none";
  });

  // Admin Form Submission
  adminForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (data.success && data.role === "admin") {
        showNotification(adminNotification, "Login successful! Redirecting...", "success");

        // Store Token in Cookie (NOT LocalStorage)
        setCookie("session_token", data.token, 1);

        window.location.href = window.location.origin + window.location.pathname.replace("index.html", "") + "html/admin.html";
      } else {
        showNotification(adminNotification, data.message || "Invalid credentials", "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showNotification(adminNotification, "Server error. Ensure Node.js backend is running.", "error");
    }
  });

  // Staff Form Submission
  staffForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("staff-username").value;
    const password = document.getElementById("staff-password").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (data.success && data.role === "staff") {
        showNotification(staffNotification, "Login successful! Redirecting...", "success");

        // Store Token in Cookie (Database backed session)
        setCookie("session_token", data.token, 1);

        window.location.href = window.location.origin + window.location.pathname.replace("index.html", "") + "html/staff.html";
      } else {
        showNotification(staffNotification, data.message || "Invalid credentials", "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showNotification(staffNotification, "Server error. Ensure Node.js backend is running.", "error");
    }
  });

  // Helper function to show notifications
  function showNotification(element, message, type) {
    element.textContent = message;
    element.classList.add(type);
    element.style.display = "block";

    // Hide notification after 5 seconds
    setTimeout(function () {
      element.style.display = "none";
    }, 5000);
  }
});
