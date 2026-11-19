// Shared persistence for the daily interruption ("on" press) counter.
// Loaded by both content.js (per-tab overlay) and popup.js.
const YAPP_KEYS = { today: 'yapp_today', count: 'yapp_count', history: 'yapp_history' };

function yappTodayStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Rolls yesterday's count into history if the stored day doesn't match today, then
// always returns the up-to-date { today, count, history }.
function yappRollover(cb) {
  chrome.storage.local.get([YAPP_KEYS.today, YAPP_KEYS.count, YAPP_KEYS.history], (data) => {
    const today = yappTodayStr();
    let count = data[YAPP_KEYS.count] || 0;
    const history = data[YAPP_KEYS.history] || {};
    const storedDay = data[YAPP_KEYS.today];
    if (storedDay && storedDay !== today) {
      history[storedDay] = count;
      count = 0;
    }
    chrome.storage.local.set({ [YAPP_KEYS.today]: today, [YAPP_KEYS.count]: count, [YAPP_KEYS.history]: history }, () => {
      cb({ today, count, history });
    });
  });
}

function yappIncrement(cb) {
  yappRollover(({ today, count, history }) => {
    count += 1;
    chrome.storage.local.set({ [YAPP_KEYS.count]: count }, () => cb({ today, count, history }));
  });
}

function yappClearAll(cb) {
  chrome.storage.local.remove([YAPP_KEYS.today, YAPP_KEYS.count, YAPP_KEYS.history], () => cb && cb());
}

// Sums interruptions across a preset range. range: 'today' | '7' | '30' | 'all'.
function yappRangeTotal(range, { today, count, history }) {
  const entries = Object.assign({}, history, { [today]: count });
  if (range === 'all') {
    return Object.values(entries).reduce((sum, v) => sum + v, 0);
  }
  const todayDate = new Date(`${today}T00:00:00`);
  let cutoff = todayDate;
  if (range === '7') { cutoff = new Date(todayDate); cutoff.setDate(cutoff.getDate() - 6); }
  else if (range === '30') { cutoff = new Date(todayDate); cutoff.setDate(cutoff.getDate() - 29); }
  let total = 0;
  for (const [dateStr, c] of Object.entries(entries)) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (d >= cutoff && d <= todayDate) total += c;
  }
  return total;
}
