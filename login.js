//alert("login.js loaded");

document.addEventListener('DOMContentLoaded', function () {
  //alert("DOM fully loaded");

  const loginBtn = document.getElementById('Login');

  if (!loginBtn) {
    alert("❌ Login button not found!");
    return;
  }

  loginBtn.addEventListener('click', function () {
    //alert("Login button clicked");

    const clientId = "152003933117-im7i06n5u0b34moj5dughb80avfv57m3.apps.googleusercontent.com";
    const redirectUri = chrome.identity.getRedirectURL();
    //alert("Redirect URI: " + redirectUri);

    const scope = "openid email profile";

    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}` +
      `&response_type=id_token token` +  // ✅ returns both access_token and id_token
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&nonce=random_nonce`;  // required when using id_token

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      function (redirectUrl) {
        if (chrome.runtime.lastError) {
          alert("❌ Authentication failed: " + chrome.runtime.lastError.message);
          return;
        }

        //alert("✅ Redirect URL received");
        //alert(redirectUrl);

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

        //alert("✅ Access token:\n" + accessToken);
        //alert("✅ ID token:\n" + idToken);

        // 🔁 Exchange ID token with backend
        fetch("http://localhost:8080/getToken", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`, // ✅ Send the ID token
            "Content-Type": "application/json"
          }
        })
        .then(response => response.json())
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
