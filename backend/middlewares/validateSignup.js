module.exports = function validateSignup(req, res, next) {
  const { username, password, university } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  if (typeof university !== 'string' || university.trim().length === 0) {
    return res.status(400).json({ message: 'University is required' });
  }
  next();
};
// (Reverted) Signup validation removed. Stub kept to avoid import issues.
module.exports = function (_req, _res, next) { next(); };
