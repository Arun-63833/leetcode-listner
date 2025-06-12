(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const url = args[0];

    // ✅ Extract and log the problem slug if URL matches /problems/*/submit/
    const problemMatch = url.match(/\/problems\/([^/]+)\/submit\/?/);
    if (problemMatch) {
      const problemSlug = problemMatch[1];
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
          }
        } catch (e) {
          console.log("📦 [Fetch Response Body - Unparsable]:", bodyText);
        }
      });
    }

    return response;
  };
})();
