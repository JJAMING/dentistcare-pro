const express = require('express');
const mssql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

/**
 * sz생년월일 포맷 변환: '19900115' -> '1990-01-15'
 */
function formatBirthDate(raw) {
    if (!raw || raw.length !== 8) return raw || '';
    return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
}

/**
 * sz예약시각 '202502271430' -> '2025-02-27'
 */
function formatAppointmentDate(raw) {
    if (!raw || raw.length < 8) return '';
    return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
}

// ────────────────────────────────────────
// 1) 환자 검색 API
//    GET /api/dentweb/patients?query=홍길동
//    PUB_V환자정보에서 검색하며 생년월일 포함 반환
// ────────────────────────────────────────
app.get('/api/dentweb/patients', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query parameter is required' });

    try {
        const pool = await mssql.connect(dbConfig);
        const result = await pool.request()
            .input('q', mssql.NVarChar, `%${query}%`)
            .query(`
                SELECT TOP 20
                    n환자ID       AS patientId,
                    sz차트번호    AS chartNumber,
                    sz이름        AS name,
                    sz휴대폰번호  AS phone,
                    sz생년월일    AS birthDate,
                    CASE WHEN b성별 = 0 THEN '남' ELSE '여' END AS gender,
                    sz최종내원일  AS lastVisitDate
                FROM PUB_V환자정보
                WHERE sz이름 LIKE @q
                   OR sz차트번호 LIKE @q
                   OR sz휴대폰번호 LIKE @q
            `);

        // 생년월일 및 최종내원일 포맷 정리 후 반환
        const patients = result.recordset.map(p => ({
            ...p,
            birthDate: formatBirthDate(p.birthDate),
            lastVisitDate: formatBirthDate(p.lastVisitDate)
        }));

        res.json(patients);
    } catch (err) {
        console.error('DB error (patients):', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// ────────────────────────────────────────
// 2) 특정 환자의 다음 예약 정보 조회 API
//    GET /api/dentweb/appointments/:patientId
//    PUB_V예약정보에서 n이행현황=0 (미이행) 이고 미래 예약 중 가장 가까운 건 반환
// ────────────────────────────────────────
app.get('/api/dentweb/appointments/:patientId', async (req, res) => {
    const { patientId } = req.params;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    try {
        const pool = await mssql.connect(dbConfig);
        const today = new Date();
        // yyyyMMddHHmm 형식의 현재 시각
        const kst = new Date(today.getTime() + 9 * 60 * 60 * 1000);
        const nowStr = kst.toISOString().replace(/[-T:]/g, '').substring(0, 12);

        const result = await pool.request()
            .input('pid', mssql.Int, parseInt(patientId))
            .input('now', mssql.Char(12), nowStr)
            .query(`
                SELECT TOP 1
                    sz예약시각    AS appointmentTime,
                    sz예약내용    AS appointmentContent,
                    sz메모        AS memo,
                    n소요시간     AS duration,
                    n이행현황     AS status
                FROM PUB_V예약정보
                WHERE n환자ID = @pid
                  AND n이행현황 = 0
                  AND sz예약시각 >= @now
                ORDER BY sz예약시각 ASC
            `);

        if (result.recordset.length === 0) {
            return res.json({ hasAppointment: false });
        }

        const appt = result.recordset[0];
        res.json({
            hasAppointment: true,
            appointmentDate: formatAppointmentDate(appt.appointmentTime),
            appointmentTime: appt.appointmentTime ? appt.appointmentTime.substring(8, 12) : '',
            appointmentContent: appt.appointmentContent || '',
            memo: appt.memo || ''
        });
    } catch (err) {
        console.error('DB error (appointments):', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// ────────────────────────────────────────
// 3) 헬스체크 API
// ────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        await mssql.connect(dbConfig);
        res.json({ status: 'ok', message: 'Connected to DentWeb SQL Server' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.listen(port, () => {
    console.log(`DentWeb Link Server running at http://localhost:${port}`);
});
