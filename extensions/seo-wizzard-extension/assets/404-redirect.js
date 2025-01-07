// 404 Redirect Handler
const currentPath = window.location.pathname;
const shopDomain = document.location.host;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

async function handle404() {
  try {
    // Check and validate cache
    const cacheKey = `redirect_${shopDomain}_${currentPath}`;
    const cachedRedirect = localStorage.getItem(cacheKey);
    
    if (cachedRedirect) {
      try {
        const { redirectUrl, timestamp } = JSON.parse(cachedRedirect);
        const cacheAge = Date.now() - timestamp;
        
        if (cacheAge < CACHE_TTL) {
          console.log('Using cached redirect');
          window.location.replace(redirectUrl);
          return;
        }
        // Clean up expired cache entry
        localStorage.removeItem(cacheKey);
      } catch (e) {
        // Clean up invalid cache entry
        localStorage.removeItem(cacheKey);
      }
    }

    // If no valid cache, make API call
    const response = await fetch(`/apps/404-redirect/api/redirect?path=${encodeURIComponent(currentPath)}`, {
      headers: {
        'X-Shop-Domain': shopDomain,
        'X-Original-Path': currentPath,
        'X-Referrer': document.referrer,
        'X-User-Agent': navigator.userAgent
      }
    });

    const data = await response.json();
    if (data && data.redirect && data.redirectUrl) {
      localStorage.setItem(cacheKey, JSON.stringify({
        redirectUrl: data.redirectUrl,
        timestamp: Date.now()
      }));
      window.location.replace(data.redirectUrl);
    }
  } catch (error) {
    console.error('Error handling 404:', error);
  }
}

handle404();
