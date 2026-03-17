/**
 * Script to set up all required database tables and triggers
 * Usage: node src/scripts/setupDatabase.js
 */
import platformClient from './platformClient.js';
import fs from 'fs';
import path from 'path';

// Define the list of scripts to run
const scriptsToRun = [
  'setupPropertyUnitsTrigger.sql',
  'createTimestampTriggers.sql',
  'createNotificationsTable.sql',
  // Add more scripts as needed
];

// Function to check if a table exists
async function checkTableExists(tableName) {
  try {
    // Query the information_schema to check if table exists
    const { data, error } = await platformClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');
    
    if (error) {
      throw error;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

// Function to execute SQL scripts
async function executeScript(scriptName) {
  try {
    // Read the script from the filesystem
    const scriptPath = path.join(__dirname, scriptName);
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    console.log(`Executing script: ${scriptName}`);
    
    // Execute the script using the exec_sql RPC function
    const { data, error } = await platformClient
      .rpc('exec_sql', { sql: scriptContent });
    
    if (error) {
      throw error;
    }
    
    console.log(`Successfully executed script: ${scriptName}`);
    return true;
  } catch (error) {
    console.error(`Error executing script ${scriptName}:`, error.message);
    return false;
  }
}

// Main function to run all setup scripts
async function setupDatabase() {
  console.log('Starting database setup...');
  
  // Check if the exec_sql function exists
  try {
    const { data, error } = await platformClient.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error && error.message.includes('function "exec_sql" does not exist')) {
      console.error('The exec_sql RPC function does not exist.');
      console.error('Please run the enableExecSql.sql script in your database SQL editor first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking for exec_sql function:', error.message);
    process.exit(1);
  }
  
  // Execute all scripts
  for (const script of scriptsToRun) {
    const success = await executeScript(script);
    if (!success) {
      console.error(`Failed to execute script: ${script}`);
      console.error('Database setup incomplete. Please check the errors above.');
      process.exit(1);
    }
  }
  
  console.log('Database setup completed successfully!');
}

// Run the setup
setupDatabase()
  .catch(error => {
    console.error('Unexpected error during setup:', error);
    process.exit(1);
  }); 