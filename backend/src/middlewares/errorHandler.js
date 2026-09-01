const { Prisma } = require('@prisma/client');

const HUMAN_MESSAGES = {
  EXAM_LOCKED:               'This exam is locked. Contact admin to unlock.',
  DUPLICATE_RECEIPT_NO:      'This receipt number already exists.',
  OPTIMISTIC_LOCK_CONFLICT:  'This record was modified by another user. Please reload and try again.',
  FEE_ACCOUNT_NOT_FOUND:     'Student fee account has not been set up.',
  NOT_YOUR_MENTEE:           'This student is not your mentee.',
  OVERPAYMENT_LIMIT_EXCEEDED:'Payment amount exceeds the allowed limit.',
  REGISTRATION_CLOSED:       'Registration window is currently closed.',
  CODE_EXHAUSTED:            'This code has reached its usage limit.',
  WRONG_MENTOR_CODE:         'This code does not belong to your mentor.',
  COMPLETE_PROFILE_FIRST:    'Please complete your profile first.',
  ALREADY_REGISTERED:        'You have already registered for this semester.',
  INVALID_CREDENTIALS:       'Invalid email or password.',
  SESSION_ALREADY_EXISTS:    'Aaj is subject ki session pehle se ban gayi hai.',
  EMAIL_ALREADY_EXISTS:      'This email is already registered.',
};

function errorHandler(err, req, res, next) {
  // 1. Our custom AppError
  if (err.status && err.code) {
    return res.status(err.status).json({
      success: false,
      message: HUMAN_MESSAGES[err.code] || err.message || err.code,
      data: null,
      error: { code: err.code, ...err.meta }
    });
  }

  // 2. Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.join(', ') || 'field';
      return res.status(409).json({
        success: false, message: `Duplicate value on ${field}.`,
        data: null, error: { code: 'DUPLICATE_VALUE', field }
      });
    }
    if (err.code === 'P2003') {
      return res.status(422).json({
        success: false, message: 'Referenced record not found.',
        data: null, error: { code: 'FOREIGN_KEY_VIOLATION' }
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false, message: 'Record not found.',
        data: null, error: { code: 'NOT_FOUND' }
      });
    }
  }

  // 3. JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, data: null, error: { code: 'INVALID_TOKEN' } });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, data: null, error: { code: 'TOKEN_EXPIRED' } });
  }

  // 4. Unknown — log and return generic
  console.error('UNHANDLED ERROR:', err);
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
    data: null,
    error: { code: 'INTERNAL_SERVER_ERROR', requestId: req.id }
  });
}

module.exports = errorHandler;
