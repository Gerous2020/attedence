document.addEventListener("DOMContentLoaded", function () {
  let chartDaily = null;
  let chartMonthly = null;
  // Set today's date default
  const today = new Date();
  const formattedDate = today.toISOString().substr(0, 10);
  document.getElementById("attendance-date").value = formattedDate;

  const students = JSON.parse(localStorage.getItem("studentsData")) || [];
  const attendanceKey = "attendanceData";
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
    });
  });

  // ====== RENDER STUDENTS FOR ALL YEARS ======
  renderYear("second-year", "2");
  renderYear("third-year", "3");
  renderYear("fourth-year", "4");

  function renderYear(sectionId, yearVal) {
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

  // ====== DONE BUTTON (PER-YEAR SAVE) ======
  document.querySelectorAll(".save-attendance-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const section = e.target.closest(".content-section");
      const sectionId = section.id;
      const yearVal =
        sectionId === "second-year" ? "2" :
        sectionId === "third-year" ? "3" :
        sectionId === "fourth-year" ? "4" : null;

      if (!yearVal) return alert("⚠️ Unable to detect year section!");

      const date = document.getElementById("attendance-date").value;
      const stored = JSON.parse(localStorage.getItem(attendanceKey)) || {};
      if (!stored[date]) stored[date] = {};

      const yearStudents = students.filter((s) => s.year === yearVal);
      yearStudents.forEach((s) => {
        if (tempAttendance[date]?.[s.reg])
          stored[date][s.reg] = tempAttendance[date][s.reg];
      });

      localStorage.setItem(attendanceKey, JSON.stringify(stored));

      disableSectionButtons(section);
      e.target.classList.add("saved");
      e.target.innerHTML = `<i class="fas fa-check-circle"></i> Saved ✓`;
      alert(`✅ ${yearVal} Year Attendance saved for ${date}`);
      updateStats();
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
  function restoreAttendance(sectionId, yearVal) {
    const date = document.getElementById("attendance-date").value;
    const attendance = JSON.parse(localStorage.getItem(attendanceKey)) || {};
    const todayData = attendance[date] || {};
  
    const tbody = document.querySelector(`#${sectionId} tbody`);
    const rows = tbody.querySelectorAll("tr");
  
    let total = 0, marked = 0;
  
    rows.forEach((row) => {
      const reg = row.children[1]?.textContent;
      const status = todayData[reg];
      const badge = row.querySelector(".status-badge");
  
      if (status) {
        badge.textContent = status;
        badge.className = `status-badge status-${status.toLowerCase()}`;
        marked++;
      } else {
        badge.textContent = "Not Marked";
        badge.className = "status-badge";
      }
      total++;
    });
  
    const section = document.getElementById(sectionId);
    const doneBtn = section.querySelector(".save-attendance-btn");
  
    // ✅ If everyone is marked → show saved & lock
    if (total > 0 && total === marked) {
      disableSectionButtons(section);
      if (doneBtn) {
        doneBtn.classList.add("saved");
        doneBtn.innerHTML = `<i class="fas fa-check-circle"></i> Saved ✓`;
      }
    } 
    // 🔁 Else reset button to default state
    else {
      section.querySelectorAll(".btn-present, .btn-absent").forEach((b) => {
        b.disabled = false;
        b.style.opacity = "1";
        b.style.cursor = "pointer";
      });
      if (doneBtn) {
        doneBtn.classList.remove("saved");
        doneBtn.innerHTML = `<i class="fas fa-check-circle"></i> Done for Today`;
      }
    }
  }
  

  // ====== UPDATE STATS ======
  function updateStats() {
    const date = document.getElementById("attendance-date").value;
    const attendance = JSON.parse(localStorage.getItem(attendanceKey)) || {};
    const todayData = attendance[date] || {};
    const yearData = { "2": { total: 0, present: 0 }, "3": { total: 0, present: 0 }, "4": { total: 0, present: 0 } };

    students.forEach((s) => {
      const y = s.year;
      if (!yearData[y]) return;
      yearData[y].total++;
      if (todayData[s.reg] === "Present") yearData[y].present++;
    });

    for (const [y, data] of Object.entries(yearData)) {
      const percent = data.total ? Math.round((data.present / data.total) * 100) : 0;
      const yearName = y === "2" ? "second" : y === "3" ? "third" : "fourth";
      const card = document.querySelector(`[data-year="${yearName}"] h3`);
      if (card) card.textContent = percent + "%";
    }
  }

  // ====== DATE CHANGE RELOAD ======
  document.getElementById("attendance-date").addEventListener("change", () => {
    renderYear("second-year", "2");
    renderYear("third-year", "3");
    renderYear("fourth-year", "4");
    updateStats();
  });

  updateStats();
  // ====== IMPROVED ATTENDANCE STATS ======
  // ====== STATS TAB SWITCH ======
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove active from all buttons & contents
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((t) => t.classList.remove("active"));

      // Activate clicked button
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab") + "-stats";
      const targetTab = document.getElementById(targetId);

      // Activate the corresponding tab content
      if (targetTab) {
        targetTab.classList.add("active");
      }
    });
  });
  
  // ====== IMPROVED ATTENDANCE STATS ======

  
  function updateStats() {
    const attendance = JSON.parse(localStorage.getItem("attendanceData")) || {};
    const students = JSON.parse(localStorage.getItem("studentsData")) || [];
  
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
    const monthMap = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    // Create separate objects for each month
    const monthlyData = {
      "2": Array.from({ length: 12 }, () => ({ present: 0, total: 0 })),
      "3": Array.from({ length: 12 }, () => ({ present: 0, total: 0 })),
      "4": Array.from({ length: 12 }, () => ({ present: 0, total: 0 })),
    };
  
    // Loop through all saved attendance records
    for (const date in attendance) {
      const month = new Date(date).getMonth(); // 0 - 11
      for (const reg in attendance[date]) {
        const s = students.find((x) => x.reg === reg);
        if (s && monthlyData[s.year]) {
          const entry = monthlyData[s.year][month];
          entry.total++;
          if (attendance[date][reg] === "Present") entry.present++;
        }
      }
    }
  
    // Convert data to percentages
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
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: true, text: "Average Monthly Attendance (%)" },
        },
        scales: {
          y: { beginAtZero: true, max: 100, title: { display: true, text: "Attendance %" } },
        },
      },
    });
  }
 
  // ===== GENERATE REPORT FOR SELECTED YEAR =====
  document.getElementById("generate-report").addEventListener("click", generateMonthlyReport);
  
  function generateMonthlyReport() {
    const { jsPDF } = window.jspdf;
    const selectedYear = document.getElementById("report-year").value;
  
    if (!selectedYear) {
      alert("⚠️ Please select a year before generating the report!");
      return;
    }
  
    const attendance = JSON.parse(localStorage.getItem("attendanceData")) || {};
    const students = JSON.parse(localStorage.getItem("studentsData")) || [];
  
    const currentMonth = new Date().getMonth();
    const monthName = new Date().toLocaleString("default", { month: "long" });
    const currentYear = new Date().getFullYear();
  
    // Filter this month’s attendance
    const monthlyAttendance = Object.entries(attendance).filter(([date]) => {
      const d = new Date(date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  
    if (monthlyAttendance.length === 0) {
      alert("⚠️ No attendance data found for this month!");
      return;
    }
  
    const yearStudents = students.filter((s) => s.year === selectedYear);
    if (yearStudents.length === 0) {
      alert(`⚠️ No students found for ${selectedYear} Year!`);
      return;
    }
  
    // Build table data
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
  
    // Create PDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Attendance Report - ${selectedYear} Year`, 14, 20);
    doc.setFontSize(12);
    doc.text(`${monthName} ${currentYear}`, 14, 30);
  
    doc.autoTable({
      startY: 40,
      head: [["S.No", "Register No", "Name", "Total Days", "Present", "Absent", "Attendance %"]],
      body: data,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], halign: "center" },
      styles: { halign: "center", fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 248, 255] },
    });
  
    const fileName = `Attendance_Report_${selectedYear}Year_${monthName}_${currentYear}.pdf`;
    doc.save(fileName);
  
    alert(`✅ ${selectedYear} Year Report downloaded successfully!`);
  }
  
  // ===== REOPEN ATTENDANCE FOR ENTIRE DAY =====
document.getElementById("reopen-day").addEventListener("click", () => {
  const date = document.getElementById("attendance-date").value;

  if (!date) {
    alert("⚠️ Please select a date first!");
    return;
  }

  const confirmReopen = confirm(`🔓 Do you want to reopen attendance for ${date}?`);
  if (!confirmReopen) return;

  // Unlock all years for this day
  document.querySelectorAll(".content-section").forEach((section) => {
    if (["second-year", "third-year", "fourth-year"].includes(section.id)) {
      section.querySelectorAll(".btn-present, .btn-absent").forEach((b) => {
        b.disabled = false;
        b.style.opacity = "1";
        b.style.cursor = "pointer";
      });

      const doneBtn = section.querySelector(".save-attendance-btn");
      if (doneBtn) {
        doneBtn.classList.remove("saved");
        doneBtn.innerHTML = `<i class="fas fa-check-circle"></i> Done for Today`;
      }
    }
  });

  // Optional: log reopened dates (for audit)
  let reopenedDays = JSON.parse(localStorage.getItem("reopenedDays")) || [];
  if (!reopenedDays.includes(date)) {
    reopenedDays.push(date);
    localStorage.setItem("reopenedDays", JSON.stringify(reopenedDays));
  }

  alert(`✅ Attendance for ${date} reopened successfully! You can re-edit now.`);
});
// Remove from reopened list once re-saved
let reopenedDays = JSON.parse(localStorage.getItem("reopenedDays")) || [];
reopenedDays = reopenedDays.filter((d) => d !== date);
localStorage.setItem("reopenedDays", JSON.stringify(reopenedDays));


});
