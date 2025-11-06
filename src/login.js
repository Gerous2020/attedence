document.addEventListener("DOMContentLoaded", function () {
  const adminOption = document.getElementById("admin-option");
  const staffOption = document.getElementById("staff-option");
  const adminForm = document.getElementById("admin-form");
  const staffForm = document.getElementById("staff-form");
  const adminNotification = document.getElementById("admin-notification");
  const staffNotification = document.getElementById("staff-notification");

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
  adminForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    // Simple validation
    if (username === "admin" && password === "admin123") {
      showNotification(
        adminNotification,
        "Login successful! Redirecting...",
        "success"
      );
      window.location.href = "attedence/html/admin.html";
    } else {
      showNotification(
        adminNotification,
        "Invalid admin credentials. Please try again.",
        "error"
      );
    }
  });

  // Staff Form Submission
  staffForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = document.getElementById("staff-username").value;
    const password = document.getElementById("staff-password").value;

    // Simple validation
    if (username === "staff" && password === "staff123") {
      showNotification(
        staffNotification,
        "Login successful! Redirecting...",
        "success"
      );
      window.location.href = "attedence/html/staff.html";
    } else {
      showNotification(
        staffNotification,
        "Invalid staff credentials. Please try again.",
        "error"
      );
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
