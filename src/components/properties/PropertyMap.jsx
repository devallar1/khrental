import React, { useState, useEffect } from 'react';

const PropertyMap = ({ address, coordinates, onCoordinatesChange, readOnly = false }) => {
  const [mapUrl, setMapUrl] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localCoordinates, setLocalCoordinates] = useState(coordinates || null);

  const effectiveCoordinates = coordinates || localCoordinates;

  useEffect(() => {
    if (coordinates && coordinates.lat && coordinates.lng) {
      setLocalCoordinates(coordinates);
    }
  }, [coordinates]);

  const updateCoordinates = (nextCoordinates) => {
    setLocalCoordinates(nextCoordinates);

    if (typeof onCoordinatesChange === 'function') {
      onCoordinatesChange(nextCoordinates);
    }
  };

  // Generate map URL based on coordinates or address
  useEffect(() => {
    if (effectiveCoordinates && effectiveCoordinates.lat && effectiveCoordinates.lng) {
      // If we have coordinates, use them
      const url = `https://maps.google.com/maps?q=${effectiveCoordinates.lat},${effectiveCoordinates.lng}&z=15&output=embed`;
      setMapUrl(url);
    } else if (address) {
      // If we only have address, use that
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.google.com/maps?q=${encodedAddress}&z=15&output=embed`;
      setMapUrl(url);
    } else {
      setMapUrl('');
    }
  }, [effectiveCoordinates, address]);

  // Handle geocoding to get coordinates from address
  const handleGeocode = async () => {
    if (!address) {
      setError('Please enter a property address first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, you would use a geocoding API like Google Maps Geocoding API
      // For this example, we'll simulate a successful geocoding with random coordinates near Colombo, Sri Lanka
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate random coordinates near Colombo (6.9271° N, 79.8612° E)
      const lat = 6.9271 + (Math.random() - 0.5) * 0.1;
      const lng = 79.8612 + (Math.random() - 0.5) * 0.1;
      
      // Update coordinates
      const newCoordinates = { lat, lng };
      updateCoordinates(newCoordinates);
      
      // Update map URL
      const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      setMapUrl(url);
    } catch (error) {
      console.error('Error geocoding address:', error);
      setError('Failed to geocode address. Please try again or enter coordinates manually.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual coordinate input
  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;
    const newCoordinates = { 
      ...(effectiveCoordinates || {}), 
      [name]: parseFloat(value) || 0 
    };
    updateCoordinates(newCoordinates);
  };

  // If read-only, just display the map
  if (readOnly) {
    return (
      <div className="space-y-2">
        {mapUrl ? (
          <div className="border border-gray-300 rounded-lg overflow-hidden h-64">
            <iframe
              title="Property Location"
              src={mapUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen=""
              aria-hidden="false"
              tabIndex="0"
            ></iframe>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg flex items-center justify-center h-64 bg-gray-100">
            <p className="text-gray-500">No location information available</p>
          </div>
        )}
        
        {effectiveCoordinates && effectiveCoordinates.lat && effectiveCoordinates.lng && (
          <p className="text-sm text-gray-600">
            Coordinates: {effectiveCoordinates.lat.toFixed(6)}, {effectiveCoordinates.lng.toFixed(6)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Display */}
      {mapUrl ? (
        <div className="border border-gray-300 rounded-lg overflow-hidden h-64">
          <iframe
            title="Property Location"
            src={mapUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            allowFullScreen=""
            aria-hidden="false"
            tabIndex="0"
          ></iframe>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg flex items-center justify-center h-64 bg-gray-100">
          <p className="text-gray-500">Enter address or coordinates to display map</p>
        </div>
      )}
      
      {/* Geocode Button */}
      <div>
        <button
          type="button"
          onClick={handleGeocode}
          disabled={isLoading || !address}
          className={`px-4 py-2 rounded-md ${
            isLoading || !address
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Getting Coordinates...' : 'Get Coordinates from Address'}
        </button>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      
      {/* Manual Coordinate Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lat" className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            type="number"
            id="lat"
            name="lat"
            value={effectiveCoordinates?.lat || ''}
            onChange={handleCoordinateChange}
            step="0.000001"
            placeholder="e.g., 6.9271"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="lng" className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            type="number"
            id="lng"
            name="lng"
            value={effectiveCoordinates?.lng || ''}
            onChange={handleCoordinateChange}
            step="0.000001"
            placeholder="e.g., 79.8612"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <p className="text-sm text-gray-500">
        Note: In a production environment, this would use a proper geocoding API like Google Maps Geocoding API.
        For this demo, coordinates are simulated.
      </p>
    </div>
  );
};

export default PropertyMap; 