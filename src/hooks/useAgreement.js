/**
 * Agreement Hook
 * Provides reusable logic for handling agreement data
 */
import { useState, useEffect } from 'react';
import { platform as platformClient } from '../services/platformClient';
import { toast } from 'react-toastify';
import { getApiBaseUrl, isMssqlApiEnabled } from '../utils/env';

/**
 * Hook for loading and managing agreement data
 * @param {string} agreementId - ID of the agreement to load
 * @returns {Object} Agreement data and status
 */
export const useAgreement = (agreementId) => {
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAgreementFromMssql = async () => {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/mssql/agreements/${agreementId}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Agreement API request failed with status ${response.status}`);
    }

    const payload = await response.json();
    return payload.data || null;
  };

  // Load agreement data
  useEffect(() => {
    if (!agreementId) {
      return;
    }
    
    const fetchAgreement = async () => {
      try {
        setLoading(true);
        setError(null);

        if (isMssqlApiEnabled()) {
          try {
            const data = await fetchAgreementFromMssql();
            setAgreement(data);
            return;
          } catch (mssqlError) {
            console.error('Error loading agreement from MSSQL, falling back to the local compatibility layer:', mssqlError);
            toast.error('Failed to load agreement from MSSQL. Using the local compatibility layer instead.');
          }
        }
        
        const { data, error } = await platformClient
          .from('agreements')
          .select(`
            *,
            property:properties(*),
            unit:property_units(*),
            rentee:app_users(*)
          `)
          .eq('id', agreementId)
          .single();
          
        if (error) {
          throw error;
        }
        
        setAgreement(data);
      } catch (err) {
        console.error('Error loading agreement:', err);
        setError(err.message);
        toast.error('Failed to load agreement');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgreement();
  }, [agreementId]);
  
  // More functions could be added here
  
  return {
    agreement,
    loading,
    error,
    setAgreement
  };
};

export default useAgreement; 