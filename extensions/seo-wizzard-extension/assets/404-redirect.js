// 404 Redirect Handler
const currentPath = window.location.pathname;
const shopDomain = document.location.host;

const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

function checkCache(path) {
  try {
    const cached = localStorage.getItem(`redirect_${shopDomain}_${path}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
      // Clear expired cache
      localStorage.removeItem(`redirect_${shopDomain}_${path}`);
    }
  } catch (error) {
    console.error('Cache error:', error);
  }
  return null;
}

async function handle404() {
  try {
    // Check cache first
    const cachedData = checkCache(currentPath);
    if (cachedData?.redirect) {
      window.location.href = cachedData.redirectUrl;
      return;
    }

    const response = await fetch(`/apps/404-redirect/api/redirect?path=${encodeURIComponent(currentPath)}`, {
      headers: {
        'X-Shop-Domain': shopDomain,
        'X-Original-Path': currentPath,
        'X-Referrer': document.referrer,
        'X-User-Agent': navigator.userAgent
      }
    });

    const data = await response.json();
    
    // Only cache successful redirects
    if (data.redirect) {
      try {
        localStorage.setItem(`redirect_${shopDomain}_${currentPath}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Cache storage error:', error);
      }
      window.location.href = data.redirectUrl;
    }
  } catch (error) {
    console.error('Error handling 404:', error);
  }
}

handle404();
