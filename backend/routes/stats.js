const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getStats);
router.post('/wipe_data', authenticate, ctrl.wipeDummyData);

module.exports = router;
