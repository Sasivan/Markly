// Markly Chrome Extension Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu Item for right-click saving
  chrome.contextMenus.create({
    id: "markly-save-page",
    title: "Save page to Markly",
    contexts: ["page", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "markly-save-page" && tab) {
    const targetUrl = info.linkUrl || tab.url;
    const targetTitle = tab.title || targetUrl;
    
    // Store in pending bookmarks queue
    chrome.storage.local.get(["pending_bookmarks"], (res) => {
      const list = res.pending_bookmarks || [];
      list.push({
        url: targetUrl,
        title: targetTitle,
        savedAt: Date.now()
      });
      chrome.storage.local.set({ pending_bookmarks: list });
    });
  }
});

