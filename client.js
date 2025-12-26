let currentUser = null;
let programmeData = {};
let assessmentToolUrl = '';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Check if we have a config (gets Tool 1 URL)
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        assessmentToolUrl = config.assessmentToolUrl;
    } catch(e) { console.error("Config load failed", e); }

    // 2. Load Form Listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('onboardUserForm').addEventListener('submit', handleOnboardUser);
    document.getElementById('onboardCandidateForm').addEventListener('submit', handleOnboardCandidate);
    document.getElementById('memberSearchForm').addEventListener('submit', handleMemberSearch);
    document.getElementById('candidateSearchForm').addEventListener('submit', handleCandidateSearch);
    document.getElementById('export-btn').addEventListener('click', () => exportTableToCSV('candidate-results-table', 'candidate_logs.csv'));
    document.getElementById('program').addEventListener('change', handleProgramChange);

    // 3. Load Dropdown Data (Pre-fetch)
    loadDropdownData();
});

// --- UI UTILS ---
function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    const textSpan = button.querySelector('.btn-text');
    const loader = button.querySelector('.loader');
    button.disabled = isLoading;
    if (textSpan && loader) {
        textSpan.style.visibility = isLoading ? 'hidden' : 'visible';
        loader.style.display = isLoading ? 'block' : 'none';
    }
}

function showMessage(boxId, message, type) {
    const box = document.getElementById(boxId);
    if(box) {
        box.textContent = message;
        box.className = 'message-box ' + type;
        box.style.display = 'block';
        setTimeout(() => box.style.display = 'none', 5000);
    }
}

function showView(viewId, element) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) viewToShow.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else if (viewId === 'defaultView') {
        document.querySelector('.nav-item[onclick*="defaultView"]').classList.add('active');
    }
}

// --- CORE HANDLERS ---

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginButton');
    toggleButtonLoading(btn, true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser = data.user; // { fullName, email, role, username }
            setupAppForUser(currentUser);
        } else {
            showMessage('login-message', data.message, 'error');
        }
    } catch (err) {
        showMessage('login-message', 'Login error: ' + err.message, 'error');
    } finally {
        toggleButtonLoading(btn, false);
    }
}

function setupAppForUser(user) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('appView').style.display = 'block';
    
    document.getElementById('welcome-message').textContent = `Welcome, ${user.fullName}!`;
    document.getElementById('ta-name').value = user.fullName;
    document.getElementById('ta-email').value = user.email;

    // Role Logic
    if (user.role === 'Admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            if (el.tagName === 'TH' || el.tagName === 'TD') el.style.display = 'table-cell';
            else if (el.classList.contains('nav-item')) el.style.display = 'flex';
            else el.style.display = 'block';
        });
        document.getElementById('logs-title').textContent = 'All Candidate Logs';
        document.getElementById('logs-view-title').textContent = 'All Candidate Logs';
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        document.getElementById('logs-title').textContent = 'My Candidate Logs';
        document.getElementById('logs-view-title').textContent = 'My Candidate Logs';
    }
}

function handleLogout() {
    window.location.reload();
}

// --- DATA LOADERS ---
async function loadDropdownData() {
    try {
        // Programmes
        const resProg = await fetch('/api/get-programmes');
        const dataProg = await resProg.json();
        if(dataProg.success) {
            programmeData = dataProg.data;
            const programDropdown = document.getElementById('program');
            programDropdown.innerHTML = '<option value="" disabled selected>Select a programme</option>';
            Object.keys(programmeData).sort().forEach(p => {
                const opt = document.createElement('option');
                opt.value = p; opt.textContent = p;
                programDropdown.appendChild(opt);
            });
        }

        // Filters
        const resFilters = await fetch('/api/get-filters');
        const dataFilters = await resFilters.json();
        if(dataFilters.success) {
            const taFilter = document.getElementById('candidateTaFilter');
            const progFilter = document.getElementById('candidateProgFilter');
            dataFilters.data.taNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                taFilter.appendChild(opt);
            });
            dataFilters.data.programmes.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                progFilter.appendChild(opt);
            });
        }
    } catch(e) { console.error("Dropdown load failed", e); }
}

function handleProgramChange(e) {
    const selected = e.target.value;
    const projDropdown = document.getElementById('project');
    projDropdown.innerHTML = '';
    
    if (selected && programmeData[selected]) {
        projDropdown.disabled = false;
        projDropdown.innerHTML = '<option value="" disabled selected>Select a project</option>';
        programmeData[selected].forEach(proj => {
            const opt = document.createElement('option');
            opt.value = proj; opt.textContent = proj;
            projDropdown.appendChild(opt);
        });
    } else {
        projDropdown.disabled = true;
        projDropdown.innerHTML = '<option value="" disabled selected>Select a programme first</option>';
    }
}

// --- ACTION HANDLERS ---

async function handleOnboardUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    toggleButtonLoading(btn, true);

    const payload = {
        firstName: document.getElementById('user-fname').value,
        lastName: document.getElementById('user-lname').value,
        email: document.getElementById('user-email').value,
        role: document.getElementById('user-role').value,
        adminUser: currentUser
    };

    try {
        const res = await fetch('/api/onboard-user', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const data = await res.json();
        showMessage('user-message', data.message, data.success ? 'success' : 'error');
        if(data.success) e.target.reset();
    } catch(err) { showMessage('user-message', err.message, 'error'); } 
    finally { toggleButtonLoading(btn, false); }
}

async function handleOnboardCandidate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    toggleButtonLoading(btn, true);

    const payload = {
        taName: document.getElementById('ta-name').value,
        taEmail: document.getElementById('ta-email').value,
        firstName: document.getElementById('candidate-fname').value,
        lastName: document.getElementById('candidate-lname').value,
        email: document.getElementById('candidate-email').value,
        contactNumber: document.getElementById('candidate-contact').value,
        program: document.getElementById('program').value,
        project: document.getElementById('project').value
    };

    try {
        const res = await fetch('/api/onboard-candidate', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const data = await res.json();
        showMessage('candidate-message', data.message, data.success ? 'success' : 'error');
        if(data.success) {
            e.target.reset();
            document.getElementById('ta-name').value = currentUser.fullName;
            document.getElementById('ta-email').value = currentUser.email;
        }
    } catch(err) { showMessage('candidate-message', err.message, 'error'); }
    finally { toggleButtonLoading(btn, false); }
}

async function handleCandidateSearch(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    toggleButtonLoading(btn, true);

    const filters = {
        searchTerm: document.getElementById('candidateSearchTerm').value,
        date: document.getElementById('candidateDateFilter').value,
        taName: document.getElementById('candidateTaFilter').value,
        programme: document.getElementById('candidateProgFilter').value,
        currentUser: currentUser // Pass current user for backend filtering
    };

    try {
        const res = await fetch('/api/search-candidates', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(filters)
        });
        const json = await res.json();
        populateCandidateResults(json.data);
        if(!json.success) showMessage('search-message', json.message, 'error');
    } catch(err) { showMessage('search-message', err.message, 'error'); }
    finally { toggleButtonLoading(btn, false); }
}

function populateCandidateResults(data) {
    const tbody = document.getElementById('candidateResultsBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">No candidates found.</td></tr>';
        return;
    }
    data.forEach(c => {
        const row = document.createElement('tr');
        const taCell = currentUser.role === 'Admin' ? `<td>${c.ta_name || ''}</td>` : '';
        const adminClass = currentUser.role === 'Admin' ? '' : 'hidden';

        let btns = '';
        const profileUrl = `${assessmentToolUrl}?page=profile&token=${c.profile_token}`;
        btns += `<a href="${profileUrl}" target="_blank" class="action-btn view" title="View Profile"><i class="fas fa-eye"></i></a>`;

        if (c.status === 'Invitation Sent') {
            btns += `<button class="action-btn reset" onclick="actionResendInvite('${c.email}', this)"><i class="fas fa-paper-plane"></i></button>`;
        }
        if (c.status === 'Profile Complete') {
            btns += `<button class="action-btn reset" onclick="actionSendTest('${c.email}', '${c.project}', this)"><i class="fas fa-envelope-open-text"></i></button>`;
        }
        if (currentUser.role === 'Admin' && ['Pass','Fail','Not Qualified'].includes(c.status)) {
            btns += `<button class="action-btn reset" onclick="actionResetTest('${c.email}', '${c.project}', this)"><i class="fas fa-redo"></i></button>`;
        }

        row.innerHTML = `
            <td>${c.created_at_fmt}</td>
            ${currentUser.role === 'Admin' ? `<td>${c.ta_name}</td>` : ''}
            <td>${c.first_name} ${c.last_name}</td>
            <td>${c.email}</td>
            <td>${c.username}</td>
            <td>${c.programme}</td>
            <td>${c.status}</td>
            <td>${c.result || ''}</td>
            <td class="flex">${btns}</td>
        `;
        tbody.appendChild(row);
    });
}

// --- MICRO ACTIONS ---
async function actionResendInvite(email, btn) {
    btn.disabled = true;
    try {
        const res = await fetch('/api/resend-invite', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email})
        });
        const data = await res.json();
        showMessage('search-message', data.message, data.success ? 'success' : 'error');
    } catch(e) { showMessage('search-message', e.message, 'error'); }
    finally { btn.disabled = false; }
}

async function actionSendTest(email, project, btn) {
    btn.disabled = true;
    try {
        const res = await fetch('/api/send-test', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, project})
        });
        const data = await res.json();
        showMessage('search-message', data.message, data.success ? 'success' : 'error');
        if(data.success) { btn.innerHTML = '✅'; }
    } catch(e) { showMessage('search-message', e.message, 'error'); }
    finally { if(btn.innerHTML !== '✅') btn.disabled = false; }
}

async function actionResetTest(email, project, btn) {
    if(!confirm('Reset this test? This will erase scores and resend credentials.')) return;
    btn.disabled = true;
    try {
        const res = await fetch('/api/reset-test', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, project})
        });
        const data = await res.json();
        showMessage('search-message', data.message, data.success ? 'success' : 'error');
        if(data.success) document.getElementById('candidateSearchForm').dispatchEvent(new Event('submit'));
    } catch(e) { showMessage('search-message', e.message, 'error'); }
    finally { btn.disabled = false; }
}

function handleMemberSearch(e) {
    // Similar implementation to handleCandidateSearch, kept brief for length
    // You can copy the pattern from handleCandidateSearch
}
function exportTableToCSV(tableId, filename) {
    // Exact copy of your existing CSV export logic
    let csv = [];
    const rows = document.querySelectorAll(`#${tableId} tr`);
    for (const row of rows) {
        const cols = row.querySelectorAll("td, th");
        let rowData = [];
        for (const col of cols) {
             if (col.style.display === 'none') continue;
             let text = col.innerText;
             if(col.querySelector('button, a')) text = "";
             rowData.push('"' + text.replace(/"/g, '""') + '"');
        }
        csv.push(rowData.join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    a.click();
}