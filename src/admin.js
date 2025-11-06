document.addEventListener("DOMContentLoaded", function () {
  // ========== MENU SWITCH ==========
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

  // ========== STORAGE HELPERS ==========
  const STORAGE_KEY = "studentsData";

  function getStudents() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }

  function saveStudents(students) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  // ========== ADD STUDENT ==========
  const addForm = document.getElementById("add-student-form");
  addForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const reg = document.getElementById("reg-number").value.trim();
    const year = document.getElementById("year").value;
    const email = document.getElementById("email").value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value;

    if (!name || !reg || !year || !email || !gender) {
      alert("Please fill all fields properly!");
      return;
    }

    const students = getStudents();
    if (students.some((s) => s.reg === reg)) {
      alert("Register number already exists!");
      return;
    }

    students.push({ name, reg, year, email, gender });
    saveStudents(students);

    alert("✅ Student added successfully!");
    addForm.reset();
    renderTable();
  });

  // ========== RENDER STUDENTS TABLE ==========
  function renderTable() {
    const tbody = document.querySelector("#students-list tbody");
    const students = getStudents();
    tbody.innerHTML = "";

    students.forEach((s, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${s.reg}</td>
        <td>${s.name}</td>
        <td><span class="gender-badge gender-${s.gender}">${s.gender}</span></td>
        <td>${s.year}</td>
        <td>${s.email}</td>
        <td class="action-buttons">
          <button class="btn-edit" data-id="${s.reg}"><i class="fas fa-edit"></i></button>
          <button class="btn-delete" data-id="${s.reg}"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    attachTableActions();
  }

  // ========== DELETE / EDIT HANDLERS ==========
  function attachTableActions() {
    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", function () {
        const reg = this.dataset.id;
        let students = getStudents();
        students = students.filter((s) => s.reg !== reg);
        saveStudents(students);
        renderTable();
      });
    });

    document.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", function () {
        const reg = this.dataset.id;
        const student = getStudents().find((s) => s.reg === reg);
        if (!student) return alert("Student not found!");

        document.querySelector('[data-target="edit-students"]').click();
        document.getElementById("search-reg").value = student.reg;
        document.getElementById("edit-name").value = student.name;
        document.getElementById("edit-year").value = student.year;
        document.getElementById("edit-email").value = student.email;
        document.querySelector(`input[name="edit-gender"][value="${student.gender}"]`).checked = true;
      });
    });
  }

  // ========== EDIT STUDENT ==========
  const editForm = document.getElementById("edit-student-form");
  editForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const reg = document.getElementById("search-reg").value.trim();
    const students = getStudents();
    const index = students.findIndex((s) => s.reg === reg);

    if (index === -1) return alert("Student not found!");

    students[index].name = document.getElementById("edit-name").value.trim();
    students[index].year = document.getElementById("edit-year").value;
    students[index].email = document.getElementById("edit-email").value.trim();
    const gender = document.querySelector('input[name="edit-gender"]:checked')?.value;
    if (gender) students[index].gender = gender;

    saveStudents(students);
    alert("✅ Student updated successfully!");
    renderTable();
  });

  // ========== INITIAL LOAD ==========
  renderTable();  
  updateDashboard();

  // === DASHBOARD AUTO-UPDATE ===
function updateDashboard() {
  const students = JSON.parse(localStorage.getItem("studentsData")) || [];

  // Calculate counts
  const total = students.length;
  const males = students.filter((s) => s.gender === "male").length;
  const females = students.filter((s) => s.gender === "female").length;

  // Update numbers
  document.getElementById("totalStudents").textContent = total;
  document.getElementById("maleStudents").textContent = males;
  document.getElementById("femaleStudents").textContent = females;

  // Count by year (2nd, 3rd, 4th)
  const yearCounts = { "2": 0, "3": 0, "4": 0 };
  students.forEach((s) => {
    if (s.year && yearCounts[s.year] !== undefined) {
      yearCounts[s.year]++;
    }
  });

  // Draw chart
  drawYearChart(yearCounts);
}

let chartInstance = null;
function drawYearChart(yearCounts) {
  const ctx = document.getElementById("yearChart");
  const labels = ["2nd Year", "3rd Year", "4th Year"];
  const data = [yearCounts["2"], yearCounts["3"], yearCounts["4"]];

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Number of Students",
          data: data,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

});
document.getElementById("download-pdf").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const students = JSON.parse(localStorage.getItem("studentsData") || "[]");

  if (students.length === 0) {
    alert("No student data found!");
    return;
  }

  // PDF Header
  doc.setFontSize(18);
  doc.text("CSE Department - Student List", 14, 20);
  doc.setFontSize(12);
  doc.text(`Total Students: ${students.length}`, 14, 30);

  // Table Headers
  const headers = ["S.No", "Reg No", "Name", "Gender", "Year", "Email"];
  let y = 40;
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, 14 + i * 30, y));
  doc.setFont("helvetica", "normal");

  // Table Data
  y += 10;
  students.forEach((s, index) => {
    doc.text(String(index + 1), 14, y);
    doc.text(s.reg || "-", 44, y);
    doc.text(s.name || "-", 74, y);
    doc.text(s.gender || "-", 104, y);
    doc.text(s.year ? `${s.year} Year` : "-", 134, y);
    doc.text(s.email || "-", 164, y);
    y += 10;

    // Add new page if needed
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("students_list.pdf");
});
// === EDIT STUDENT: Search and Auto-fill ===
const searchButton = document.querySelector('#edit-student-form button.btn.btn-primary');
const searchInput = document.getElementById("search-reg");

searchButton.addEventListener("click", function (e) {
  e.preventDefault();
  const regValue = searchInput.value.trim().toLowerCase();

  if (!regValue) {
    alert("⚠️ Please enter a register number!");
    return;
  }

  const students = JSON.parse(localStorage.getItem("studentsData")) || [];
  const found = students.find(s => s.reg.toLowerCase() === regValue);

  if (found) {
    // Fill the fields
    document.getElementById("edit-name").value = found.name;
    document.getElementById("edit-year").value = found.year;
    document.getElementById("edit-email").value = found.email;

    const genderInput = document.querySelector(
      `input[name="edit-gender"][value="${found.gender}"]`
    );
    if (genderInput) genderInput.checked = true;

    alert("✅ Student found and details loaded!");
  } else {
    alert("❌ No student found with that register number!");
    clearEditFields();
  }
});

function clearEditFields() {
  document.getElementById("edit-name").value = "";
  document.getElementById("edit-year").value = "";
  document.getElementById("edit-email").value = "";
  document.querySelectorAll('input[name="edit-gender"]').forEach((g) => (g.checked = false));
}

