// Lightweight request body validators. Hand-rolled (no extra deps) and
// intentionally narrow — only fields the controller actually uses. The
// goal is to reject obviously-bad input BEFORE the bcrypt / DB hit so
// that an attacker can't burn CPU with junk payloads.

const isString = (v) => typeof v === 'string';
const isNonEmptyString = (v) => isString(v) && v.trim().length > 0;
const isEmailShape = (v) => isString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
const isReasonablePassword = (v) => isString(v) && v.length >= 8 && v.length <= 200;

export const validateLoginBody = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!isEmailShape(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!isReasonablePassword(password)) {
    return res.status(400).json({ error: 'Password must be 8-200 characters' });
  }
  // Normalize so bcrypt and the lookup don't see trailing whitespace.
  req.body.email = email.toLowerCase().trim();
  next();
};

export const validateRegisterBody = (req, res, next) => {
  const { email, password, firstName, lastName, phone } = req.body || {};
  if (!isEmailShape(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!isReasonablePassword(password)) {
    return res.status(400).json({ error: 'Password must be 8-200 characters' });
  }
  if (!isNonEmptyString(firstName)) {
    return res.status(400).json({ error: 'First name is required' });
  }
  if (lastName !== undefined && !isString(lastName)) {
    return res.status(400).json({ error: 'Last name must be a string' });
  }
  if (phone !== undefined && !isString(phone)) {
    return res.status(400).json({ error: 'Phone must be a string' });
  }
  req.body.email = email.toLowerCase().trim();
  next();
};

export const validateForgotPasswordBody = (req, res, next) => {
  const { email } = req.body || {};
  if (!isEmailShape(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  req.body.email = email.toLowerCase().trim();
  next();
};

export const validateResetPasswordBody = (req, res, next) => {
  const { token, newPassword } = req.body || {};
  if (!isNonEmptyString(token)) {
    return res.status(400).json({ error: 'Reset token is required' });
  }
  if (!isReasonablePassword(newPassword)) {
    return res.status(400).json({ error: 'New password must be 8-200 characters' });
  }
  next();
};
