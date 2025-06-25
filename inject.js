(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const url = args[0];
    const problemMatch = url.match(/\/problems\/([^/]+)\/submit\/?/);
    const problemSlug = problemMatch ? problemMatch[1] : null;

    //if (problemSlug) alert("🧠 Submitting problem: " + problemSlug);

    const response = await originalFetch.apply(this, args);
    const responseClone = response.clone();

    if (url.includes("/check/") || url.includes("/submissions/detail/")) {
      responseClone.text().then((bodyText) => {
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed.state === "PENDING") return;

          //alert("📦 Parsed response: " + bodyText);

          const data = {
            name: problemSlug,
            status_code: parsed.status_code,
            run_success: parsed.run_success,
            status_msg: parsed.status_msg,
          };

          // 🔁 Ask content.js to return tokens
          window.postMessage({ type: "GET_TOKENS", payload: data }, "*");

          const tokenHandler = (event) => {
            if (event.source !== window) return;
            if (event.data.type !== "TOKENS_RETURNED") return;

            const { access_token, refresh_token } = event.data;

            if (!refresh_token) {
              alert("❌ Please login first.");
              return;
            }

            const sendData = (token) => {
              fetch("http://localhost:8080/notify", {
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
                .then((json) => {
                  alert("✅ Sent to backend: " + JSON.stringify(json));
                })
                .catch((err) => {
                  alert("❌ Send failed: " + err.message);
                  if (err.message.includes("401") || err.message.includes("403")) {
                    refreshAccess();
                  }
                });
            };

            const refreshAccess = () => {
              fetch("http://localhost:8080/getAccess", {
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
                    alert("🔄 Token refreshed");
                    sendData(json.access_token);
                  } else {
                    alert("❌ Refresh failed");
                  }
                })
                .catch((err) => {
                  alert("❌ Token refresh failed: " + err.message);
                });
            };

            if (access_token) sendData(access_token);
            else refreshAccess();

            window.removeEventListener("message", tokenHandler);
          };

          window.addEventListener("message", tokenHandler);
        } catch (e) {
          alert("📦 Unparsable: " + bodyText);
        }
      });
    }

    return response;
  };
})();

