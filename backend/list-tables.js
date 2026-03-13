const mssql = require('mssql');
require('dotenv').config();
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: { encrypt: false, trustServerCertificate: true }
};
async function listAllTables() {
    try {
        let pool = await mssql.connect(dbConfig);
        const result = await pool.request().query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES');
        console.log('Tables in database:');
        result.recordset.forEach(row => console.log(row.TABLE_NAME));
    } catch (err) { console.error(err.message); } finally { await mssql.close(); }
}
listAllTables();
