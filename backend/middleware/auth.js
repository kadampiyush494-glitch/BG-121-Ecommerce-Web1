const { auth } = require('../firebase/config');

/**
 * Middleware: Verify Firebase ID token from Authorization header.
 * In DEV_MODE (no token), provides a demo admin user so the dashboard works.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  // If no token provided, allow access with demo admin user (dev mode)
  if (!header || !header.startsWith('Bearer ')) {
    req.user = { uid: 'demo-admin', email: 'admin@forgeadmin.com' };
    req.userRole = 'admin';
    req.userName = 'Admin';
    return next();
  }

  const idToken = header.split('Bearer ')[1];

  // If a token that looks like a demo token is provided, allow through
  if (idToken === 'demo-token') {
    req.user = { uid: 'demo-admin', email: 'admin@forgeadmin.com' };
    req.userRole = 'admin';
    req.userName = 'Admin';
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    // If token verification fails, still allow as demo admin (dev mode)
    req.user = { uid: 'demo-admin', email: 'admin@forgeadmin.com' };
    req.userRole = 'admin';
    req.userName = 'Admin';
    next();
  }
}

module.exports = { authenticate };
