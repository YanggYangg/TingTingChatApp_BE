const express = require('express');
const { getAllConversations } = require('../controllers/conversationController');
const router = express.Router();
const chatInfoController = require('../controllers/chatInfoController');

router.get('/', getAllConversations);

router.get('/:conversationId', chatInfoController.getChatInfo);
router.put('/:conversationId', chatInfoController.updateChatName);
router.get('/:conversationId/participants', chatInfoController.getParticipants);

router.post('/:conversationId/participants', chatInfoController.addParticipant);
router.delete('/:conversationId/participants', chatInfoController.removeParticipant);
router.put('/:conversationId/participants/role', chatInfoController.changeParticipantRole); // Chưa

// Cập nhật trạng thái tắt/bật thông báo nhóm
router.put('/:conversationId/mute', chatInfoController.updateNotification);

// Cập nhật trạng thái ẩn/hiện cuộc trò chuyện
router.put('/:conversationId/hide', chatInfoController.hideChat);

// Cập nhật trạng thái ghim nhóm
router.put('/:conversationId/pin', chatInfoController.pinChat);

// Xóa toàn bộ cuộc trò chuyện phía tôi
// router.delete('/:conversationId', chatInfoController.deleteChatHistoryForMe);

// Danh sách nhóm chung
router.get('/:conversationId/common', chatInfoController.getCommonGroups);
router.get('/:conversationId/available', chatInfoController.getAvailableMembers);
router.delete('/delete-all', chatInfoController.deleteAllMessagesInConversationForMe);
module.exports = router;