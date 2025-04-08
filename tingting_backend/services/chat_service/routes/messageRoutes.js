const express = require('express');
const { getAllMessages, getMessageByConversationId, sendMessage } = require('../controllers/messageController');
const router = express.Router();

router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);
router.post('/sendMessage', sendMessage);

module.exports = router;