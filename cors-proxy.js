// CORS Proxy Server
import corsAnywhere from 'cors-anywhere';

// Configure the proxy server
const host = 'localhost';
const port = 9090;

console.log('Starting CORS proxy server...');

// Create and start the proxy server
corsAnywhere.createServer({
  originWhitelist: [], // Allow all origins
  removeHeaders: ['cookie', 'cookie2'],
  
  // Add URL rewriting to handle protocol and domain
  rewriteHeaders: (headers, req) => {
    // Log headers before processing
    console.log(`[CORS Proxy] Request to: ${req.url}`);
    
    // Remove any existing host header
    delete headers.host;
    
    // Ensure we preserve important headers for storage uploads
    if (req.url.includes('/storage/v1/object') && req.method === 'POST') {
      console.log('[CORS Proxy] Storage upload detected - preserving headers');
      
      // Don't modify content-type for storage uploads
      if (headers['content-type']) {
        console.log(`[CORS Proxy] Preserving Content-Type: ${headers['content-type']}`);
      }
    }
    
    return headers;
  },
  
  // Add URL rewriting to handle protocol and domain
  rewriteUrl: (url) => {
    try {
      // Handle Supabase URLs specifically
      if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        // Keep the full path including /rest/v1/...
        const rewritten = urlObj.pathname + urlObj.search;
        if (url.includes('/storage/v1/')) {
          console.log(`[CORS Proxy] Storage URL rewrite: ${url} -> ${rewritten}`);
        }
        return rewritten;
      }
      // For other URLs, just return the pathname
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch (e) {
      console.error('Error rewriting URL:', e);
      return url;
    }
  },
  
  // Handle binary content for uploads properly
  processRequestBody: (req, res) => {
    // Check if this is a storage API request
    if (req.url.includes('/storage/v1/object/') && (req.method === 'POST' || req.method === 'PUT')) {
      console.log(`[CORS Proxy] Storage ${req.method} request: ${req.url}`);
      console.log(`[CORS Proxy] Content-Type: ${req.headers['content-type']}`);
      
      // Skip processing for application/pdf, images, etc.
      if (req.headers['content-type'] && 
          (req.headers['content-type'].includes('application/pdf') ||
           req.headers['content-type'].includes('image/') ||
           req.headers['content-type'].includes('multipart/form-data'))) {
        console.log('[CORS Proxy] Binary content detected - preserving original body');
        return true; // Return true to preserve the original request body
      }
    }
    
    // Use default handling for all other requests
    return false;
  }
}).listen(port, host, function() {
  console.log('CORS Anywhere proxy server running on ' + host + ':' + port);
  console.log('To use: prefix your Supabase URL with http://localhost:9090/');
}); 