const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

router.get('/', authenticate, ctrl.getAll);
router.get('/logs', authenticate, ctrl.getLogs);
router.put('/:productId', authenticate, roleCheck('admin'), ctrl.updateStock);

module.exports = router;
