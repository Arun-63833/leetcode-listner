document.addEventListener('DOMContentLoaded', function () {
  const loginBtn = document.getElementById('Login');

  if (!loginBtn) {
    alert("❌ Login button not found!");
    return;
  }

  loginBtn.addEventListener('click', function () {
    const clientId = "152003933117-im7i06n5u0b34moj5dughb80avfv57m3.apps.googleusercontent.com";
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = "openid email profile";
    const nonce = crypto.randomUUID(); // Secure, unique nonce

    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}` +
      `&response_type=id_token token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&nonce=${nonce}`;

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      function (redirectUrl) {
        if (chrome.runtime.lastError) {
          alert("❌ Authentication failed: " + chrome.runtime.lastError.message);
          return;
        }

        const hash = new URL(redirectUrl).hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const idToken = params.get("id_token");

        if (!accessToken) {
          alert("❌ Access token not found.");
          return;
        }

        if (!idToken) {
          alert("❌ ID token not found.");
          return;
        }

        // Exchange ID token with your backend
        fetch("https://notifyme-e7b21.df.r.appspot.com/getToken", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json"
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          const appAccessToken = data.access_token;
          const refreshToken = data.refresh_token;

          chrome.storage.local.set({
            access_token: appAccessToken,
            refresh_token: refreshToken
          }, () => {
            alert("✅ Logged In Successfully");
          });
        })
        .catch(err => {
          alert("❌ Failed to get tokens from backend.");
          alert(err.message || err);
        });
      }
    );
  });
});
