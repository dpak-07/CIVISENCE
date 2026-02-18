const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/roleMiddleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authMiddleware);
router.get('/dashboard', allowRoles(ROLES.ADMIN), adminController.getDashboard);

module.exports = router;
