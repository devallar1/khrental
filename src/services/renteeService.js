import { platform as platformClient } from './platformClient';
import { fetchAppUsers } from './appUserService';

const normalizePropertyIds = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

/**
 * Get all rentees associated with a property
 * This uses the database function that checks both associated_property_ids
 * and also looks at agreements to find rentees with active/pending agreements
 * 
 * @param {string} propertyId - The property ID to find rentees for
 * @returns {Promise<{data: Array, error: Error}>} - Rentees data or error
 */
export const getRenteesByProperty = async (propertyId) => {
  if (!propertyId) {
    console.error('Property ID is required');
    return { data: null, error: new Error('Property ID is required') };
  }

  try {
    console.log('Fetching rentees for property:', propertyId);
    
    // First try using the RPC function
    const { data, error } = await platformClient.rpc(
      'get_rentees_by_property',
      { property_id: propertyId }
    );
    
    if (error) {
      console.error('Error fetching rentees by property using RPC:', error);
      
      // Fallback to direct query if RPC fails (might not be deployed yet)
      let fallbackData = [];

      try {
        const rentees = await fetchAppUsers('rentee');
        fallbackData = rentees.filter((rentee) => {
          const associatedPropertyIds = normalizePropertyIds(
            rentee.associated_property_ids || rentee.associatedPropertyIds
          );

          return associatedPropertyIds.includes(propertyId);
        });
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return { data: null, error: fallbackError };
      }
      
      console.log(`Found ${fallbackData?.length || 0} rentees using fallback query`);
      return { data: fallbackData || [], error: null };
    }
    
    console.log(`Found ${data?.length || 0} rentees for property ${propertyId}`);
    return { data, error };
  } catch (error) {
    console.error('Exception getting rentees by property:', error);
    return { data: null, error };
  }
}

/**
 * Get all rentees associated with a specific unit
 * 
 * @param {string} unitId - The unit ID to find rentees for
 * @returns {Promise<{data: Array, error: Error}>} - Rentees data or error
 */
export const getRenteesByUnit = async (unitId) => {
  if (!unitId) {
    console.error('Unit ID is required');
    return { data: null, error: new Error('Unit ID is required') };
  }

  try {
    console.log('Fetching rentees for unit:', unitId);
    
    // First try using the RPC function
    const { data, error } = await platformClient.rpc(
      'get_rentees_by_unit',
      { unit_id: unitId }
    );
    
    if (error) {
      console.error('Error fetching rentees by unit using RPC:', error);
      
      // Fallback to direct agreement query
      const { data: agreementsData, error: agreementsError } = await platformClient
        .from('agreements')
        .select('renteeid')
        .eq('unitid', unitId)
        .in('status', ['active', 'pending', 'review', 'signed']);
        
      if (agreementsError) {
        console.error('Agreements fallback query failed:', agreementsError);
        return { data: null, error: agreementsError };
      }
      
      if (agreementsData?.length > 0) {
        const renteeIds = agreementsData.map(a => a.renteeid);
        let renteesData = [];

        try {
          const rentees = await fetchAppUsers('rentee');
          const renteeIdSet = new Set(renteeIds);
          renteesData = rentees.filter((rentee) => renteeIdSet.has(rentee.id));
        } catch (renteesError) {
          console.error('Rentees fallback query failed:', renteesError);
          return { data: null, error: renteesError };
        }
        
        console.log(`Found ${renteesData?.length || 0} rentees using fallback agreement query`);
        return { data: renteesData || [], error: null };
      }
      
      return { data: [], error: null };
    }
    
    console.log(`Found ${data?.length || 0} rentees for unit ${unitId}`);
    return { data, error };
  } catch (error) {
    console.error('Exception getting rentees by unit:', error);
    return { data: null, error };
  }
}

/**
 * Get agreements for a rentee and property
 * 
 * @param {string} renteeId - The rentee ID
 * @param {string} propertyId - The property ID
 * @param {string} [unitId] - Optional unit ID to further filter
 * @returns {Promise<{data: Array, error: Error}>} - Agreements data or error
 */
export const getRenteePropertyAgreements = async (renteeId, propertyId, unitId = null) => {
  if (!renteeId || !propertyId) {
    console.error('Both rentee ID and property ID are required');
    return { data: null, error: new Error('Both rentee ID and property ID are required') };
  }

  try {
    let query = platformClient
      .from('agreements')
      .select('*')
      .eq('renteeid', renteeId)
      .eq('propertyid', propertyId);
    
    // Add unit filter if provided
    if (unitId) {
      query = query.eq('unitid', unitId);
    }
    
    const { data, error } = await query.order('createdat', { ascending: false });
      
    if (error) {
      console.error('Error fetching agreements:', error);
      return { data: null, error };
    }
    
    return { data, error };
  } catch (error) {
    console.error('Exception getting agreements:', error);
    return { data: null, error };
  }
}

export default {
  getRenteesByProperty,
  getRenteesByUnit,
  getRenteePropertyAgreements
}; 