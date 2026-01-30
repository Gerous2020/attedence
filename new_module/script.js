// Global State
let staffData = [];
let subjectData = { y2: [], y3: [], y4: [] };
// Store specific allocations for easy lookup during generation/editing
let allocations = { y2: [], y3: [], y4: [] };

// Schedule State: { y2: [ { day: 'Mon', periods: [ {sub, staff, ...} ] } ... ] }
let currentSchedule = {
    y2: createEmptySchedule(),
    y3: createEmptySchedule(),
    y4: createEmptySchedule()
};

function createEmptySchedule() {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map(day => ({
        day: day,
        periods: Array(8).fill(null) // null means empty/library
    }));
}

async function init() {
    await fetchData();
    setupListeners();
    await loadSavedTimetables();
}

function setupListeners() {
    document.getElementById('refresh-alloc-btn')?.addEventListener('click', loadAllocationUI);
    document.getElementById('generate-btn')?.addEventListener('click', generateTimetable);
    document.getElementById('save-btn')?.addEventListener('click', saveTimetables);
    document.getElementById('print-btn')?.addEventListener('click', () => window.print());
}

// === DATA FETCHING ===
async function fetchData() {
    try {
        // 1. Fetch Staff
        const resStaff = await fetch('/api/staff');
        staffData = await resStaff.json();
        renderStaffInputs();

        // 2. Fetch Allocations (Subject Definitions)
        const resAlloc = await fetch('/api/allocations');
        const allocs = await resAlloc.json();

        // Reset subjectData & allocations
        subjectData = { y2: [], y3: [], y4: [] };
        allocs.forEach(a => {
            const yearKey = `y${a.year}`;
            if (subjectData[yearKey]) {
                const subObj = {
                    name: a.subjectName,
                    hours: 4, // Default, can be overridden if we store this in DB
                    staffId: a.staff?.staffId || null,
                    staffName: a.staffName
                };
                subjectData[yearKey].push(subObj);
            }
        });
        renderSubjectInputs();

        // Auto-load allocation UI
        loadAllocationUI();

    } catch (e) {
        console.error("Error fetching data:", e);
    }
}

async function loadSavedTimetables() {
    const years = ['2', '3', '4'];
    for (const year of years) {
        try {
            const res = await fetch(`/api/timetable/${year}`);
            const data = await res.json();
            if (data && data.schedule && data.schedule.length > 0) {
                currentSchedule[`y${year}`] = data.schedule;
            }
        } catch (e) {
            console.error(`Error loading timetable for Y${year}`, e);
        }
    }
    renderAllTimetables();
}

// === SAVING ===
async function saveTimetables() {
    const years = ['2', '3', '4'];
    let successCount = 0;

    for (const year of years) {
        const schedule = currentSchedule[`y${year}`];
        try {
            const res = await fetch('/api/timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, schedule })
            });
            if (res.ok) successCount++;
        } catch (e) {
            console.error(`Failed to save Y${year}`, e);
        }
    }

    if (successCount === 3) alert("Timetables saved successfully!");
    else alert(`Saved ${successCount}/3 timetables. Check console for errors.`);
}

// === UI RENDERING (Inputs) ===
function renderStaffInputs() {
    const container = document.getElementById('staff-inputs');
    if (!container) return;
    container.innerHTML = staffData.map((s, i) => `
        <div class="staff-row">
            <span>${i + 1}. ${s.name}</span>
            <label style="margin-left:auto; display:flex; align-items:center; cursor:pointer;">
                <input type="checkbox" ${s.isShared ? 'checked' : ''} 
                    onchange="updateStaffShared(${i}, this.checked)"> Shared
            </label>
        </div>
    `).join('');
}

window.updateStaffShared = function (index, isShared) {
    staffData[index].isShared = isShared;
    renderStaffInputs(); // Re-render to update UI state if needed, or just let it be
};

function renderSubjectInputs() {
    ['2', '3', '4'].forEach(y => {
        const div = document.getElementById(`y${y}-subjects`);
        if (!div) return;
        div.innerHTML = subjectData[`y${y}`].map((s, i) => `
            <div class="input-row">
                <label>${s.name}</label>
                <input type="number" style="width:50px" value="${s.hours}" 
                    onchange="updateSubjectHours('${y}', ${i}, this.value)"> hrs
            </div>
        `).join('');
    });
}

window.updateSubjectHours = function (year, index, val) {
    subjectData[`y${year}`][index].hours = parseInt(val) || 0;
};

// Decoupled Data Loading from UI Rendering
function loadAllocationUI() {
    // 1. Populate Allocations Data (Always Run)
    ['2', '3', '4'].forEach(year => {
        if (subjectData[`y${year}`]) {
            allocations[`y${year}`] = subjectData[`y${year}`].map(s => ({
                sub: s.name,
                staffName: s.staffName || "TBD", // From DB
                hours: s.hours
            }));
        } else {
            allocations[`y${year}`] = [];
        }
    });

    // 2. Render UI (Only if container exists)
    const container = document.getElementById('allocation-container');
    if (!container) return;

    container.innerHTML = "<p>Allocations loaded from Admin Dashboard. Ready to Generate.</p>";
}

// === GENERATION LOGIC ===
function generateTimetable() {
    // 1. Reset Schedules
    currentSchedule = {
        y2: createEmptySchedule(),
        y3: createEmptySchedule(),
        y4: createEmptySchedule()
    };

    // 2. Prepare Staff Availability Tracker (Day -> Period -> Set of Staff Names)
    const staffAvailability = {}; // key: "Day-Period", value: Set(staffNames)
    const markStaffBusy = (dayIdx, periodIdx, staffName) => {
        const key = `${dayIdx}-${periodIdx}`;
        if (!staffAvailability[key]) staffAvailability[key] = new Set();
        staffAvailability[key].add(staffName);
    };
    const isStaffBusy = (dayIdx, periodIdx, staffName) => {
        if (!staffName || staffName === "TBD") return false;
        const key = `${dayIdx}-${periodIdx}`;
        return staffAvailability[key] && staffAvailability[key].has(staffName);
    };

    // 3. Helper to determine Lab vs Theory
    // STRICTER CHECK: Only if name explicitly says "lab" (case insensitive)
    const isLab = (sub) => sub.sub.toLowerCase().includes('lab');

    // 4. Generate for each year
    ['y4', 'y3', 'y2'].forEach(yearKey => {
        const subjects = JSON.parse(JSON.stringify(allocations[yearKey])); // Deep copy

        // A. Place Labs First (Continuous Blocks)
        subjects.filter(s => isLab(s)).forEach(sub => {
            placeLab(sub, currentSchedule[yearKey], isStaffBusy, markStaffBusy);
        });

        // B. Place Theory (Single Slots)
        subjects.filter(s => !isLab(s)).forEach(sub => {
            placeTheory(sub, currentSchedule[yearKey], isStaffBusy, markStaffBusy);
        });

        // C. Fill Empty
        fillEmptySlots(currentSchedule[yearKey]);
    });

    renderAllTimetables();
}

function placeLab(sub, schedule, isStaffBusy, markStaffBusy) {
    const needed = sub.hours;
    let placed = false;
    // ... (rest of logic conceptually similar, keeping existing block allocation logic)
    const dayIndices = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);

    for (let d of dayIndices) {
        if (placed || sub.hours <= 0) break;

        // Labs usually need at least 3 hours. If less, maybe treat as block anyway if tagged Lab.
        const possibleStarts = [];
        if (needed <= 4) {
            if (needed <= 4) possibleStarts.push(0); // Morning
            if (needed <= 4) possibleStarts.push(4); // Afternoon
        }
        possibleStarts.sort(() => Math.random() - 0.5);

        for (let start of possibleStarts) {
            let canFit = true;
            for (let i = 0; i < needed; i++) {
                const pIdx = start + i;
                if (schedule[d].periods[pIdx] !== null) { canFit = false; break; }
                if (isStaffBusy(d, pIdx, sub.staffName)) { canFit = false; break; }
            }

            if (canFit) {
                for (let i = 0; i < needed; i++) {
                    const pIdx = start + i;
                    schedule[d].periods[pIdx] = { ...sub, type: 'Lab' };
                    markStaffBusy(d, pIdx, sub.staffName);
                }
                sub.hours = 0;
                placed = true;
                break;
            }
        }
    }
}

function placeTheory(sub, schedule, isStaffBusy, markStaffBusy) {
    let needed = sub.hours;
    let attempts = 0;

    while (needed > 0 && attempts < 200) {
        attempts++;
        const d = Math.floor(Math.random() * 6);
        const p = Math.floor(Math.random() * 8);

        if (schedule[d].periods[p] !== null) continue;
        if (isStaffBusy(d, p, sub.staffName)) continue;

        // Max 2 hours per day
        const periodsToday = schedule[d].periods.filter(s => s && s.sub === sub.sub).length;
        if (periodsToday >= 2) continue;

        // NO CONSECUTIVE SLOT CHECK
        // Check previous period (p-1)
        if (p > 0 && schedule[d].periods[p - 1] && schedule[d].periods[p - 1].sub === sub.sub) continue;
        // Check next period (p+1) - though usually empty, good for robustness
        if (p < 7 && schedule[d].periods[p + 1] && schedule[d].periods[p + 1].sub === sub.sub) continue;

        schedule[d].periods[p] = { ...sub, type: 'Theory' };
        markStaffBusy(d, p, sub.staffName);
        needed--;
    }
}

function fillEmptySlots(schedule) {
    schedule.forEach(day => {
        for (let i = 0; i < 8; i++) {
            if (day.periods[i] === null) {
                day.periods[i] = { sub: "Library", staffName: "-", type: 'Empty' };
            }
        }
    });
}

// === RENDERING & EDITING ===
function renderAllTimetables() {
    renderTable('table-y2', currentSchedule.y2, 'y2');
    renderTable('table-y3', currentSchedule.y3, 'y3');
    renderTable('table-y4', currentSchedule.y4, 'y4');
}

function renderTable(tableId, scheduleData, yearKey) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    tbody.innerHTML = '';

    scheduleData.forEach((dayData, dIdx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><b>${dayData.day}</b></td>`;

        dayData.periods.forEach((slot, pIdx) => {
            const td = document.createElement('td');
            td.className = slot.sub === 'Library' ? 'slot-library' : 'slot-assigned';
            td.innerHTML = `
                <div class="subject">${slot.sub}</div>
                <div class="staff">${slot.staffName}</div>
            `;
            td.onclick = () => enableEdit(td, yearKey, dIdx, pIdx);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function enableEdit(td, yearKey, dIdx, pIdx) {
    const currentSlot = currentSchedule[yearKey][dIdx].periods[pIdx];

    // Create Select for Subject/Staff
    const select = document.createElement('select');
    select.className = "edit-select";

    // Options: Library + All Allocations for this year
    let options = `<option value="Library|-">Library</option>`;
    allocations[yearKey].forEach(a => {
        const val = `${a.sub}|${a.staffName}`;
        const selected = (a.sub === currentSlot.sub) ? 'selected' : '';
        options += `<option value="${val}" ${selected}>${a.sub} (${a.staffName})</option>`;
    });

    select.innerHTML = options;

    // Shared Commit Logic
    const commitChange = () => {
        const [newSub, newStaff] = select.value.split('|');
        currentSchedule[yearKey][dIdx].periods[pIdx] = {
            sub: newSub,
            staffName: newStaff,
            type: newSub === 'Library' ? 'Empty' : 'Manual'
        };
        renderTable(`table-${yearKey}`, currentSchedule[yearKey], yearKey);
    };

    // Save on Change (User selects option)
    select.addEventListener('change', () => {
        commitChange();
    });

    // Save on Blur (User clicks away) - captures current selection
    select.addEventListener('blur', () => {
        commitChange();
    });

    td.innerHTML = '';
    td.appendChild(select);
    select.focus();
}

// Start
init();
