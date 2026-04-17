const { auth, db } = require('../firebase/config');
const { isNonEmptyString, isValidEmail, isValidRole, runValidations } = require('../utils/validators');

/**
 * POST /api/auth/signup
 * Creates a Firebase Auth user + Firestore user profile.
 */
async function signup(req, res) {
  try {
    const { name, email, password, role } = req.body;

    const validation = runValidations([
      isNonEmptyString(name, 'Name'),
      isValidEmail(email),
      isNonEmptyString(password, 'Password'),
    ]);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation Error', message: validation.message });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters.' });
    }

    // Check email uniqueness in Firestore
    const existing = await db.collection('users').where('email', '==', email.trim().toLowerCase()).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists.' });
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: name.trim(),
    });

    // Determine role (default to 'staff' for security - first user can be made admin manually)
    const userRole = role && ['admin', 'staff'].includes(role) ? role : 'staff';

    // Create Firestore user document (keyed by UID)
    await db.collection('users').doc(userRecord.uid).set({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: userRole,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: userRecord.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: userRole,
      },
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Conflict', message: 'This email is already registered in Firebase Auth.' });
    }
    res.status(500).json({ error: 'Server Error', message: 'Failed to create account.', details: err.message });
  }
}

/**
 * POST /api/auth/login
 * Server-side: verifies an ID token sent from the client after Firebase client-side login.
 * Returns the user profile with role info.
 */
async function login(req, res) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Validation Error', message: 'ID token is required.' });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found. Please sign up first.',
      });
    }

    const userData = userDoc.data();

    res.json({
      message: 'Login successful.',
      user: {
        id: decoded.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },
    });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid token.', details: err.message });
  }
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 * Requires authenticate middleware.
 */
async function getProfile(req, res) {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User profile not found.' });
    }
    const data = userDoc.data();
    res.json({
      user: { id: req.user.uid, ...data },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
}

module.exports = { signup, login, getProfile };
