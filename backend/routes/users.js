const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usersController');
const { authenticate } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, roleCheck('admin'), ctrl.update);
router.delete('/:id', authenticate, roleCheck('admin'), ctrl.remove);

module.exports = router;
