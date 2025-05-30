const express = require('express');
const { getAllMessages, getMessageByConversationId, deleteMessage, sendMessageWithMedia, searchMessages } = require('../controllers/messageController');
const router = express.Router();

const { uploadMultiple, uploadSingle } = require('../middleware/upload');
const chatInfoController = require('../controllers/chatInfoController');
const chatController = require('../controllers/chatController');
router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);

router.get('/:conversationId/media', chatInfoController.getChatMedia);
router.get('/:conversationId/files', chatInfoController.getChatFiles);
router.get('/:conversationId/links', chatInfoController.getChatLinks);
router.get('/:conversationId/storage', chatInfoController.getChatStorage);
router.get('/:conversationId/reminders', chatInfoController.getReminders);
// router.delete('/delete-selected', chatInfoController.deleteSelectedMessagesForMe);
router.delete('/delete', deleteMessage); // Xóa nhiều tin nhắn bằng ID
router.delete('/revoke',chatController.revokeMessage); // Xóa nhiều tin nhắn bằng ID
router.post('/sendMessageWithMedia', uploadSingle, sendMessageWithMedia);
router.get('/search/:conversationId', searchMessages); // Tìm kiếm tin nhắn theo từ khóa




module.exports = router;