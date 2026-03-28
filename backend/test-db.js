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

async function testConnection() {
    try {
        console.log('Connecting to:', dbConfig.server);
        await mssql.connect(dbConfig);
        console.log('Connected successfully!');
        const result = await mssql.query`SELECT TOP 1 sz이름 FROM PUB_V환자정보`;
        console.log('Query result:', result.recordset);
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
