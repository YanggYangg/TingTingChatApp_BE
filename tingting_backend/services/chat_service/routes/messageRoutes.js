const express = require('express');
<<<<<<< HEAD
const { getAllMessages, getMessageByConversationId, deleteMessage, sendMessageWithMedia } = require('../controllers/messageController');
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




=======
const { getAllMessages, getMessageByConversationId } = require('../controllers/messageController');
const router = express.Router();

router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);

>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
module.exports = router;