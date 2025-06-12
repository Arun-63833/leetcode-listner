(function () {
  console.log("✅ Inject script loaded");

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    console.log("🚀 Fetch called with:", args);

    const response = await originalFetch.apply(this, args);
    const responseClone = response.clone();

    if (args[0].includes("/check/") || args[0].includes("/submissions/detail/")) {
      responseClone.text().then(bodyText => {
        console.log("📦 [Fetch Response Body]:", bodyText);
      });
    }

    return response;
  };
})();
