(function () {
  const originalFetch = window.fetch;
  let lastSubmittedProblemSlug = null;

  window.fetch = async function (...args) {
    const url = args[0];
    const problemMatch = url.match(/\/problems\/([^/]+)\/submit\/?/);
    if (problemMatch) {
      lastSubmittedProblemSlug = problemMatch[1];
      localStorage.setItem('lastProblemSlug', lastSubmittedProblemSlug);
    }

    const response = await originalFetch.apply(this, args);
    const responseClone = response.clone();

    if (url.includes("/check/") || url.includes("/submissions/detail/")) {
      responseClone.text().then((bodyText) => {
        try {
          const parsed = JSON.parse(bodyText);

          const nonFinalStates = ["PENDING", "STARTED", "STARTING"];
          if (nonFinalStates.includes(parsed.state)) return;

          const fallbackSlug = location.pathname.match(/\/problems\/([^/]+)\//)?.[1];
          const problemSlug = lastSubmittedProblemSlug || localStorage.getItem('lastProblemSlug') || fallbackSlug;

          const data = {
            name: problemSlug,
            status_code: parsed.status_code ?? 0,
            run_success: parsed.run_success ?? false,
            status_msg: parsed.status_msg ?? "Unknown",
          };

          window.postMessage({ type: "GET_TOKENS", payload: data }, "*");

          const tokenHandler = (event) => {
            if (event.source !== window) return;
            if (event.data.type !== "TOKENS_RETURNED") return;

            const { access_token, refresh_token } = event.data;

            if (!refresh_token) {
              cleanup();
              return;
            }

            const sendData = (token) => {
              fetch("https://notifyme-e7b21.df.r.appspot.com/notify", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
              })
                .then((res) => {
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                  }
                  return res.json();
                })
                .then(() => cleanup())
                .catch((err) => {
                  console.error("❌ Send failed:", err.message);
                  if (err.message.includes("401") || err.message.includes("403")) {
                    refreshAccess();
                  } else {
                    cleanup();
                  }
                });
            };

            const refreshAccess = () => {
              fetch("https://notifyme-e7b21.df.r.appspot.com/getAccess", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${refresh_token}`,
                  "Content-Type": "application/json",
                },
              })
                .then((res) => {
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                  }
                  return res.json();
                })
                .then((json) => {
                  if (json.access_token) {
                    sendData(json.access_token);
                  } else {
                    cleanup();
                  }
                })
                .catch((err) => {
                  console.error("❌ Token refresh failed:", err.message);
                  cleanup();
                });
            };

            if (access_token) {
              sendData(access_token);
            } else {
              refreshAccess();
            }

            window.removeEventListener("message", tokenHandler);
          };

          const cleanup = () => {
            window.removeEventListener("message", tokenHandler);
          };

          window.addEventListener("message", tokenHandler);
        } catch (e) {
          console.warn("📦 Unparsable response:", bodyText);
        }
      });
    }

    return response;
  };
})();
