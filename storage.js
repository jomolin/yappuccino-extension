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

// Returns each day's count separately (not summed) within a preset range,
// sorted most-recent first. range: 'today' | '7' | '30' | 'all'.
function yappRangeEntries(range, { today, count, history }) {
  const entries = Object.assign({}, history, { [today]: count });
  const todayDate = new Date(`${today}T00:00:00`);
  let cutoff = null;
  if (range === 'today') cutoff = todayDate;
  else if (range === '7') { cutoff = new Date(todayDate); cutoff.setDate(cutoff.getDate() - 6); }
  else if (range === '30') { cutoff = new Date(todayDate); cutoff.setDate(cutoff.getDate() - 29); }
  const rows = [];
  for (const [date, c] of Object.entries(entries)) {
    if (cutoff) {
      const d = new Date(`${date}T00:00:00`);
      if (d < cutoff || d > todayDate) continue;
    }
    rows.push({ date, count: c });
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows;
}
