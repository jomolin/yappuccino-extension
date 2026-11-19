function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const timerEl      = document.getElementById('statusTimer');
const stateEl      = document.getElementById('statusState');
const counterEl    = document.getElementById('statusCounter');
const rangeSelect  = document.getElementById('rangeSelect');
const historyTable = document.getElementById('historyTable');
const btnCountdown = document.getElementById('btnCountdown');
const btnReset     = document.getElementById('btnReset');
const btnClear     = document.getElementById('btnClear');

const stateLabels = {
  hidden:    '● idle',
  running:   '▶ counting up',
  paused:    '⏸ paused',
  countdown: '⏳ working it off',
};

function updateUI(resp) {
  timerEl.textContent = formatTime(resp.elapsed);
  stateEl.textContent = stateLabels[resp.state] || '● idle';
  stateEl.className   = `status-state ${resp.state || 'hidden'}`;
  btnCountdown.disabled = resp.elapsed === 0 || resp.state === 'countdown';
}

function refreshStatus() {
  chrome.runtime.sendMessage({ action: 'getState' }, (resp) => {
    if (chrome.runtime.lastError) { void chrome.runtime.lastError; }
    if (!resp) {
      timerEl.textContent = '--:--';
      stateEl.textContent = '● reload tab to activate';
      stateEl.className = 'status-state hidden';
      btnCountdown.disabled = true;
      return;
    }
    updateUI(resp);
  });
}

const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function renderHistoryTable(rows) {
  if (rows.length === 0) {
    historyTable.innerHTML = '<tr><td class="history-empty" colspan="2">No data for this range</td></tr>';
    return;
  }
  historyTable.innerHTML = rows.map(({ date, count }) => {
    const weekday = WEEKDAY_ABBR[new Date(`${date}T00:00:00`).getDay()];
    return `<tr><td class="hist-date">${weekday} ${date}</td><td class="hist-count">${count}</td></tr>`;
  }).join('');
}

function refreshCounters() {
  yappRollover((data) => {
    counterEl.textContent = String(data.count);
    renderHistoryTable(yappRangeEntries(rangeSelect.value, data));
  });
}

function sendAction(action) {
  chrome.runtime.sendMessage({ action }, (resp) => {
    if (chrome.runtime.lastError) { void chrome.runtime.lastError; }
    if (resp && resp.state !== undefined) {
      updateUI(resp);
    }
    setTimeout(refreshStatus, 200);
  });
}

refreshStatus();
refreshCounters();
const iv = setInterval(refreshStatus, 1000);
window.addEventListener('unload', () => clearInterval(iv));

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') refreshCounters();
  });
}

btnCountdown.addEventListener('click', () => sendAction('countdown'));
btnReset.addEventListener('click',     () => sendAction('reset'));
rangeSelect.addEventListener('change', refreshCounters);
btnClear.addEventListener('click', () => {
  if (!confirm('Clear all interruption counts and history? This cannot be undone.')) return;
  yappClearAll(refreshCounters);
});
document.getElementById('changeShortcut').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});
