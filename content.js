// Inject inject.js into the webpage's context
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove(); // Cleanup after injection

// Listen for token requests from inject.js (page context)
window.addEventListener("message", (event) => {
  // Only handle messages from the same window
  if (event.source !== window) return;

  // Handle GET_TOKENS request from inject.js
  if (event.data.type === "GET_TOKENS") {
    // Optional: restrict origin for extra security
    // if (event.origin !== "https://example.com") return;

    // Ensure chrome.storage.local is available
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(["access_token", "refresh_token"], (result) => {
        window.postMessage(
          {
            type: "TOKENS_RETURNED",
            access_token: result.access_token || null,
            refresh_token: result.refresh_token || null,
          },
          "*"
        );
      });
    } else {
      console.error("Chrome storage API not available in content.js");
      window.postMessage(
        {
          type: "TOKENS_RETURNED",
          access_token: null,
          refresh_token: null,
        },
        "*"
      );
    }
  }
});
