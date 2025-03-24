const express = require('express');
const { getAllConversations } = require('../controllers/conversationController');
const router = express.Router();
const chatInfoController = require('../controllers/chatInfoController');

router.get('/', getAllConversations);

router.get('/:chatId', chatInfoController.getChatInfo);
router.put('/:chatId', chatInfoController.updateChatInfo);
router.post('/:chatId/participants', chatInfoController.addParticipant);
router.delete('/:chatId/participants', chatInfoController.removeParticipant);
router.put('/:chatId/participants/role', chatInfoController.changeParticipantRole); // Chưa
module.exports = router;