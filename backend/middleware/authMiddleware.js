const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
// .env 파일에 FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY가 설정되어 있어야 합니다.
if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // newline 문자 처리가 필요할 수 있음
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase Admin initialized with service account.');
        } else {
            // 서비스 계정 정보가 없을 경우 기본 앱으로 시도 (로컬 개발 시나리오 등)
            admin.initializeApp();
            console.log('Firebase Admin initialized with default credentials.');
        }
    } catch (error) {
        console.error('Firebase Admin init error:', error.message);
    }
}

/**
 * Firebase ID 토큰 검증 미들웨어
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error.message);
        return res.status(403).json({ error: 'Unauthorized', details: error.message });
    }
};

module.exports = { verifyToken };
