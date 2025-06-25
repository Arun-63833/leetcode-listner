// Inject the script into the page context
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

// Listen for token requests from page context
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "GET_TOKENS") {
    // Check if chrome.storage is available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["access_token", "refresh_token"], (result) => {
        window.postMessage({
          type: "TOKENS_RETURNED",
          access_token: result.access_token,
          refresh_token: result.refresh_token
        }, "*");
      });
    } else {
      // Fallback: send empty tokens if chrome.storage is not available
      console.error("Chrome storage API not available");
      window.postMessage({
        type: "TOKENS_RETURNED",
        access_token: null,
        refresh_token: null
      }, "*");
    }
  }
});

