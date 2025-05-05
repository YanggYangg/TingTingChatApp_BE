const express = require('express');
const router = express.Router();

const { saveUserTokenFcm } = require('../controllers/userFcmTokenController');

router.post('/saveUserTokenFcm', saveUserTokenFcm);

module.exports = router;