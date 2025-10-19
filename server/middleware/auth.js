const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  let token;

  // 1. Try to get token from Authorization header
  const authHeader = req.header('Authorization');
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }

  // 2. If no header, try to get token from URL query (for file downloads)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  // 3. If still no token, deny access
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // 4. Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
}

module.exports = authMiddleware;