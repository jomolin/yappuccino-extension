function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const timerEl      = document.getElementById('statusTimer');
const stateEl      = document.getElementById('statusState');
const btnCountdown = document.getElementById('btnCountdown');
const btnReset     = document.getElementById('btnReset');

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
const iv = setInterval(refreshStatus, 1000);
window.addEventListener('unload', () => clearInterval(iv));

btnCountdown.addEventListener('click', () => sendAction('countdown'));
btnReset.addEventListener('click',     () => sendAction('reset'));
document.getElementById('changeShortcut').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});
