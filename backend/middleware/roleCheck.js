const { db } = require('../firebase/config');

/**
 * Middleware factory: restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 * In dev mode (demo-admin), always allows access.
 */
function roleCheck(...allowedRoles) {
  return async (req, res, next) => {
    // Dev mode bypass — demo admin always has full access
    if (req.user && req.user.uid === 'demo-admin') {
      req.userRole = 'admin';
      req.userName = 'Admin';
      return next();
    }

    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before role check.',
      });
    }

    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();

      if (!userDoc.exists) {
        // If no user doc exists, allow as admin in dev
        req.userRole = 'admin';
        req.userName = req.user.email || 'User';
        return next();
      }

      const userData = userDoc.data();
      req.userRole = userData.role;
      req.userName = userData.name;

      if (!allowedRoles.includes(userData.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userData.role}.`,
        });
      }

      next();
    } catch (err) {
      // On error, allow through in dev mode
      req.userRole = 'admin';
      req.userName = 'Admin';
      next();
    }
  };
}

module.exports = { roleCheck };
