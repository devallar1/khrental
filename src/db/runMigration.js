import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { platformClient } from '../services/platformClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to run a migration file
async function runMigration(filePath) {
  try {
    console.log(`Running migration: ${filePath}`);
    
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL against the platform API
    const { error } = await platformClient.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error running migration:', error);
      return false;
    }
    
    console.log(`Migration ${filePath} completed successfully`);
    return true;
  } catch (error) {
    console.error('Error running migration:', error);
    return false;
  }
}

// Function to run all migrations in a directory
async function runAllMigrations(directory) {
  try {
    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`Found ${files.length} migration files`);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const success = await runMigration(filePath);
      
      if (!success) {
        console.error(`Failed to run migration: ${file}`);
        process.exit(1);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations from the migrations directory or from a provided directory.
const targetDirectory = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(__dirname, 'migrations');

runAllMigrations(targetDirectory); 