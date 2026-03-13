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
async function listColumns() {
    try {
        let pool = await mssql.connect(dbConfig);
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PUB_V환자정보'");
        console.log('Columns in PUB_V환자정보:');
        result.recordset.forEach(row => console.log(row.COLUMN_NAME));
    } catch (err) { console.error(err.message); } finally { await mssql.close(); }
}
listColumns();
