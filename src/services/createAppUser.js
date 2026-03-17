import { createAppUserRecord } from './appUserRepository';

/**
 * Create a new app user (staff or rentee) without sending welcome emails
 * This is a simplified version that doesn't trigger failed email notifications
 * 
 * @param {Object} userData - User data
 * @param {string} userType - 'staff' or 'rentee'
 * @returns {Promise<Object>} - Result of the creation
 */
export const createAppUser = async (userData, userType) => {
  return createAppUserRecord(userData, userType);
}; 