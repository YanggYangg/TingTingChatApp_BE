const express = require('express');
const { getAllMessages, getMessageByConversationId } = require('../controllers/messageController');
const router = express.Router();

router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);

module.exports = router;