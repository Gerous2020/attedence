// Initial Data
let staffData = [
    { name: "Staff A", isShared: true },
    { name: "Staff B", isShared: true },
    { name: "Staff C", isShared: true },
    { name: "Staff D", isShared: true },
    { name: "Staff E", isShared: false },
    { name: "Staff F", isShared: false },
    { name: "Staff G", isShared: false },
    { name: "Staff H", isShared: false }
];

// Stores subject names as strings for each year
let subjectData = {
    y2: ["Maths II", "Data Structures", "Digital Logic", "COA", "EVS"],
    y3: ["Networks", "Web Tech", "Automata", "Software Eng", "Cloud Comp", "AI/ML"],
    y4: ["Project Mgmt", "Cyber Security", "Big Data"]
};

function init() {
    renderStaffInputs();
    renderSubjectInputs();

    document.getElementById('add-staff-btn').addEventListener('click', () => addStaff());
    document.getElementById('refresh-alloc-btn').addEventListener('click', loadAllocationUI);
    document.getElementById('generate-btn').addEventListener('click', generateTimetable);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
}

// === STAFF MGMT ===
function renderStaffInputs() {
    const container = document.getElementById('staff-inputs');
    container.innerHTML = staffData.map((s, i) => `
        <div class="staff-row">
            <span style="font-weight:bold;">${i + 1}.</span>
            <input type="text" onchange="updateStaffName(${i}, this.value)" value="${s.name}">
            <label>
                <input type="checkbox" onchange="updateStaffShared(${i}, this.checked)" ${s.isShared ? 'checked' : ''}> Shared
            </label>
            <button class="btn-icon-remove" onclick="removeStaff(${i})" title="Remove Staff"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

function updateStaffName(i, val) { staffData[i].name = val; }
function updateStaffShared(i, val) { staffData[i].isShared = val; }

function addStaff() {
    staffData.push({ name: `Staff ${staffData.length + 1}`, isShared: false });
    renderStaffInputs();
}

function removeStaff(index) {
    if (staffData.length <= 1) return alert("At least one staff required.");
    staffData.splice(index, 1);
    renderStaffInputs();
}

// === SUBJECT MGMT ===
function renderSubjectInputs() {
    const renderYear = (year, arr) => {
        const div = document.getElementById(`y${year}-subjects`);
        div.innerHTML = arr.map((sub, i) => `
            <div class="input-row">
                <label>${i + 1}</label>
                <input type="text" onchange="updateSubjectName('${year}', ${i}, this.value)" value="${sub}">
                <button class="btn-icon-remove" onclick="removeSubject('${year}', ${i})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    };

    renderYear('2', subjectData.y2);
    renderYear('3', subjectData.y3);
    renderYear('4', subjectData.y4);
}

function updateSubjectName(year, index, val) {
    subjectData[`y${year}`][index] = val;
}

window.addSubject = function (year) {
    subjectData[`y${year}`].push(`New Subject`);
    renderSubjectInputs();
};

window.removeSubject = function (year, index) {
    if (subjectData[`y${year}`].length <= 1) return alert("At least one subject required.");
    subjectData[`y${year}`].splice(index, 1);
    renderSubjectInputs();
};


// === ALLOCATION UI ===
function loadAllocationUI() {
    const container = document.getElementById('allocation-container');
    container.innerHTML = '';

    // Helper to create select box
    const createSelect = (year, i, subName) => {
        let options = `<option value="">-- Select Staff --</option>`;
        staffData.forEach((s, idx) => {
            options += `<option value="${idx}">${s.name} (${s.isShared ? 'Shared' : 'Unique'})</option>`;
        });
        return `
            <div class="alloc-item">
                <div style="display:flex; justify-content:space-between;">
                    <h5>[Y${year}] ${subName}</h5>
                </div>
                <select id="alloc-y${year}-${i}">
                    ${options}
                </select>
            </div>
        `;
    };

    // Render Dynamic Subjects
    subjectData.y2.forEach((sub, i) => container.innerHTML += createSelect(2, i, sub));
    subjectData.y3.forEach((sub, i) => container.innerHTML += createSelect(3, i, sub));
    subjectData.y4.forEach((sub, i) => container.innerHTML += createSelect(4, i, sub));
}

// === GENERATION ===
function generateTimetable() {
    const mappings = { y2: [], y3: [], y4: [] };

    // Helper to get mapping
    const getMap = (year) => {
        subjectData[`y${year}`].forEach((subName, i) => {
            const el = document.getElementById(`alloc-y${year}-${i}`);
            if (!el) return;
            const staffIdx = el.value;

            if (staffIdx === "") {
                // Warning or Skip? Let's skip and fill space
                mappings[`y${year}`].push({ sub: subName, staffIdx: -1, staffName: "TBD" });
            } else {
                mappings[`y${year}`].push({
                    sub: subName,
                    staffIdx: parseInt(staffIdx),
                    staffName: staffData[staffIdx].name
                });
            }
        });
    };

    getMap(2);
    getMap(3);
    getMap(4);

    // 2. Validate Unique Constraints
    const uniqueUsage = {}; // staffIdx -> count
    const allMappings = [...mappings.y2, ...mappings.y3, ...mappings.y4];

    // We need staffList to check isShared. But wait, mapped Objects store staffIdx.
    // We can reconstruct staffList or access global staffData.

    // Global staffData is available here as it's modified by inputs.
    // Let's iterate all mappings.
    let hasError = false;
    allMappings.forEach(m => {
        const idx = m.staffIdx;
        if (idx === -1) return; // Skip TBD

        const s = staffData[idx]; // Use global staffData
        if (!s.isShared) {
            uniqueUsage[idx] = (uniqueUsage[idx] || 0) + 1;
        }
    });

    for (const [idx, count] of Object.entries(uniqueUsage)) {
        if (count > 1) {
            alert(`Error: '${staffData[idx].name}' is marked as Unique but is assigned to ${count} subjects.\n\nUnique staff can strictly handle only ONE subject/class total.`);
            return; // Stop generation
        }
    }

    // Generate Schedule
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const t2 = document.querySelector('#table-y2 tbody');
    const t3 = document.querySelector('#table-y3 tbody');
    const t4 = document.querySelector('#table-y4 tbody');

    t2.innerHTML = t3.innerHTML = t4.innerHTML = "";
    let conflictCount = 0;

    days.forEach(day => {
        const r2 = document.createElement('tr'); r2.innerHTML = `<td><b>${day}</b></td>`;
        const r3 = document.createElement('tr'); r3.innerHTML = `<td><b>${day}</b></td>`;
        const r4 = document.createElement('tr'); r4.innerHTML = `<td><b>${day}</b></td>`;

        for (let p = 0; p < 8; p++) {
            const slot = findConflictFreeSlot(mappings);
            if (slot.isFallback) conflictCount++;

            r2.innerHTML += `<td><span class="subject">${slot.y2.sub}</span><span class="staff">${slot.y2.staffName}</span></td>`;
            r3.innerHTML += `<td><span class="subject">${slot.y3.sub}</span><span class="staff">${slot.y3.staffName}</span></td>`;
            r4.innerHTML += `<td><span class="subject">${slot.y4.sub}</span><span class="staff">${slot.y4.staffName}</span></td>`;
        }
        t2.appendChild(r2);
        t3.appendChild(r3);
        t4.appendChild(r4);
    });

    if (conflictCount > 0) {
        alert(`Warning: The timetable generated with ${conflictCount} unresolved conflicts! \n\nSome slots were set to 'Library' because no shared staff were available without collision. Try adding more staff or changing subjects.`);
    }
}

function findConflictFreeSlot(mappings) {
    let attempts = 0;
    while (attempts < 100) {
        const m2 = getRandom(mappings.y2);
        const m3 = getRandom(mappings.y3);
        const m4 = getRandom(mappings.y4);

        // Conflict: Same Staff at same time?
        const s2 = m2.staffIdx;
        const s3 = m3.staffIdx;
        const s4 = m4.staffIdx; // -1 is safe (TBD)

        // If staff is -1, it's non-colliding automatically
        const c1 = (s2 !== -1 && s2 === s3);
        const c2 = (s2 !== -1 && s2 === s4);
        const c3 = (s3 !== -1 && s3 === s4);

        if (!c1 && !c2 && !c3) {
            return { y2: m2, y3: m3, y4: m4, isFallback: false };
        }
        attempts++;
    }
    // Fallback
    return {
        y2: { sub: "Library", staffName: "-" },
        y3: { sub: "Library", staffName: "-" },
        y4: { sub: "Library", staffName: "-" },
        isFallback: true
    };
}

function getRandom(arr) {
    if (!arr || arr.length === 0) return { sub: "Free", staffIdx: -1, staffName: "-" };
    return arr[Math.floor(Math.random() * arr.length)];
}

init();
