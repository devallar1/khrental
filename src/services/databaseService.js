import { platform as platformClient } from './platformClient';

/**
 * Fetch data from a table with optional filters
 * @param {string} table - The table name to fetch from
 * @param {Array|Object} [filters=[]] - Optional filters as array of {column, operator, value} objects or key-value object
 * @param {string|Array} [columns='*'] - Columns to fetch, defaults to all
 * @param {Object} [options={}] - Additional options like limit, offset, order
 * @returns {Promise<Array>} - The fetched data
 */
export const fetchData = async (table, filters = {}, columns = '*', options = {}) => {
  try {
    let query = platformClient.from(table).select(columns);

    // Apply any filters
    if (Array.isArray(filters)) {
      filters.forEach((filter) => {
        query = query.eq(filter.column, filter.value);
      });
    } else if (typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply additional options
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }
    if (options.order) {
      query = query.order(options.order);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching data from ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Insert data into a table
 * @param {string} table - The table name to insert into
 * @param {Object} data - The data to insert
 * @returns {Promise<{data: Object, error: Error}>}
 */
export const insertData = async (table, data) => {
  try {
    const { data: result, error } = await platformClient
      .from(table)
      .insert([data])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return { data: result, error: null };
  } catch (error) {
    console.error(`Error inserting data into ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Delete data from a table
 * @param {string} table - The table name to delete from
 * @param {Object} filters - Filters to identify the records to delete
 * @returns {Promise<{success: boolean, error: Error}>}
 */
export const deleteData = async (table, filters) => {
  try {
    let query = platformClient.from(table).delete();

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { error } = await query;
    if (error) {
      throw error;
    }
    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting data from ${table}:`, error);
    return { success: false, error };
  }
};

/**
 * Update data in a table
 * @param {string} table - The table name to update
 * @param {Object} filters - Filters to identify the records to update
 * @param {Object} data - The data to update
 * @returns {Promise<{data: Object, error: Error}>}
 */
export const updateData = async (table, filters, data) => {
  try {
    let query = platformClient.from(table).update(data);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select().single();
    if (error) {
      throw error;
    }
    return { data: result, error: null };
  } catch (error) {
    console.error(`Error updating data in ${table}:`, error);
    return { data: null, error };
  }
};