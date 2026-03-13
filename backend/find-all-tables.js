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

    // 접근 가능한 모든 테이블/뷰 목록
    const all = await pool.request().query(`
        SELECT TABLE_TYPE, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        ORDER BY TABLE_TYPE, TABLE_NAME
    `);
    console.log('=== 전체 테이블/뷰 목록 ===');
    all.recordset.forEach(r => console.log(`[${r.TABLE_TYPE}] ${r.TABLE_NAME}`));

    // 소개/경로 관련 컬럼 영문명 포함 전체 검색
    const cols = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE COLUMN_NAME LIKE N'%intro%'
           OR COLUMN_NAME LIKE N'%refer%'
           OR COLUMN_NAME LIKE N'%route%'
           OR COLUMN_NAME LIKE N'%channel%'
           OR COLUMN_NAME LIKE N'%source%'
           OR COLUMN_NAME LIKE N'%visit%'
    `);
    console.log('\n=== 소개/경로 영문 컬럼 ===');
    cols.recordset.forEach(r => console.log(`[${r.TABLE_NAME}] ${r.COLUMN_NAME}`));

    await mssql.close();
}
main().catch(console.error);
