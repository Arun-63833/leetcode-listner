console.log("login.js loaded");

document.addEventListener('DOMContentLoaded', function () {
  console.log("DOM fully loaded");

  const loginBtn = document.getElementById('Login');

  if (!loginBtn) {
    console.error("Login button not found!");
    return;
  }

  loginBtn.addEventListener('click', function () {
    console.log("Login button clicked");

    const clientId = "152003933117-im7i06n5u0b34moj5dughb80avfv57m3.apps.googleusercontent.com";
    const redirectUri = chrome.identity.getRedirectURL();
    console.log("Redirect URI:", redirectUri);

    const scope = "openid email profile";

    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      function (redirectUrl) {
        if (chrome.runtime.lastError) {
          console.error("Authentication failed:", chrome.runtime.lastError.message);
          alert("Login failed.");
          return;
        }

        const hash = new URL(redirectUrl).hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");

        if (!accessToken) {
          console.error("Access token not found.");
          return;
        }

        // 🔁 Exchange Google access token with your backend to get your app's access + refresh tokens
        fetch("http://localhost:8080/getToken", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        })
        .then(response => response.json())
        .then(data => {
          // ✅ Store access and refresh tokens in chrome.storage.local
          const appAccessToken = data.access_token;
          const refreshToken = data.refresh_token;

          chrome.storage.local.set({
            access_token: appAccessToken,
            refresh_token: refreshToken
          }, () => {
            console.log("✅ Tokens stored successfully.");
          });
        })
        .catch(err => {
          console.error("❌ Failed to get tokens from backend:", err);
          alert("Something went wrong while logging in.");
          alert("{err.message}");
          
        });
      }
    );
  });
});
