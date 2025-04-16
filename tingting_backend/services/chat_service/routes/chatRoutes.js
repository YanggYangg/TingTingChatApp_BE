const express = require('express');
const { sendMessage, getMessages, forwardMessage } = require('../controllers/chatController');
const router = express.Router();

router.post('/sendMessage', sendMessage);
router.get('/getMessages', getMessages);
router.post('/forwardMessage', forwardMessage);

module.exports = router;

