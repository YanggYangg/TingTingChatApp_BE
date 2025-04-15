const express = require('express');
const { getAllMessages, getMessageByConversationId, deleteMessage } = require('../controllers/messageController');
const chatInfoController = require('../controllers/chatInfoController');

const router = express.Router();

router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);

router.get('/:conversationId/media', chatInfoController.getChatMedia);
router.get('/:conversationId/files', chatInfoController.getChatFiles);
router.get('/:conversationId/links', chatInfoController.getChatLinks);
router.get('/:conversationId/storage', chatInfoController.getChatStorage);
router.get('/:conversationId/reminders', chatInfoController.getReminders);
router.delete('/delete-selected', chatInfoController.deleteSelectedMessagesForMe);
router.delete('/delete', deleteMessage); // Xóa nhiều tin nhắn bằng ID





module.exports = router;                                     