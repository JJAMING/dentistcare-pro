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

    // 환자 관련 테이블 전체 검색
    const tables = await pool.request().query(`
        SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME LIKE '%환자%' OR TABLE_NAME LIKE '%PATIENT%'
        ORDER BY TABLE_TYPE, TABLE_NAME
    `);
    console.log('=== 환자 관련 테이블/뷰 전체 ===');
    tables.recordset.forEach(r => console.log(`[${r.TABLE_TYPE}] ${r.TABLE_NAME}`));

    // 소개자 или내원경로 컬럼 있는 테이블 전체 검색 (한글 포함)
    const cols2 = await pool.request().query(`
        SELECT t.TABLE_NAME, t.TABLE_TYPE, c.COLUMN_NAME 
        FROM INFORMATION_SCHEMA.TABLES t
        JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        WHERE c.COLUMN_NAME LIKE N'%路%'
           OR c.COLUMN_NAME LIKE N'%소개%'
           OR c.COLUMN_NAME LIKE N'%내원경%'
           OR c.COLUMN_NAME LIKE N'%방문%'
           OR c.COLUMN_NAME LIKE N'%경로%'
        ORDER BY t.TABLE_NAME
    `);
    console.log('\n=== 경로/소개 관련 컬럼 (전체) ===');
    if (cols2.recordset.length === 0) {
        console.log('(없음 - 다른 방식으로 검색)');
    }
    cols2.recordset.forEach(r => console.log(`[${r.TABLE_NAME}] ${r.COLUMN_NAME}`));

    // 환자 관련 첫번째 베이스 테이블 컬럼 전체 보기
    const baseTbl = tables.recordset.find(r => r.TABLE_TYPE === 'BASE TABLE');
    if (baseTbl) {
        console.log(`\n=== [${baseTbl.TABLE_NAME}] 전체 컬럼 ===`);
        const allCols = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${baseTbl.TABLE_NAME}'
            ORDER BY ORDINAL_POSITION
        `);
        allCols.recordset.forEach(r => console.log(r.COLUMN_NAME));
    }

    await mssql.close();
}
main().catch(console.error);
