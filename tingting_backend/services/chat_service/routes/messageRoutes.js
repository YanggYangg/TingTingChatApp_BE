const express = require('express');
const { getAllMessages, getMessageByConversationId } = require('../controllers/messageController');
const chatInfoController = require('../controllers/chatInfoController');

const router = express.Router();

router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);

// Lấy danh sách tin nhắn theo messageType và conversationId
// router.get("/:conversationId/:messageType", getMessagesByTypeAndConversation);

router.get('/:chatId/media', chatInfoController.getChatMedia);
router.get('/:chatId/files', chatInfoController.getChatFiles);
router.get('/:chatId/links', chatInfoController.getChatLinks);
router.get('/:chatId/reminders', chatInfoController.getReminders);


module.exports = router;