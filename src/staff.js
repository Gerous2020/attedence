document.addEventListener("DOMContentLoaded", function () {
  const STUDENTS_API = "http://localhost:3000/api/students";
  const ATTENDANCE_API = "http://localhost:3000/api/attendance";

  let chartDaily = null;
  let chartMonthly = null;

  // Set today's date default
  // Set today's date default (Local Time)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  document.getElementById("attendance-date").value = formattedDate;

  let tempAttendance = {}; // temporary marks before "Done"

  // ====== MENU SWITCH ======
  const menuItems = document.querySelectorAll(".menu-item");
  const contentSections = document.querySelectorAll(".content-section");

  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");
      menuItems.forEach((mi) => mi.classList.remove("active"));
      this.classList.add("active");
      contentSections.forEach((sec) => sec.classList.remove("active"));
      document.getElementById(target).classList.add("active");

      if (target === "attendance-stats") {
        updateStats(); // Force redraw when tab becomes visible
      }
    });
  });

  // ====== FETCH HELPERS ======
  async function getStudents() {
    try {
      const res = await fetch(STUDENTS_API);
      return await res.json();
    } catch (e) { console.error(e); return []; }
  }

  async function getAttendance() {
    try {
      const res = await fetch(ATTENDANCE_API);
      return await res.json(); // { date: { reg: status } }
    } catch (e) { console.error(e); return {}; }
  }

  // ====== RENDER STUDENTS FOR ALL YEARS ======
  async function init() {
    await renderYear("second-year", "2");
    await renderYear("third-year", "3");
    await renderYear("fourth-year", "4");
    updateStats();
  }

  init();

  async function renderYear(sectionId, yearVal) {
    const students = await getStudents();
    const tbody = document.querySelector(`#${sectionId} tbody`);
    tbody.innerHTML = "";

    const yearStudents = students.filter((s) => s.year === yearVal);
    if (yearStudents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999;">No students found</td></tr>`;
      return;
    }

    yearStudents.forEach((s, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${s.reg}</td>
        <td>${s.name}</td>
        <td class="attendance-actions">
          <button class="btn-present" data-reg="${s.reg}" data-year="${yearVal}">
            <i class="fas fa-check"></i> Present
          </button>
          <button class="btn-absent" data-reg="${s.reg}" data-year="${yearVal}">
            <i class="fas fa-times"></i> Absent
          </button>
        </td>
        <td><span class="status-badge">Not Marked</span></td>
      `;
      tbody.appendChild(tr);
    });

    attachAttendanceEvents(tbody);
    restoreAttendance(sectionId, yearVal);
  }

  // ====== MARK ATTENDANCE TEMPORARILY ======
  function attachAttendanceEvents(tbody) {
    tbody.querySelectorAll(".btn-present").forEach((btn) => {
      btn.addEventListener("click", () =>
        markAttendance(btn.dataset.reg, "Present", btn.dataset.year)
      );
    });
    tbody.querySelectorAll(".btn-absent").forEach((btn) => {
      btn.addEventListener("click", () =>
        markAttendance(btn.dataset.reg, "Absent", btn.dataset.year)
      );
    });
  }

  function markAttendance(regNo, status, year) {
    const date = document.getElementById("attendance-date").value;
    if (!tempAttendance[date]) tempAttendance[date] = {};
    tempAttendance[date][regNo] = status;

    // Visual update for clicked row
    const row = document.querySelector(`button[data-reg="${regNo}"][data-year="${year}"]`).closest("tr");
    const badge = row.querySelector(".status-badge");
    badge.textContent = status;
    badge.className = `status-badge status-${status.toLowerCase()}`;
  }

  // ====== SAVE ATTENDANCE (POST TO API) ======
  document.querySelectorAll(".save-attendance-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const section = e.target.closest(".content-section");
      const sectionId = section.id;
      const yearVal =
        sectionId === "second-year" ? "2" :
          sectionId === "third-year" ? "3" :
            sectionId === "fourth-year" ? "4" : null;

      if (!yearVal) return alert("⚠️ Unable to detect year section!");

      const date = document.getElementById("attendance-date").value;

      // We need to gather all marked data for this year/date
      // In tempAttendance we have { date: { reg: status } }
      // But we also need to respect previously saved data if we're just adding updates
      // The API expects: { date, data: [ { reg, status, year } ] }

      // Let's get "current view" of attendance for this year
      // A better way is to iterate the rows to see what is FINAL on screen
      const tbody = document.querySelector(`#${sectionId} tbody`);
      const rows = tbody.querySelectorAll("tr");
      const payloadData = [];

      rows.forEach(row => {
        const reg = row.children[1]?.textContent;
        const badge = row.querySelector(".status-badge");
        const status = badge.textContent;

        if (["Present", "Absent"].includes(status)) {
          payloadData.push({ reg, status, year: yearVal });
        }
      });

      if (payloadData.length === 0) {
        alert("No attendance marked to save.");
        return;
      }

      try {
        const res = await fetch(ATTENDANCE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, data: payloadData })
        });

        if (res.ok) {
          lockSection(section);
          e.target.classList.add("saved");
          e.target.innerHTML = `<i class="fas fa-check-circle"></i> Saved ✓`;
          alert(`✅ ${yearVal} Year Attendance saved for ${date}`);
          updateStats();
        } else {
          alert("Failed to save data");
        }
      } catch (err) { alert("Server error"); }
    });
  });

  function disableSectionButtons(section) {
    section.querySelectorAll(".btn-present, .btn-absent").forEach((b) => {
      b.disabled = true;
      b.style.opacity = "0.5";
      b.style.cursor = "not-allowed";
    });
  }

  // ====== RESTORE SAVED ATTENDANCE ======
  async function restoreAttendance(sectionId, yearVal) {
    const date = document.getElementById("attendance-date").value;
    const attendance = await getAttendance(); // Fetches full table
    const todayData = attendance[date] || {}; // { reg: status }

    const tbody = document.querySelector(`#${sectionId} tbody`);
    const rows = tbody.querySelectorAll("tr");

    // Check if ANY mark exists for this year, if so, we consider it "Locked"
    // We check if at least one student in this year has a status for this date
    let isLocked = false;
    // Iterate rows to see if any displayed student has data
    for (const row of rows) {
      const reg = row.children[1]?.textContent;
      if (todayData[reg]) {
        console.log(`Found data for ${reg}: ${todayData[reg]}`);
        isLocked = true;
        break;
      }
    }

    // DEBUG: Remove after fixing
    // console.log(`Section: ${sectionId}, Date: ${date}, Locked: ${isLocked}, DataKeys: ${Object.keys(todayData).length}`);


    const section = document.getElementById(sectionId);
    const doneBtn = section.querySelector(".save-attendance-btn");

    if (isLocked) {
      // LOCK STATE: Hide buttons, Show Saved
      lockSection(section);
      if (doneBtn) {
        doneBtn.classList.add("saved");
        doneBtn.innerHTML = `<i class="fas fa-check-circle"></i> Saved ✓`;
      }
    } else {
      // UNLOCKED STATE: Show buttons
      unlockSection(section);
      if (doneBtn) {
        doneBtn.classList.remove("saved");
        doneBtn.innerHTML = `<i class="fas fa-check-circle"></i> Done for Today`;
      }
    }

    // Populate Badges
    rows.forEach((row) => {
      const reg = row.children[1]?.textContent;
      const status = todayData[reg];
      const badge = row.querySelector(".status-badge");

      if (status) {
        badge.textContent = status;
        badge.className = `status-badge status-${status.toLowerCase()}`;
      } else {
        badge.textContent = "Not Marked";
        badge.className = "status-badge";
      }
    });
  }

  function lockSection(section) {
    // Hide buttons, but keep the cell to preserve alignment
    section.querySelectorAll(".attendance-actions button").forEach(btn => btn.style.display = "none");
  }

  function unlockSection(section) {
    // Show buttons
    section.querySelectorAll(".attendance-actions button").forEach(btn => btn.style.display = "inline-block");
  }

  // ====== UPDATE STATS (Charts) ======
  // Only changed logic: fetch from API instead of localStorage
  async function updateStats() {
    const attendance = await getAttendance(); // API
    const students = await getStudents(); // API

    // ---- DAILY STATS (today only) ----
    const date = document.getElementById("attendance-date").value;
    const todayData = attendance[date] || {};
    const yearData = { "2": { total: 0, present: 0 }, "3": { total: 0, present: 0 }, "4": { total: 0, present: 0 } };

    students.forEach((s) => {
      if (yearData[s.year]) {
        yearData[s.year].total++;
        if (todayData[s.reg] === "Present") yearData[s.year].present++;
      }
    });

    // Update daily cards
    for (const [y, data] of Object.entries(yearData)) {
      const percent = data.total ? Math.round((data.present / data.total) * 100) : 0;
      const yearName = y === "2" ? "second" : y === "3" ? "third" : "fourth";
      const card = document.querySelector(`[data-year="${yearName}"] h3`);
      if (card) card.textContent = percent + "%";
    }

    drawDailyChart(yearData);
    // ---- MONTHLY STATS ----
    drawMonthlyChart(attendance, students);
  }

  // ... drawDailyChart and drawMonthlyChart same as before ...
  function drawDailyChart(yearData) {
    const ctx = document.getElementById("dailyChart");
    if (chartDaily) chartDaily.destroy();

    chartDaily = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["2nd Year", "3rd Year", "4th Year"],
        datasets: [{
          label: "Today's Attendance (%)",
          data: [
            yearData["2"].total ? (yearData["2"].present / yearData["2"].total) * 100 : 0,
            yearData["3"].total ? (yearData["3"].present / yearData["3"].total) * 100 : 0,
            yearData["4"].total ? (yearData["4"].present / yearData["4"].total) * 100 : 0
          ],
          backgroundColor: ["#3b82f6", "#22c55e", "#f97316"],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, max: 100, title: { display: true, text: "Attendance %" } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function drawMonthlyChart(attendance, students) {
    const monthMap = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = {
      "2": Array.from({ length: 12 }, () => ({ present: 0, total: 0 })),
      "3": Array.from({ length: 12 }, () => ({ present: 0, total: 0 })),
      "4": Array.from({ length: 12 }, () => ({ present: 0, total: 0 })),
    };

    // Loop through ALL attendance (from API state)
    for (const date in attendance) {
      const month = new Date(date).getMonth();
      for (const reg in attendance[date]) {
        const status = attendance[date][reg];
        // find student
        const s = students.find((x) => x.reg === reg);
        if (s && monthlyData[s.year]) {
          const entry = monthlyData[s.year][month];
          entry.total++;
          if (status === "Present") entry.present++;
        }
      }
    }

    const labels = monthMap;
    const year2 = monthlyData["2"].map((m) => (m.total ? Math.round((m.present / m.total) * 100) : 0));
    const year3 = monthlyData["3"].map((m) => (m.total ? Math.round((m.present / m.total) * 100) : 0));
    const year4 = monthlyData["4"].map((m) => (m.total ? Math.round((m.present / m.total) * 100) : 0));

    const ctx = document.getElementById("monthlyChart");
    if (chartMonthly) chartMonthly.destroy();

    chartMonthly = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "2nd Year", data: year2, borderColor: "#3b82f6", backgroundColor: "#3b82f680", fill: false, tension: 0.3 },
          { label: "3rd Year", data: year3, borderColor: "#22c55e", backgroundColor: "#22c55e80", fill: false, tension: 0.3 },
          { label: "4th Year", data: year4, borderColor: "#f97316", backgroundColor: "#f9731680", fill: false, tension: 0.3 },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, max: 100 } } },
    });
  }

  // ====== DATE CHANGE RELOAD ======
  document.getElementById("attendance-date").addEventListener("change", async () => {
    await renderYear("second-year", "2");
    await renderYear("third-year", "3");
    await renderYear("fourth-year", "4");
    updateStats();
  });

  // ====== TABS ======
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-tab") + "-stats");
      if (target) target.classList.add("active");
    });
  });

  // PDF REPORT
  document.getElementById("generate-report").addEventListener("click", generateMonthlyReport);
  async function generateMonthlyReport() {
    const { jsPDF } = window.jspdf;
    const selectedYear = document.getElementById("report-year").value;
    if (!selectedYear) return alert("Select Year!");

    // FETCH DATA FRESH
    const attendance = await getAttendance();
    const students = await getStudents();

    const currentMonth = new Date().getMonth();
    const monthName = new Date().toLocaleString("default", { month: "long" });
    const currentYear = new Date().getFullYear();

    const monthlyAttendance = Object.entries(attendance).filter(([date]) => {
      const d = new Date(date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (monthlyAttendance.length === 0) return alert("No attendance found for this month!");
    const yearStudents = students.filter((s) => s.year === selectedYear);
    if (yearStudents.length === 0) return alert("No students found!");

    const data = yearStudents.map((s, i) => {
      let total = 0, present = 0;
      monthlyAttendance.forEach(([date, dayData]) => {
        if (dayData[s.reg]) {
          total++;
          if (dayData[s.reg] === "Present") present++;
        }
      });
      const percent = total ? ((present / total) * 100).toFixed(2) + "%" : "0%";
      return [i + 1, s.reg, s.name, total, present, total - present, percent];
    });

    const doc = new jsPDF();
    doc.text(`Attendance Report - ${selectedYear} Year (${monthName})`, 14, 20);
    doc.autoTable({
      startY: 40,
      head: [["S.No", "Reg No", "Name", "Total", "P", "A", "%"]],
      body: data,
    });
    doc.save(`Attendance_${selectedYear}_${monthName}.pdf`);
  }

  // REOPEN DAY
  document.getElementById("reopen-day").addEventListener("click", () => {
    const date = document.getElementById("attendance-date").value;
    if (!confirm(`Do you want to reopen attendance for ${date}? This will allow you to edit marks.`)) return;

    // Unlock all sections
    document.querySelectorAll(".content-section").forEach(section => {
      if (section.id.includes("-year")) {
        unlockSection(section);
        const doneBtn = section.querySelector(".save-attendance-btn");
        if (doneBtn) {
          doneBtn.classList.remove("saved");
          doneBtn.innerHTML = `<i class="fas fa-check-circle"></i> Update Attendance`;
        }
      }
    });
  });

});
