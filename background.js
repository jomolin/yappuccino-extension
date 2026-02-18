function sendToActiveTab(msg, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      if (sendResponse) sendResponse(null);
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, msg, (resp) => {
      if (chrome.runtime.lastError) {
        if (sendResponse) sendResponse(null);
        return;
      }
      if (sendResponse) sendResponse(resp);
    });
  });
}

// Keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-timer") sendToActiveTab({ action: "toggle" });
});

// Relay from popup → content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Ignore messages that come FROM a tab (i.e. content script), only handle popup messages
  if (sender.tab) return;

  if (['toggle', 'reset', 'countdown', 'getState'].includes(msg.action)) {
    sendToActiveTab({ action: msg.action }, sendResponse);
    return true; // async
  }
});
