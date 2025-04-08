const express = require('express');
const { sendMessage, getMessages } = require('../controllers/chatController');
const router = express.Router();

router.post('/sendMessage', sendMessage);
router.get('/getMessages', getMessages);

module.exports = router;

