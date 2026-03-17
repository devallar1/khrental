import React, { useEffect, useState } from 'react';

const EnvVarStatus = () => {
  const [envStatus, setEnvStatus] = useState({
    publicEnv: {
      clientId: null,
      apiEndpoint: null,
      appBaseUrl: null
    }
  });

  useEffect(() => {
    const runtimeEnv = typeof window !== 'undefined' ? window._env_ || {} : {};

    setEnvStatus({
      publicEnv: {
        clientId: (runtimeEnv.VITE_EVIA_SIGN_CLIENT_ID || import.meta.env.VITE_EVIA_SIGN_CLIENT_ID) ? '✅ Set' : '❌ Not set',
        apiEndpoint: (runtimeEnv.VITE_API_ENDPOINT || import.meta.env.VITE_API_ENDPOINT) ? '✅ Set' : '⚪ Default origin',
        appBaseUrl: (runtimeEnv.VITE_APP_BASE_URL || import.meta.env.VITE_APP_BASE_URL) ? '✅ Set' : '⚪ Fallback in use'
      }
    });
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-3">Environment Variables Status</h2>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <h3 className="font-medium mb-2">Public browser configuration</h3>
          <ul className="space-y-1">
            <li>VITE_EVIA_SIGN_CLIENT_ID: {envStatus.publicEnv.clientId}</li>
            <li>VITE_API_ENDPOINT: {envStatus.publicEnv.apiEndpoint}</li>
            <li>VITE_APP_BASE_URL: {envStatus.publicEnv.appBaseUrl}</li>
            <li>Server secrets: managed on the API server only</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-4 text-sm bg-gray-50 p-3 rounded">
        <p>This component shows only public browser-safe configuration.</p>
        <p className="mt-1"><strong>Note:</strong> Secrets such as SendGrid and Evia client credentials should never be exposed in the browser.</p>
      </div>
    </div>
  );
};

export default EnvVarStatus; 