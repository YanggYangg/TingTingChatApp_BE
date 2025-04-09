const express = require('express');
const { getAllMessages, getMessageByConversationId } = require('../controllers/messageController');
const chatInfoController = require('../controllers/chatInfoController');

const router = express.Router();

router.get('/', getAllMessages);
router.get('/:conversationId', getMessageByConversationId);

router.get('/:conversationId/media', chatInfoController.getChatMedia);
router.get('/:conversationId/files', chatInfoController.getChatFiles);
router.get('/:conversationId/links', chatInfoController.getChatLinks);
router.get('/:conversationId/reminders', chatInfoController.getReminders);
router.delete('/:messageId', chatInfoController.deleteMessageForMe);




module.exports = router;