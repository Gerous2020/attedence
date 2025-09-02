document.addEventListener("DOMContentLoaded", function () {
  const menuItems = document.querySelectorAll(".menu-item");
  const contentSections = document.querySelectorAll(".content-section");

  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");

      menuItems.forEach((mi) => mi.classList.remove("active"));
      this.classList.add("active");

      contentSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  document
    .getElementById("add-student-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Student added successfully!");
      this.reset();
    });

  document
    .getElementById("edit-student-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Student details updated successfully!");
    });
});
