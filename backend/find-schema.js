const mssql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function findTables() {
    try {
        let pool = await mssql.connect(dbConfig);
        console.log('Connected to SQL Server. Searching for patient-related tables...');

        const result = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%PATIENT%' OR TABLE_NAME LIKE '%PNT%' OR TABLE_NAME LIKE '%CHART%'
        `);

        console.log('Found tables:');
        result.recordset.forEach(row => console.log(` - ${row.TABLE_NAME}`));

        if (result.recordset.length > 0) {
            const firstTable = result.recordset[0].TABLE_NAME;
            console.log(`\nQuerying columns for ${firstTable}...`);
            const columns = await pool.request().query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${firstTable}'
            `);
            columns.recordset.forEach(row => console.log(`   - ${row.COLUMN_NAME}`));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mssql.close();
    }
}

findTables();
