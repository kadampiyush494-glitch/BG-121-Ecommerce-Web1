const { db } = require('../firebase/config');

/**
 * Middleware factory: restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 * Looks up the user's role from the Firestore 'users' collection.
 *
 * Usage: roleCheck('admin') or roleCheck('admin', 'staff')
 */
function roleCheck(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before role check.',
      });
    }

    try {
      // Look up user document by UID
      const userDoc = await db.collection('users').doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'No user profile found. Contact an administrator.',
        });
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
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify user role.',
        details: err.message,
      });
    }
  };
}

module.exports = { roleCheck };
