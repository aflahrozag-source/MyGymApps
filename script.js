// Data Default Gym
const gymData = {
    push: [
        { name: "Bench Press", totalSets: 4, currentSets: 0, reps: "6-8 Reps", restSec: 90 },
        { name: "Incline Dumbbell Press", totalSets: 3, currentSets: 0, reps: "8-10 Reps", restSec: 60 },
        { name: "Overhead Press", totalSets: 3, currentSets: 0, reps: "8-10 Reps", restSec: 60 }
    ],
    pull: [
        { name: "Barbell Row", totalSets: 4, currentSets: 0, reps: "6-8 Reps", restSec: 90 },
        { name: "Lat Pulldown", totalSets: 3, currentSets: 0, reps: "10-12 Reps", restSec: 60 },
        { name: "Face Pulls", totalSets: 3, currentSets: 0, reps: "12-15 Reps", restSec: 45 }
    ],
    leg: [
        { name: "Barbell Squats", totalSets: 4, currentSets: 0, reps: "6-8 Reps", restSec: 120 },
        { name: "Romanian Deadlift", totalSets: 3, currentSets: 0, reps: "8-10 Reps", restSec: 90 },
        { name: "Leg Press", totalSets: 3, currentSets: 0, reps: "10-12 Reps", restSec: 60 }
    ]
};

let currentDay = 'push';
let timerIntervals = {};
let currentCalDate = new Date();
let calendarNotes = {}; 
let selectedCalDateKey = null;
let chartInstance = null;

let dailyLogFlags = { started: false, completed: false };

document.addEventListener('DOMContentLoaded', () => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
    startRealtimeClock();
    setupCalendar();
    setupNavbar();
    setupEventListeners();
    renderWorkouts();
    initChart();
});

// 1. Navbar & Tab Switcher
function setupNavbar() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.remove('hidden');

            if (targetId === 'tab-stats') {
                updateChartData();
            }
        };
    });
}

// 2. Audio, Getar & Notifikasi
function playRestBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) { console.log("Audio not supported"); }
}

function triggerRestNotification(exerciseName) {
    playRestBeep();
    if ("vibrate" in navigator) navigator.vibrate([300, 150, 300]);
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⏱️ Waktu Rest Selesai!", {
            body: `Waktu istirahat untuk ${exerciseName} telah habis. Lanjut set berikutnya!`,
            icon: "https://via.placeholder.com/128/00f2fe/0f1015?text=GYM"
        });
    }
}

// 3. Clock & Calendar
function startRealtimeClock() {
    function updateClock() {
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        const dateEl = document.getElementById('realtime-date');
        const timeEl = document.getElementById('realtime-time');
        if (dateEl) dateEl.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        if (timeEl) timeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} WIB`;

        setDailyReminder(days[now.getDay()], now.getDay());
    }
    updateClock();
    setInterval(updateClock, 1000);
}

function setDailyReminder(dayName, dayIdx) {
    const reminderText = document.getElementById('reminder-text');
    if (!reminderText) return;
    const restCheckboxes = document.querySelectorAll('.rest-day-check:checked');
    const userRestDays = Array.from(restCheckboxes).map(cb => parseInt(cb.value));

    if (userRestDays.includes(dayIdx)) {
        reminderText.textContent = `Hari ini (${dayName}) adalah Rest Day! Fokus pemulihan otot & hidrasi.`;
    } else if (dayName === 'Senin' || dayName === 'Kamis') {
        reminderText.textContent = "Hari ini jadwal PUSH DAY! Fokus Otot Dada, Bahu, & Tricep.";
    } else if (dayName === 'Selasa' || dayName === 'Jumat') {
        reminderText.textContent = "Hari ini jadwal PULL DAY! Hajar Otot Punggung & Bicep.";
    } else if (dayName === 'Rabu' || dayName === 'Sabtu') {
        reminderText.textContent = "Hari ini jadwal LEG DAY! Latih Kaki & Core secara optimal.";
    }
}

function setupCalendar() {
    const monthYearText = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    const recText = document.getElementById('rec-text');
    const btnPrev = document.getElementById('btn-prev-month');
    const btnNext = document.getElementById('btn-next-month');
    const noteBox = document.getElementById('calendar-note-box');
    const inputCalNote = document.getElementById('input-cal-note');
    const btnSaveCalNote = document.getElementById('btn-save-cal-note');

    if (btnPrev) btnPrev.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); renderCalendar(); };
    if (btnNext) btnNext.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); renderCalendar(); };

    if (btnSaveCalNote) {
        btnSaveCalNote.onclick = () => {
            if (selectedCalDateKey && inputCalNote) {
                calendarNotes[selectedCalDateKey] = inputCalNote.value.trim();
                alert('Catatan tanggal berhasil disimpan!');
                renderCalendar();
            }
        };
    }

    function renderCalendar() {
        if (!grid || !monthYearText) return;
        grid.innerHTML = '';
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        monthYearText.textContent = `${months[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const userRestDays = Array.from(document.querySelectorAll('.rest-day-check:checked')).map(cb => parseInt(cb.value));

        for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

        for (let d = 1; d <= daysInMonth; d++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day';
            dayEl.textContent = d;

            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (calendarNotes[dateKey]) dayEl.classList.add('has-note');
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) dayEl.classList.add('today');

            dayEl.onclick = () => {
                document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('active-day'));
                dayEl.classList.add('active-day');

                selectedCalDateKey = dateKey;
                const selectedDate = new Date(year, month, d);
                const dayIdx = selectedDate.getDay();
                let type = "", recs = "";

                if (userRestDays.includes(dayIdx)) {
                    type = "Rest Day (Jadwal Kustom)";
                    recs = "Rekomendasi Pemulihan: Foam rolling, jalan santai 15-20 menit, & tidur 8 jam.";
                } else if (dayIdx === 1 || dayIdx === 4) {
                    type = "Push Day";
                    recs = "Rekomendasi Latihan: Bench Press, Overhead Press, Incline Dumbbell, & Tricep Dips.";
                } else if (dayIdx === 2 || dayIdx === 5) {
                    type = "Pull Day";
                    recs = "Rekomendasi Latihan: Barbell Row, Lat Pulldown, Face Pulls, & Bicep Curls.";
                } else if (dayIdx === 3 || dayIdx === 6) {
                    type = "Leg Day";
                    recs = "Rekomendasi Latihan: Barbell Squats, Romanian Deadlift, Leg Press, & Calf Raises.";
                }

                const savedNote = calendarNotes[dateKey] ? `<br>📝 <strong>Catatan:</strong> ${calendarNotes[dateKey]}` : '';
                if (recText) recText.innerHTML = `<strong>Tanggal: ${d} ${months[month]} ${year} (${type})</strong><br>${recs}${savedNote}`;
                if (noteBox) noteBox.classList.remove('hidden');
                if (inputCalNote) inputCalNote.value = calendarNotes[dateKey] || '';
            };

            grid.appendChild(dayEl);
        }
    }
    renderCalendar();
}

// 4. Event Listeners & Mode Fokus
function setupEventListeners() {
    const dayButtons = document.querySelectorAll('.day-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const btnToggleAdd = document.getElementById('btn-toggle-add-form');
    const btnToggleHistory = document.getElementById('btn-toggle-history');
    const addWorkoutForm = document.getElementById('add-workout-form');
    const btnModalReset = document.getElementById('btn-modal-reset');
    const btnSaveDailyLog = document.getElementById('btn-save-daily-log');

    const btnFocusMode = document.getElementById('btn-focus-mode');
    const btnCloseFocus = document.getElementById('btn-close-focus');
    const focusOverlay = document.getElementById('focus-overlay');

    dayButtons.forEach(button => {
        button.addEventListener('click', () => {
            dayButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentDay = button.getAttribute('data-day');
            dailyLogFlags.started = false;
            dailyLogFlags.completed = false;
            renderWorkouts();
        });
    });

    if (themeToggleBtn) {
        themeToggleBtn.onclick = () => {
            document.body.toggleAttribute('data-theme-light');
            if (document.body.hasAttribute('data-theme-light')) document.body.setAttribute('data-theme', 'light');
            else document.body.removeAttribute('data-theme');
        };
    }

    if (btnToggleAdd) btnToggleAdd.onclick = () => document.getElementById('add-workout-card')?.classList.toggle('hidden');
    if (btnToggleHistory) btnToggleHistory.onclick = () => document.getElementById('history-log-card')?.classList.toggle('hidden');

    if (btnFocusMode && focusOverlay) {
        btnFocusMode.onclick = () => {
            renderFocusMode();
            focusOverlay.classList.remove('hidden');
        };
    }
    if (btnCloseFocus && focusOverlay) {
        btnCloseFocus.onclick = () => focusOverlay.classList.add('hidden');
    }

    if (addWorkoutForm) {
        addWorkoutForm.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('input-name').value;
            const totalSets = parseInt(document.getElementById('input-sets').value);
            const reps = document.getElementById('input-reps').value;
            const restSec = parseInt(document.getElementById('input-rest-sec').value);

            gymData[currentDay].push({ name, totalSets, currentSets: 0, reps, restSec });
            e.target.reset();
            document.getElementById('add-workout-card').classList.add('hidden');
            renderWorkouts();
        };
    }

    if (btnModalReset) {
        btnModalReset.onclick = () => {
            gymData[currentDay].forEach(item => item.currentSets = 0);
            dailyLogFlags.started = false;
            dailyLogFlags.completed = false;
            document.getElementById('congrats-modal').classList.add('hidden');
            renderWorkouts();
        };
    }

    if (btnSaveDailyLog) {
        btnSaveDailyLog.onclick = () => {
            const inputNote = document.getElementById('input-daily-note');
            if (inputNote && inputNote.value.trim() !== '') {
                addHistoryLog(`Catatan Manual: "${inputNote.value.trim()}"`);
                inputNote.value = '';
            }
        };
    }
}

// 5. Render Mode Fokus Lengkap (Dengan Progres & Timer Aktif)
function renderFocusMode() {
    const focusContainer = document.getElementById('focus-workout-container');
    if (!focusContainer) return;
    focusContainer.innerHTML = '';

    // Hitung Total Progres Harian
    const exercises = gymData[currentDay];
    let sumPercent = 0;
    exercises.forEach(item => {
        const p = item.totalSets > 0 ? (item.currentSets / item.totalSets) * 100 : 0;
        sumPercent += Math.min(100, p);
    });
    const totalPercent = exercises.length === 0 ? 0 : Math.round(sumPercent / exercises.length);

    // Header Progres Total di Mode Fokus
    const progressHeader = document.createElement('div');
    progressHeader.className = 'focus-total-progress';
    progressHeader.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-weight:600; font-size:0.9rem; margin-bottom:6px;">
            <span>TOTAL PROGRESS (${currentDay.toUpperCase()} DAY)</span>
            <span style="color:#00f2fe;">${totalPercent}%</span>
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${totalPercent}%"></div>
        </div>
    `;
    focusContainer.appendChild(progressHeader);

    // Render Setiap Card Latihan di Mode Fokus
    exercises.forEach((item, index) => {
        const itemPercent = item.totalSets > 0 ? Math.round((item.currentSets / item.totalSets) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'focus-workout-card';
        card.innerHTML = `
            <h3>${item.name}</h3>
            <div class="focus-reps">Target: ${item.reps}</div>

            <div class="focus-counter-row">
                <button class="btn-focus-action" onclick="changeSet(${index}, -1); renderFocusMode();">-</button>
                <div class="focus-set-display">${item.currentSets} / ${item.totalSets} Set</div>
                <button class="btn-focus-action" onclick="changeSetInFocus(${index})">+</button>
            </div>

            <div class="item-progress-box" style="margin-bottom: 12px;">
                <div class="item-progress-text">
                    <span>Progress Menu</span>
                    <span>${itemPercent}%</span>
                </div>
                <div class="item-progress-bar-bg">
                    <div class="item-progress-bar-fill" style="width: ${Math.min(100, itemPercent)}%"></div>
                </div>
            </div>

            <div class="focus-timer-box">
                <div class="focus-timer-display">
                    ⏱️ Rest: <span id="focus-timer-val-${index}">${item.restSec}</span>s
                </div>
                <div class="focus-timer-btns">
                    <button class="btn-focus-timer" onclick="startFocusTimer(${index})">▶️ Start</button>
                    <button class="btn-focus-timer" onclick="stopInlineTimer(${index})">⏹️ Stop</button>
                    <button class="btn-focus-timer" onclick="resetFocusTimer(${index})">🔄 Reset</button>
                </div>
            </div>
        `;
        focusContainer.appendChild(card);
    });
}

function changeSetInFocus(index) {
    changeSet(index, 1);
    renderFocusMode();
    startFocusTimer(index); // Otomatis Rest Timer jalan saat dipencet +
}

function startFocusTimer(index) {
    stopInlineTimer(index);
    const item = gymData[currentDay][index];
    let timeLeft = item.restSec;

    const timerDisplay = document.getElementById(`focus-timer-val-${index}`);
    const normalInput = document.getElementById(`timer-val-${index}`);

    timerIntervals[index] = setInterval(() => {
        timeLeft--;
        if (timerDisplay) timerDisplay.textContent = timeLeft;
        if (normalInput) normalInput.value = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerIntervals[index]);
            triggerRestNotification(item.name);
            alert(`⏰ Waktu Rest untuk ${item.name} Selesai!`);
            renderFocusMode();
        }
    }, 1000);
}

function resetFocusTimer(index) {
    stopInlineTimer(index);
    const item = gymData[currentDay][index];
    const timerDisplay = document.getElementById(`focus-timer-val-${index}`);
    if (timerDisplay) timerDisplay.textContent = item.restSec;
}

// 6. Render Workouts & Timers Biasa
function renderWorkouts() {
    const workoutList = document.getElementById('workout-list');
    const dayTitle = document.getElementById('day-title');
    if (!workoutList) return;

    workoutList.innerHTML = '';
    if (dayTitle) dayTitle.textContent = `${currentDay.toUpperCase()} DAY PROGRESS`;

    gymData[currentDay].forEach((item, index) => {
        const itemPercent = item.totalSets > 0 ? Math.round((item.currentSets / item.totalSets) * 100) : 0;
        const card = document.createElement('div');
        card.className = `workout-card ${itemPercent >= 100 ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="workout-header">
                <div class="exercise-info">
                    <h3 class="exercise-name">${item.name}</h3>
                    <div class="exercise-sub">Target Reps: ${item.reps}</div>
                    <div class="set-setting-inline">
                        🎯 Target Set: 
                        <input type="number" value="${item.totalSets}" min="1" onchange="updateTotalSets(${index}, this.value)">
                    </div>
                </div>
                <div class="set-counter-group">
                    <button class="btn-set-action" onclick="changeSet(${index}, -1)">-</button>
                    <span style="font-size:0.85rem; font-weight:600;">${item.currentSets} / ${item.totalSets} Set</span>
                    <button class="btn-set-action" onclick="changeSet(${index}, 1)">+</button>
                </div>
            </div>

            <div class="item-progress-box">
                <div class="item-progress-text">
                    <span>Progress Menu</span>
                    <span>${itemPercent}%</span>
                </div>
                <div class="item-progress-bar-bg">
                    <div class="item-progress-bar-fill" style="width: ${Math.min(100, itemPercent)}%"></div>
                </div>
            </div>

            <div class="card-timer-box">
                <div class="timer-input-group">
                    ⏱️ Rest: 
                    <input type="number" class="timer-input" id="timer-val-${index}" value="${item.restSec}" min="5" onchange="updateRestSec(${index}, this.value)">s
                </div>
                <div class="timer-controls-inline">
                    <button class="btn-timer-sm" onclick="startInlineTimer(${index})">Start</button>
                    <button class="btn-timer-sm" onclick="stopInlineTimer(${index})">Stop</button>
                    <button class="btn-timer-sm" onclick="resetInlineTimer(${index})">Reset</button>
                </div>
            </div>
        `;
        workoutList.appendChild(card);
    });

    updateOverallProgress();
}

function updateRestSec(index, newValue) {
    const val = parseInt(newValue);
    if (!isNaN(val) && val > 0) gymData[currentDay][index].restSec = val;
}

function updateTotalSets(index, newTotal) {
    const val = parseInt(newTotal);
    if (!isNaN(val) && val > 0) {
        gymData[currentDay][index].totalSets = val;
        renderWorkouts();
    }
}

function changeSet(index, delta) {
    const item = gymData[currentDay][index];
    item.currentSets = Math.max(0, item.currentSets + delta);

    if (!dailyLogFlags.started && item.currentSets > 0) {
        dailyLogFlags.started = true;
        addHistoryLog(`Memulai sesi latihan ${currentDay.toUpperCase()} DAY.`);
    }

    renderWorkouts();
}

function addHistoryLog(message) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const emptyLog = historyList.querySelector('.empty-log');
    if (emptyLog) emptyLog.remove();

    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[now.getDay()];
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const li = document.createElement('li');
    li.innerHTML = `<strong>[${dayName}, ${dateStr} - ${timeStr}]</strong> ${message}`;
    historyList.prepend(li);
}

function startInlineTimer(index) {
    stopInlineTimer(index);
    const inputEl = document.getElementById(`timer-val-${index}`);
    if (!inputEl) return;
    let timeLeft = parseInt(inputEl.value);
    if (isNaN(timeLeft) || timeLeft <= 0) return;
    gymData[currentDay][index].restSec = timeLeft;

    timerIntervals[index] = setInterval(() => {
        timeLeft--;
        inputEl.value = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerIntervals[index]);
            triggerRestNotification(gymData[currentDay][index].name);
            alert(`⏰ Waktu Rest untuk ${gymData[currentDay][index].name} Selesai!`);
        }
    }, 1000);
}

function stopInlineTimer(index) {
    if (timerIntervals[index]) clearInterval(timerIntervals[index]);
}

function resetInlineTimer(index) {
    stopInlineTimer(index);
    const inputEl = document.getElementById(`timer-val-${index}`);
    if (inputEl) inputEl.value = gymData[currentDay][index].restSec;
}

function updateOverallProgress() {
    const progressPercent = document.getElementById('progress-percent');
    const progressFill = document.getElementById('progress-fill');
    const exercises = gymData[currentDay];

    if (exercises.length === 0) {
        if (progressPercent) progressPercent.textContent = `0%`;
        if (progressFill) progressFill.style.width = `0%`;
        return;
    }

    let sumPercent = 0;
    exercises.forEach(item => {
        const p = item.totalSets > 0 ? (item.currentSets / item.totalSets) * 100 : 0;
        sumPercent += Math.min(100, p);
    });

    const totalPercent = Math.round(sumPercent / exercises.length);
    if (progressPercent) progressPercent.textContent = `${totalPercent}%`;
    if (progressFill) progressFill.style.width = `${totalPercent}%`;

    if (totalPercent >= 100 && !dailyLogFlags.completed) {
        dailyLogFlags.completed = true;
        addHistoryLog(`🏆 MENCAPAI 100%! Berhasil menyelesaikan latihan ${currentDay.toUpperCase()} DAY.`);
        setTimeout(() => {
            const modal = document.getElementById('congrats-modal');
            if (modal) modal.classList.remove('hidden');
        }, 300);
    }
}

// 7. Visualisasi Grafik Konsistensi Chart.js
function initChart() {
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
            datasets: [{
                label: 'Progress Latihan (%)',
                data: [100, 80, 0, 100, 90, 100, 0],
                borderColor: '#00f2fe',
                backgroundColor: 'rgba(0, 242, 254, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0072ff',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#232733' }, ticks: { color: '#8892b0' } },
                x: { grid: { color: '#232733' }, ticks: { color: '#8892b0' } }
            },
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            }
        }
    });
}

function updateChartData() {
    if (!chartInstance) return;
    chartInstance.update();
}