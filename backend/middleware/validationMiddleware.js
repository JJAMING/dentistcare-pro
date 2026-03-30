const { query, param, validationResult } = require('express-validator');

/**
 * 유효성 검사 결과 자동 처리 미들웨어
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * 환자 검색 유효성 검 규칙
 */
const patientSearchRules = [
    query('query').notEmpty().withMessage('query parameter is required')
        .isString().withMessage('query must be a string')
        .trim().isLength({ min: 1 }).withMessage('query must at least 1 character long'),
    validate
];

/**
 * 환자 ID 파라미터 유효성 검사 규칙
 */
const patientIdRules = [
    param('patientId').notEmpty().withMessage('patientId is required')
        .isInt().withMessage('patientId must be an integer'),
    validate
];

/**
 * 날짜 검색 유효성 검사 규칙 (YYYY-MM-DD)
 */
const dailySyncRules = [
    query('date').notEmpty().withMessage('date parameter is required')
        .isISO8601().withMessage('date must be in YYYY-MM-DD format'),
    validate
];

module.exports = {
    patientSearchRules,
    patientIdRules,
    dailySyncRules
};
