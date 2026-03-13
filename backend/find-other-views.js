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

async function main() {
    const pool = await mssql.connect(dbConfig);

    // PUB_V진료비내역 컬럼 확인
    const fee = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'PUB_V진료비내역'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('=== PUB_V진료비내역 컬럼 ===');
    fee.recordset.forEach(r => console.log(r.COLUMN_NAME));

    // PUB_V직원정보 컬럼 확인
    const staff = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'PUB_V직원정보'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('\n=== PUB_V직원정보 컬럼 ===');
    staff.recordset.forEach(r => console.log(r.COLUMN_NAME));

    // PUB_V예약정보 컬럼 확인
    const appt = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'PUB_V예약정보'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('\n=== PUB_V예약정보 컬럼 ===');
    appt.recordset.forEach(r => console.log(r.COLUMN_NAME));

    await mssql.close();
}
main().catch(console.error);
