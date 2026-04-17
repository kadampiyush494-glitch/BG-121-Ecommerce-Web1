const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);

// Protected route
router.get('/me', authenticate, ctrl.getProfile);

module.exports = router;
