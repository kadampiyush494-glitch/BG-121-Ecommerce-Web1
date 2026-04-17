/**
 * Shared validation helpers for ForgeAdmin backend.
 * Every validator returns { valid: boolean, message?: string }
 */

function isNonEmptyString(value, fieldName) {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, message: `${fieldName} is required and must be a non-empty string.` };
  }
  return { valid: true };
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !re.test(email)) {
    return { valid: false, message: 'A valid email address is required.' };
  }
  return { valid: true };
}

function isPositiveNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: `${fieldName} must be a positive number greater than 0.` };
  }
  return { valid: true };
}

function isNonNegativeInteger(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return { valid: false, message: `${fieldName} must be a non-negative integer.` };
  }
  return { valid: true };
}

function isValidRating(value) {
  const num = Number(value);
  if (isNaN(num) || num < 1 || num > 5 || !Number.isInteger(num)) {
    return { valid: false, message: 'Rating must be an integer between 1 and 5.' };
  }
  return { valid: true };
}

function isValidRole(role) {
  const allowed = ['admin', 'staff'];
  if (!role || !allowed.includes(role)) {
    return { valid: false, message: `Role must be one of: ${allowed.join(', ')}.` };
  }
  return { valid: true };
}

function isValidOrderStatus(status) {
  const allowed = ['pending', 'completed', 'cancelled'];
  if (!status || !allowed.includes(status)) {
    return { valid: false, message: `Status must be one of: ${allowed.join(', ')}.` };
  }
  return { valid: true };
}

/**
 * Run multiple validators. Returns the first failure or { valid: true }.
 */
function runValidations(checks) {
  for (const check of checks) {
    if (!check.valid) return check;
  }
  return { valid: true };
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isPositiveNumber,
  isNonNegativeInteger,
  isValidRating,
  isValidRole,
  isValidOrderStatus,
  runValidations,
};
