const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getStats);

module.exports = router;
