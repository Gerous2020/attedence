document.addEventListener("DOMContentLoaded", function () {
  // Set today's date as default
  const today = new Date();
  const formattedDate = today.toISOString().substr(0, 10);
  document.getElementById("attendance-date").value = formattedDate;

  // Menu item click handling
  const menuItems = document.querySelectorAll(".menu-item");
  const contentSections = document.querySelectorAll(".content-section");

  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");

      // Update active menu item
      menuItems.forEach((mi) => mi.classList.remove("active"));
      this.classList.add("active");

      // Show corresponding content section
      contentSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  // Attendance button handling
  const presentButtons = document.querySelectorAll(".btn-present");
  const absentButtons = document.querySelectorAll(".btn-absent");

  presentButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const studentId = this.getAttribute("data-student");
      markAttendance(studentId, "present");
    });
  });

  absentButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const studentId = this.getAttribute("data-student");
      markAttendance(studentId, "absent");
    });
  });

  function markAttendance(studentId, status) {
    // Find the row for this student
    const row = document
      .querySelector(`button[data-student="${studentId}"]`)
      .closest("tr");

    // Update status badge
    const statusBadge = row.querySelector(".status-badge");
    statusBadge.className =
      "status-badge " +
      (status === "present" ? "status-present" : "status-absent");
    statusBadge.textContent = status === "present" ? "Present" : "Absent";

    // Visual feedback for button click
    if (status === "present") {
      row.querySelector(".btn-present").classList.add("selected");
      row.querySelector(".btn-absent").classList.remove("selected");
    } else {
      row.querySelector(".btn-absent").classList.add("selected");
      row.querySelector(".btn-present").classList.remove("selected");
    }

    // In a real application, you would send this data to the server
    console.log(`Marked student ${studentId} as ${status}`);
  }

  // Stats card click handling
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((card) => {
    card.addEventListener("click", function () {
      const year = this.getAttribute("data-year");
      const menuItem = document.querySelector(
        `.menu-item[data-target="${year}-year"]`
      );
      if (menuItem) {
        menuItem.click();
      }
    });
  });
});
