document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "/api/students";

  // ========== MENU SWITCH ==========
  const menuItems = document.querySelectorAll(".menu-item");
  const contentSections = document.querySelectorAll(".content-section");
  let chartInstance = null;

  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");

      menuItems.forEach((mi) => mi.classList.remove("active"));
      this.classList.add("active");

      contentSections.forEach((section) => section.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  // ========== API HELPERS ==========
  async function fetchStudents() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  // ========== ADD STUDENT ==========
  const addForm = document.getElementById("add-student-form");
  addForm.addEventListener("submit", async function (e) {
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

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, reg, year, email, gender }),
      });
      const data = await res.json();

      if (res.ok) {
        alert("✅ Student added successfully!");
        addForm.reset();
        renderTable();
        updateDashboard();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  });

  // ========== RENDER STUDENTS TABLE ==========
  async function renderTable() {
    const tbody = document.querySelector("#students-list tbody");
    const students = await fetchStudents();
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
    // Delete
    document.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const reg = this.dataset.id;
        if (!confirm(`Are you sure you want to delete student ${reg}?`)) return;

        try {
          const res = await fetch(`${API_URL}/${reg}`, { method: "DELETE" });
          if (res.ok) {
            renderTable();
            updateDashboard();
          } else {
            alert("Failed to delete.");
          }
        } catch (err) {
          alert("Server error.");
        }
      });
    });

    // Edit (Open Form)
    document.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async function () {
        const reg = this.dataset.id;
        const students = await fetchStudents();
        const student = students.find((s) => s.reg === reg);
        if (!student) return alert("Student not found!");

        document.querySelector('[data-target="edit-students"]').click();
        document.getElementById("search-reg").value = student.reg;
        document.getElementById("edit-name").value = student.name;
        document.getElementById("edit-year").value = student.year;
        document.getElementById("edit-email").value = student.email;
        const genderRadio = document.querySelector(`input[name="edit-gender"][value="${student.gender}"]`);
        if (genderRadio) genderRadio.checked = true;
      });
    });
  }

  // ========== EDIT STUDENT (SUBMIT) ==========
  const editForm = document.getElementById("edit-student-form");
  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const reg = document.getElementById("search-reg").value.trim();
    // In a real app we might disable editing the Reg No, or handle it carefully.
    // Here we use Reg No to identify the record to update.

    if (!reg) return alert("Register number missing!");

    const name = document.getElementById("edit-name").value.trim();
    const year = document.getElementById("edit-year").value;
    const email = document.getElementById("edit-email").value.trim();
    const gender = document.querySelector('input[name="edit-gender"]:checked')?.value;

    try {
      const res = await fetch(`${API_URL}/${reg}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, year, email, gender }),
      });

      if (res.ok) {
        alert("✅ Student updated successfully!");
        renderTable();
        updateDashboard();
      } else {
        alert("Failed to update.");
      }
    } catch (err) {
      alert("Server error.");
    }
  });

  // ========== INITIAL LOAD ==========
  renderTable();
  updateDashboard();

  // === DASHBOARD AUTO-UPDATE ===
  async function updateDashboard() {
    const students = await fetchStudents();

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

  // === PDF Download ===
  document.getElementById("download-pdf").addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const students = await fetchStudents(); // Fetch fresh data

    if (students.length === 0) {
      alert("No student data found!");
      return;
    }

    // ... (existing PDF logic) ...
    // Simplified for brevity, assume similar structure
    doc.setFontSize(18);
    doc.text("CSE Department - Student List", 14, 20);
    doc.setFontSize(12);
    doc.text(`Total Students: ${students.length}`, 14, 30);

    const headers = ["S.No", "Reg No", "Name", "Gender", "Year", "Email"];
    let y = 40;
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, 14 + i * 30, y));
    doc.setFont("helvetica", "normal");

    y += 10;
    students.forEach((s, index) => {
      doc.text(String(index + 1), 14, y);
      doc.text(s.reg || "-", 44, y);
      doc.text(s.name || "-", 74, y);
      doc.text(s.gender || "-", 104, y);
      doc.text(s.year ? `${s.year} Year` : "-", 134, y);
      doc.text(s.email || "-", 164, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save("students_list.pdf");
  });

  // === EDIT STUDENT: Search ===
  const searchButton = document.querySelector('#edit-student-form button.btn.btn-primary');
  const searchInput = document.getElementById("search-reg");

  searchButton.addEventListener("click", async function (e) {
    e.preventDefault();
    const regValue = searchInput.value.trim().toLowerCase();
    if (!regValue) return alert("Enter Reg No!");

    const students = await fetchStudents();
    const found = students.find(s => s.reg.toLowerCase() === regValue);

    if (found) {
      document.getElementById("edit-name").value = found.name;
      document.getElementById("edit-year").value = found.year;
      document.getElementById("edit-email").value = found.email;
      const genderInput = document.querySelector(`input[name="edit-gender"][value="${found.gender}"]`);
      if (genderInput) genderInput.checked = true;
      alert("Found!");
    } else {
      alert("Not Found");
      // clear fields
      document.getElementById("edit-name").value = "";
      document.getElementById("edit-year").value = "";
      document.getElementById("edit-email").value = "";
    }
  });


  // ... (previous code)

  // ========== STAFF MANAGEMENT ==========
  const STAFF_API = "/api/staff";
  const ALLOC_API = "/api/allocations";

  // ADD STAFF
  const addStaffForm = document.getElementById("add-staff-form");
  if (addStaffForm) {
    addStaffForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("staff-name").value;
      const staffId = document.getElementById("staff-id").value;
      const designation = document.getElementById("staff-designation").value;
      const email = document.getElementById("staff-email").value;
      const gender = document.querySelector('input[name="staff-gender"]:checked').value;
      const department = document.getElementById("staff-dept").value;

      try {
        const res = await fetch(STAFF_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, staffId, designation, email, gender, department })
        });
        if (res.ok) {
          alert("✅ Staff Added Successfully!");
          addStaffForm.reset();
          fetchStaff(); // Refresh list
        } else {
          const data = await res.json();
          alert("Failed to add staff: " + (data.error || "Unknown Error"));
        }
      } catch (e) { console.error(e); }
    });
  }

  // FETCH & RENDER STAFF
  async function fetchStaff() {
    try {
      const res = await fetch(STAFF_API);
      const staff = await res.json();
      const tbody = document.getElementById("staff-table-body");
      const select = document.getElementById("allocation-staff-select");

      if (tbody) tbody.innerHTML = "";
      if (select) select.innerHTML = '<option value="">Select Staff</option>';

      staff.forEach((s, i) => {
        // Populate Table
        if (tbody) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
                      <td>${i + 1}</td>
                      <td>${s.staffId}</td>
                      <td>${s.name}</td>
                      <td>${s.designation}</td>
                      <td>${s.email}</td>
                      <td><button class="btn-delete" onclick="deleteStaff('${s.staffId}')"><i class="fas fa-trash"></i></button></td>
                  `;
          tbody.appendChild(tr);
        }

        // Populate Dropdown for Allocation
        if (select) {
          const option = document.createElement("option");
          option.value = s.staffId;
          option.textContent = `${s.name} (${s.staffId})`;
          select.appendChild(option);
        }
      });
    } catch (e) { console.error(e); }
  }

  window.deleteStaff = async function (id) {
    if (!confirm("Are you sure?")) return;
    await fetch(`${STAFF_API}/${id}`, { method: "DELETE" });
    fetchStaff();
  };

  // ========== SUBJECT ALLOCATION ==========
  const btnAllocate = document.getElementById("btn-allocate");
  if (btnAllocate) {
    btnAllocate.addEventListener("click", async () => {
      const year = document.getElementById("allocation-year").value;
      const subjectName = document.getElementById("allocation-subject").value;
      const staffId = document.getElementById("allocation-staff-select").value;
      const staffName = document.getElementById("allocation-staff-select").selectedOptions[0]?.innerText.split(" (")[0];

      if (!year || !subjectName || !staffId) return alert("Please fill all fields");

      try {
        const res = await fetch(ALLOC_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, subjectName, staffId, staffName })
        });
        if (res.ok) {
          alert("✅ Subject Allocated!");
          fetchAllocations();
        }
      } catch (e) { console.error(e); }
    });
  }

  async function fetchAllocations() {
    try {
      const res = await fetch(ALLOC_API);
      const data = await res.json();
      const tbody = document.getElementById("allocation-table-body");
      if (tbody) {
        tbody.innerHTML = "";
        data.forEach(item => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
                      <td>${item.year}</td>
                      <td>${item.subjectName}</td>
                      <td>${item.staffName}</td>
                      <td><span class="badge">Allocated</span></td>
                  `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) { console.error(e); }
  }

  // ========== STUDENT SEARCH ==========
  const studentSearchInput = document.getElementById("student-search-input");
  if (studentSearchInput) {
    studentSearchInput.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#students-list tbody tr");

      rows.forEach((row) => {
        const reg = row.children[1].textContent.toLowerCase();
        const name = row.children[2].textContent.toLowerCase();

        if (reg.includes(searchTerm) || name.includes(searchTerm)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    });
  }

  // Init
  fetchStaff();
  fetchAllocations();

});
