// 404 Redirect Handler
const currentPath = window.location.pathname;
const shopDomain = document.location.host;

async function handle404() {
  try {
    const response = await fetch(`/apps/404-redirect/api/redirect?path=${encodeURIComponent(currentPath)}`, {
      headers: {
        'X-Shop-Domain': shopDomain,
        'X-Original-Path': currentPath,
        'X-Referrer': document.referrer,
        'X-User-Agent': navigator.userAgent
      }
    });

    const data = await response.json();
    
    if (data.redirect) {
      window.location.href = data.redirectUrl;
    }
  } catch (error) {
    console.error('Error handling 404:', error);
  }
}

console.log("currentPath", currentPath);
console.log("handle404");
handle404();
