const express = require('express');
const router = express.Router();
const { loginEmail, searchEmail } = require('../controllers/email_controller');

router.route('/loginEmail').post(loginEmail);
router.route('/searchEmail').post(searchEmail);

module.exports = router;
