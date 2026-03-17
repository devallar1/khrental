import platformClient from './platformClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createExecSqlFunction() {
  try {
    const sql = `
      -- Create the exec_sql function
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
    `;

    // Execute the SQL
    const { error } = await platformClient.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error creating exec_sql function:', error);
      process.exit(1);
    }

    console.log('exec_sql function created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createExecSqlFunction(); 