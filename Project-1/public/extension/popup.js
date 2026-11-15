// Markly Chrome Extension Popup Script
document.addEventListener("DOMContentLoaded", async () => {
  const titleInput = document.getElementById("bm-title");
  const urlInput = document.getElementById("bm-url");
  const folderSelect = document.getElementById("bm-folder");
  const tagsInput = document.getElementById("bm-tags");
  const descInput = document.getElementById("bm-desc");
  const starBtn = document.getElementById("star-btn");
  const saveForm = document.getElementById("save-form");
  const saveBtn = document.getElementById("save-btn");
  const statusMsg = document.getElementById("status-msg");
  const faviconPreview = document.getElementById("favicon-preview");
  const workspaceLink = document.getElementById("workspace-link");

  let isFavorite = false;
  let faviconUrl = "";

  // 1. Get Markly Base URL from storage or default to current origin
  let marklyBaseUrl = "http://localhost:3000";
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const stored = await chrome.storage.sync.get(["markly_base_url"]);
      if (stored.markly_base_url) marklyBaseUrl = stored.markly_base_url;
    } catch {}
  }
  if (workspaceLink) workspaceLink.href = marklyBaseUrl;

  // 2. Load User's Folders from Markly API
  try {
    const res = await fetch(`${marklyBaseUrl}/api/folders`, { credentials: "include" });
    if (res.ok) {
      const json = await res.json();
      const folders = json.folders || json.data || [];
      if (Array.isArray(folders) && folders.length > 0) {
        folderSelect.innerHTML = '<option value="__UNSORTED__">Inbox (Unsorted)</option>';
        folders.forEach((f) => {
          if (f.id !== "__UNSORTED__") {
            const opt = document.createElement("option");
            opt.value = f.id;
            opt.textContent = `${f.icon || "📁"} ${f.name}`;
            folderSelect.appendChild(opt);
          }
        });
      }
    }
  } catch (e) {
    console.log("Offline or non-connected Markly server, using defaults.");
  }

  // 3. Inspect Active Chrome Tab
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tab = tabs[0];
        titleInput.value = tab.title || "";
        urlInput.value = tab.url || "";

        if (tab.favIconUrl) {
          faviconUrl = tab.favIconUrl;
          faviconPreview.src = tab.favIconUrl;
          faviconPreview.style.display = "block";
        }

        // Try extracting meta description via scripting
        try {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: () => {
                const meta = document.querySelector('meta[name="description"]') ||
                             document.querySelector('meta[property="og:description"]');
                return meta ? meta.getAttribute("content") : "";
              },
            },
            (results) => {
              if (results && results[0] && results[0].result) {
                descInput.value = results[0].result;
              }
            }
          );
        } catch (err) {}
      }
    });
  }

  // 4. Star Favorite Toggle
  starBtn.addEventListener("click", () => {
    isFavorite = !isFavorite;
    if (isFavorite) {
      starBtn.classList.add("active");
    } else {
      starBtn.classList.remove("active");
    }
  });

  // 5. Submit Form to Markly API
  saveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    const title = titleInput.value.trim();
    if (!url || !title) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving to Markly...";
    statusMsg.className = "status-msg";
    statusMsg.style.display = "none";

    const tagsArray = tagsInput.value
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const folderId = folderSelect.value === "__UNSORTED__" ? null : folderSelect.value;

    const payload = {
      url,
      title,
      description: descInput.value.trim(),
      folderId,
      isFavorite,
      tags: tagsArray,
      iconUrl: faviconUrl,
    };

    try {
      const res = await fetch(`${marklyBaseUrl}/api/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        statusMsg.textContent = "✓ Saved to your Markly library!";
        statusMsg.className = "status-msg status-success";
        setTimeout(() => window.close(), 1200);
      } else {
        // Fallback: save to chrome.storage.local for sync when opening Markly
        if (typeof chrome !== "undefined" && chrome.storage) {
          const stored = await chrome.storage.local.get(["pending_bookmarks"]);
          const list = stored.pending_bookmarks || [];
          list.push({ ...payload, savedAt: Date.now() });
          await chrome.storage.local.set({ pending_bookmarks: list });
          statusMsg.textContent = "✓ Saved offline! Will sync on next Markly visit.";
          statusMsg.className = "status-msg status-success";
          setTimeout(() => window.close(), 1200);
        } else {
          statusMsg.textContent = "Error saving bookmark. Is Markly open?";
          statusMsg.className = "status-msg status-error";
        }
      }
    } catch (err) {
      // Offline fallback
      if (typeof chrome !== "undefined" && chrome.storage) {
        const stored = await chrome.storage.local.get(["pending_bookmarks"]);
        const list = stored.pending_bookmarks || [];
        list.push({ ...payload, savedAt: Date.now() });
        await chrome.storage.local.set({ pending_bookmarks: list });
        statusMsg.textContent = "✓ Saved offline! Will sync on next Markly visit.";
        statusMsg.className = "status-msg status-success";
        setTimeout(() => window.close(), 1200);
      } else {
        statusMsg.textContent = "Cannot reach Markly. Please ensure the workspace is running.";
        statusMsg.className = "status-msg status-error";
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Bookmark";
    }
  });

  // 6. Stash All Open Tabs in Current Window
  const stashWindowBtn = document.getElementById("stash-window-btn");
  if (stashWindowBtn) {
    stashWindowBtn.addEventListener("click", async () => {
      stashWindowBtn.disabled = true;
      stashWindowBtn.textContent = "Stashing Tabs...";

      try {
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ currentWindow: true }, async (tabs) => {
            const validTabs = (tabs || [])
              .filter((t) => t.url && (t.url.startsWith("http://") || t.url.startsWith("https://")))
              .map((t) => ({ title: t.title || t.url, url: t.url }));

            if (validTabs.length === 0) {
              statusMsg.textContent = "No valid web tabs found in this window.";
              statusMsg.className = "status-msg status-error";
              stashWindowBtn.disabled = false;
              stashWindowBtn.textContent = "📥 Stash All Tabs in Window";
              return;
            }

            const now = new Date();
            const folderName = `Window Session (${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;

            try {
              const res = await fetch(`${marklyBaseUrl}/api/bookmarks/stash-tabs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ folderName, tabs: validTabs }),
              });

              if (res.ok) {
                statusMsg.textContent = `✓ Stashed ${validTabs.length} tabs into Markly!`;
                statusMsg.className = "status-msg status-success";
                setTimeout(() => window.close(), 1200);
              } else {
                statusMsg.textContent = "Failed to stash tabs into Markly. Please log in.";
                statusMsg.className = "status-msg status-error";
              }
            } catch (err) {
              statusMsg.textContent = "Error connecting to Markly server.";
              statusMsg.className = "status-msg status-error";
            } finally {
              stashWindowBtn.disabled = false;
              stashWindowBtn.textContent = "📥 Stash All Tabs in Window";
            }
          });
        }
      } catch (err) {
        stashWindowBtn.disabled = false;
        stashWindowBtn.textContent = "📥 Stash All Tabs in Window";
      }
    });
  }
});

