chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const match = details.url.match(/submissions\/detail\/(\d+)\/check\//);
    if (match && match[1]) {
      const problemId = match[1];
      console.log(`[✔] Problem ID: ${problemId}`);
    }
  },
  {
    urls: ["https://leetcode.com/submissions/detail/*/check/"]
  }
);
