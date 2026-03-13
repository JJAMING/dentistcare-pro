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

    // PUB_V환자정보 뷰의 전체 컬럼 조회
    const cols = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'PUB_V환자정보'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('=== PUB_V환자정보 columns ===');
    cols.recordset.forEach(r => console.log(r.COLUMN_NAME));

    // 샘플 데이터로 실제 값 확인
    const sample = await pool.request().query(`SELECT TOP 3 * FROM PUB_V환자정보`);
    console.log('\n=== Sample row keys ===');
    if (sample.recordset.length > 0) {
        console.log(Object.keys(sample.recordset[0]).join('\n'));
    }

    await mssql.close();
}
main().catch(console.error);
