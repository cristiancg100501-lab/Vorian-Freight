import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const { Client } = require('pg');
    // Using port 6543 pooler with pg package usually works if we don't have the protocol bug from pg-protocol. 
    // Wait, the error before was ENOTFOUND tenant/user postgres.xstozcnyhuzguxkndnjb. 
    // Supabase says use postgres://[db-user]:[db-password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
    const client = new Client({
      connectionString: "postgres://postgres.xstozcnyhuzguxkndnjb:rXwI4vjY0a2W8wH1@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    const sqlPath = path.join(process.cwd(), 'database_scripts', 'CREATE_DRIVER_LOCATION_LOGS.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    await client.end();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
