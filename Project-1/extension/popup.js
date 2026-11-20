document.addEventListener("DOMContentLoaded", async () => {
  const tabUrlEl = document.getElementById("tabUrl");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");

  let currentTab = null;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      currentTab = tabs[0];
      tabUrlEl.textContent = currentTab.url || "No URL found";
    }
  } catch (e) {
    tabUrlEl.textContent = "Error reading active tab";
  }

  saveBtn.addEventListener("click", async () => {
    if (!currentTab || !currentTab.url) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving to Markly...";
    statusEl.textContent = "";

    try {
      const res = await fetch("http://localhost:3000/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: currentTab.url,
          saveImmediately: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.isDuplicate) {
          statusEl.style.color = "#d97706";
          statusEl.textContent = `Already saved in folder "${data.folderName}"`;
        } else {
          statusEl.style.color = "#059669";
          statusEl.textContent = "✓ Saved to Markly!";
          setTimeout(() => window.close(), 1200);
        }
      } else {
        statusEl.style.color = "#dc2626";
        statusEl.textContent = data.error || "Save failed";
      }
    } catch (err) {
      statusEl.style.color = "#dc2626";
      statusEl.textContent = "Could not connect to Markly at http://localhost:3000";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Bookmark";
    }
  });
});

