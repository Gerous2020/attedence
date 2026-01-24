// Initial Data
let staffData = []; // Will be fetched from API
let subjectData = { y2: [], y3: [], y4: [] }; // Will be fetched from API

async function init() {
    await fetchData(); // Fetch Staff and Allocations

    // Set up listeners
    // Note: add-staff-btn is removed/hidden since we manage staff in Admin
    // but if it exists we can leave it or disable it.

    // We still allow adding extra subjects manually if needed
    // document.getElementById('add-staff-btn').addEventListener('click', () => addStaff());

    document.getElementById('refresh-alloc-btn').addEventListener('click', loadAllocationUI);
    document.getElementById('generate-btn').addEventListener('click', generateTimetable);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
}

async function fetchData() {
    try {
        // 1. Fetch Staff
        const resStaff = await fetch('/api/staff');
        const staff = await resStaff.json();
        staffData = staff.map(s => ({
            id: s.staffId, // Keep reference
            name: s.name,
            isShared: true // Default to shared
        }));
        renderStaffInputs();

        // 2. Fetch Allocations
        const resAlloc = await fetch('/api/allocations');
        const allocs = await resAlloc.json();

        // Reset subjectData
        subjectData = { y2: [], y3: [], y4: [] };

        allocs.forEach(a => {
            const yearKey = `y${a.year}`;
            if (subjectData[yearKey]) {
                subjectData[yearKey].push({
                    name: a.subjectName,
                    hours: 4, // Default hours
                    staffId: a.staff?.staffId || null,
                    staffName: a.staffName
                });
            }
        });

        renderSubjectInputs();

    } catch (e) {
        console.error("Error fetching data:", e);
        alert("Failed to load data from server.");
    }
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
                <input type="text" placeholder="Subject Name" onchange="updateSubject(${year}, ${i}, 'name', this.value)" value="${sub.name}">
                <input type="number" placeholder="Hrs" style="width:50px; margin-left:5px;" min="1" max="10" onchange="updateSubject(${year}, ${i}, 'hours', this.value)" value="${sub.hours}">
                <button class="btn-icon-remove" onclick="removeSubject('${year}', ${i})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    };

    renderYear('2', subjectData.y2);
    renderYear('3', subjectData.y3);
    renderYear('4', subjectData.y4);
}

// Unified update function for name and hours
window.updateSubject = function (year, index, field, val) {
    if (field === 'hours') val = parseInt(val) || 0;
    subjectData[`y${year}`][index][field] = val;
};

window.addSubject = function (year) {
    subjectData[`y${year}`].push({ name: "New Subject", hours: 4 });
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
    const createSelect = (year, i, sub) => {
        let options = `<option value="">-- Select Staff --</option>`;
        staffData.forEach((s, idx) => {
            // Check if this staff is the allocated one
            // We match by name or ID. sub.staffName comes from DB allocation
            const isSelected = (sub.staffId && s.id === sub.staffId) || (sub.staffName && s.name === sub.staffName);
            options += `<option value="${idx}" ${isSelected ? 'selected' : ''}>${s.name} (${s.isShared ? 'Shared' : 'Unique'})</option>`;
        });
        return `
            <div class="alloc-item">
                <div style="display:flex; justify-content:space-between;">
                    <h5>[Y${year}] ${sub.name} (${sub.hours}hrs)</h5>
                </div>
                <select id="alloc-y${year}-${i}">
                    ${options}
                </select>
            </div>
        `;
    };

    // Render Dynamic Subjects. Note: sub is now an object.
    subjectData.y2.forEach((sub, i) => container.innerHTML += createSelect(2, i, sub));
    subjectData.y3.forEach((sub, i) => container.innerHTML += createSelect(3, i, sub));
    subjectData.y4.forEach((sub, i) => container.innerHTML += createSelect(4, i, sub));
}

// === GENERATION ===
function generateTimetable() {
    const mappings = { y2: [], y3: [], y4: [] };
    const remainingHours = { y2: [], y3: [], y4: [] }; // Track hours

    // 1. GET USER MAPPINGS & INIT COUNTERS
    const getMap = (year) => {
        subjectData[`y${year}`].forEach((sub, i) => {
            // Initialize Remaining Hours for this subject
            remainingHours[`y${year}`][i] = sub.hours;

            const el = document.getElementById(`alloc-y${year}-${i}`);
            // If UI not loaded, we can't map. But we can default.
            if (!el) {
                mappings[`y${year}`].push({ sub: sub.name, staffIdx: -1, staffName: "TBD", originalIdx: i });
                return;
            }

            const staffIdx = el.value;
            if (staffIdx === "") {
                mappings[`y${year}`].push({ sub: sub.name, staffIdx: -1, staffName: "TBD", originalIdx: i });
            } else {
                mappings[`y${year}`].push({
                    sub: sub.name,
                    staffIdx: parseInt(staffIdx),
                    staffName: staffData[staffIdx].name,
                    originalIdx: i
                });
            }
        });
    };

    getMap(2);
    getMap(3);
    getMap(4);

    // 2. CHECK UNIQUE CONSTRAINT (Static validation)
    const uniqueUsage = {};
    const allMappings = [...mappings.y2, ...mappings.y3, ...mappings.y4];

    let hasError = false;
    allMappings.forEach(m => {
        const idx = m.staffIdx;
        if (idx === -1) return;

        const s = staffData[idx];
        if (!s.isShared) {
            uniqueUsage[idx] = (uniqueUsage[idx] || 0) + 1;
        }
    });

    for (const [idx, count] of Object.entries(uniqueUsage)) {
        if (count > 1) {
            alert(`Error: '${staffData[idx].name}' is marked as Unique but is assigned to ${count} subjects.\n\nUnique staff can strictly handle only ONE subject/class total.`);
            return;
        }
    }

    // 3. GENERATE SCHEDULE
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
            // Pass the mutable counters to the finder
            const slot = findConflictFreeSlot(mappings, remainingHours);
            if (slot.isFallback) conflictCount++;

            // Update remaining hours if a valid subject was chosen
            if (slot.y2.originalIdx !== undefined) remainingHours['y2'][slot.y2.originalIdx]--;
            if (slot.y3.originalIdx !== undefined) remainingHours['y3'][slot.y3.originalIdx]--;
            if (slot.y4.originalIdx !== undefined) remainingHours['y4'][slot.y4.originalIdx]--;

            r2.innerHTML += `<td><span class="subject">${slot.y2.sub}</span><span class="staff">${slot.y2.staffName}</span></td>`;
            r3.innerHTML += `<td><span class="subject">${slot.y3.sub}</span><span class="staff">${slot.y3.staffName}</span></td>`;
            r4.innerHTML += `<td><span class="subject">${slot.y4.sub}</span><span class="staff">${slot.y4.staffName}</span></td>`;
        }
        t2.appendChild(r2);
        t3.appendChild(r3);
        t4.appendChild(r4);
    });

    if (conflictCount > 0) {
        alert(`Warning: The timetable generated with ${conflictCount} unresolved conflicts or filled slots! \n\nSome slots were set to 'Library' because subject hours were exhausted or no shared staff were available.`);
    }
}

function findConflictFreeSlot(mappings, remainingHours) {
    let attempts = 0;
    while (attempts < 500) { // Increased attempts
        // Filter subjects that still have hours remaining
        const availableY2 = mappings.y2.filter(m => remainingHours.y2[m.originalIdx] > 0);
        const availableY3 = mappings.y3.filter(m => remainingHours.y3[m.originalIdx] > 0);
        const availableY4 = mappings.y4.filter(m => remainingHours.y4[m.originalIdx] > 0);

        const m2 = getRandom(availableY2);
        const m3 = getRandom(availableY3);
        const m4 = getRandom(availableY4);

        // Conflict Checks
        const s2 = m2.staffIdx;
        const s3 = m3.staffIdx;
        const s4 = m4.staffIdx;

        // -1 means "TBD" or "Free/Library", which doesn't collide
        const c1 = (s2 !== -1 && s2 === s3);
        const c2 = (s2 !== -1 && s2 === s4);
        const c3 = (s3 !== -1 && s3 === s4);

        if (!c1 && !c2 && !c3) {
            return { y2: m2, y3: m3, y4: m4, isFallback: false };
        }
        attempts++;
    }
    // Fallback: This usually happens if "Library" is selected or we fail to find a match
    return {
        y2: { sub: "Library", staffName: "-" },
        y3: { sub: "Library", staffName: "-" },
        y4: { sub: "Library", staffName: "-" },
        isFallback: true
    };
}

function getRandom(arr) {
    // If no subjects have hours left, return "Library"
    if (!arr || arr.length === 0) return { sub: "Library", staffIdx: -1, staffName: "-" };
    return arr[Math.floor(Math.random() * arr.length)];
}

init();
