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

    // 내원경로, 소개 관련 컬럼이 있는 테이블/뷰 검색
    const cols = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE COLUMN_NAME LIKE '%내원%'
           OR COLUMN_NAME LIKE '%소개%'
           OR COLUMN_NAME LIKE '%경로%'
           OR COLUMN_NAME LIKE '%refer%'
        ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    console.log('=== 내원경로/소개 관련 컬럼 ===');
    cols.recordset.forEach(r => console.log(`[${r.TABLE_NAME}] ${r.COLUMN_NAME}`));

    // PUB_로 시작하는 모든 뷰 목록
    const views = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME LIKE 'PUB_%'
        ORDER BY TABLE_NAME
    `);
    console.log('\n=== PUB_ 뷰 목록 ===');
    views.recordset.forEach(r => console.log(r.TABLE_NAME));

    await mssql.close();
}
main().catch(console.error);
