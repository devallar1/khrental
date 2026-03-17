// Example environment configuration
// Copy to env-config.js and add your real values
window._env_ = {
  VITE_EVIA_SIGN_CLIENT_ID: '', // Add your Evia Sign client ID
  VITE_API_ENDPOINT: '', // Add your API endpoint URL
  VITE_USE_MSSQL_API: 'true', // Enable the MSSQL API layer
  VITE_EMAIL_FROM: '', // Add sender email address
  VITE_EMAIL_FROM_NAME: '', // Add sender name
  VITE_APP_BASE_URL: '', // Base URL for the application
};

// Debug function to verify environment variables are loaded correctly
(function() {
  console.log("Environment Variables Loaded:", {
    VITE_EVIA_SIGN_CLIENT_ID: window._env_.VITE_EVIA_SIGN_CLIENT_ID ? "Present" : "Missing",
    VITE_USE_MSSQL_API: window._env_.VITE_USE_MSSQL_API,
    VITE_EMAIL_FROM: window._env_.VITE_EMAIL_FROM
  });
  
  // Log the fixed URL configuration for debugging
  console.log("Fixed URL environment variables:", {
    VITE_API_ENDPOINT: window._env_.VITE_API_ENDPOINT,
    VITE_APP_BASE_URL: window._env_.VITE_APP_BASE_URL
  });
})(); 