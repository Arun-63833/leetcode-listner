(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const url = args[0];

    // ✅ Extract and log the problem slug if URL matches /problems/*/submit/
    const problemMatch = url.match(/\/problems\/([^/]+)\/submit\/?/);
    let problemSlug = null;
    if (problemMatch) {
      problemSlug = problemMatch[1];
      console.log("🧠 Submitting problem:", problemSlug);
    }

    const response = await originalFetch.apply(this, args);
    const responseClone = response.clone();

    // ✅ Intercept /check/ or /submissions/detail/ responses
    if (url.includes("/check/") || url.includes("/submissions/detail/")) {
      responseClone.text().then(bodyText => {
        try {
          const parsed = JSON.parse(bodyText);
          // 🚫 Ignore "PENDING" state
          if (parsed.state !== "PENDING") {
            console.log("📦 [Fetch Response Body]:", bodyText);

            const data = {
              name: problemSlug,
              status_code: parsed.status_code,
              run_success: parsed.run_success,
              status_msg: parsed.status_msg,
            };

            chrome.storage.local.get(["access_token", "refresh_token"], function (result) {
              const accessToken = result.access_token;
              const refreshToken = result.refresh_token;

              // ❌ Scenario: Both tokens missing
              if (!refreshToken) {
                alert("Kindly login into your extension!!");
                return;
              }

              const sendData = (token) => {
                fetch("<private api for logging the data>", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify(data)
                })
                .then(res => {
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                  }
                  return res.json();
                })
                .then(response => {
                  console.log("✅ Data logged to backend:", response);
                })
                .catch(err => {
                  console.error("❌ Error logging data to backend:", err);
                  // ✅ If data logging fails due to token issues, try refresh
                  if (err.message.includes('401') || err.message.includes('403')) {
                    console.log("🔄 Token might be invalid, attempting refresh...");
                    refreshAndRetry();
                  }
                });
              };

              const refreshAndRetry = () => {
                console.log("🔄 Attempting to refresh access token...");
                fetch("<private api>", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${refreshToken}`,
                    "Content-Type": "application/json"
                  }
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Refresh failed: HTTP ${response.status}`);
                  }
                  return response.json();
                })
                .then(tokenData => {
                  if (tokenData.access_token) {
                    const newAccessToken = tokenData.access_token;
                    chrome.storage.local.set({ access_token: newAccessToken }, () => {
                      console.log("🔐 Refreshed access token stored.");
                      sendData(newAccessToken);
                    });
                  } else {
                    throw new Error("No access token in refresh response");
                  }
                })
                .catch(err => {
                  console.error("❌ Refresh token failed:", err);
                  // ✅ Refresh token is invalid/expired - force re-login
                  chrome.storage.local.remove(["access_token", "refresh_token"], () => {
                    alert("Session expired. Please login again.");
                  });
                });
              };

              // ✅ Scenario: Access token missing - try refresh
              if (!accessToken) {
                console.log("🔄 No access token found, refreshing...");
                refreshAndRetry();
              } else {
                // ✅ Scenario: Access token present - try using it first
                // If it fails, sendData will catch the error and call refreshAndRetry
                sendData(accessToken);
              }
            });
          }
        } catch (e) {
          console.log("📦 [Fetch Response Body - Unparsable]:", bodyText);
        }
      });
    }

    return response;
  };
})();