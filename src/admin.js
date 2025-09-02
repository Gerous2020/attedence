document.addEventListener("DOMContentLoaded", function () {
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

  // Form submission handling
  document
    .getElementById("add-student-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      // Get gender value
      const gender = document.querySelector(
        'input[name="gender"]:checked'
      ).value;

      alert(`Student added successfully!\nGender: ${gender}`);
      this.reset();
    });

  document
    .getElementById("edit-student-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      // Get gender value
      const gender = document.querySelector(
        'input[name="edit-gender"]:checked'
      ).value;

      alert(`Student details updated successfully!\nGender: ${gender}`);
    });

  // Add some sample data for demonstration
  const sampleData = [
    {
      id: 1,
      reg: "CS2023001",
      name: "Rajesh Kumar",
      gender: "male",
      year: "2nd Year",
      email: "rajesh@example.com",
    },
    {
      id: 2,
      reg: "CS2023002",
      name: "Priya Sharma",
      gender: "female",
      year: "1st Year",
      email: "priya@example.com",
    },
    {
      id: 3,
      reg: "CS2021005",
      name: "Vikram Singh",
      gender: "male",
      year: "3rd Year",
      email: "vikram@example.com",
    },
    {
      id: 4,
      reg: "CS2020042",
      name: "Anjali Patel",
      gender: "female",
      year: "4th Year",
      email: "anjali@example.com",
    },
    {
      id: 5,
      reg: "CS2023015",
      name: "Sanjay Gupta",
      gender: "male",
      year: "2nd Year",
      email: "sanjay@example.com",
    },
  ];
});
