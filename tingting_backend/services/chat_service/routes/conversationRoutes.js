const express = require('express');
const { getAllConversations, 
  createConversation, 
  createConversation2, 
  getAllConversationById , 
  deleteConversationHistory,
  disbandGroup,
  getAllGroups,
  getUserJoinGroup,
  getOrCreateConversation,
  getAllConversationById2
} = require('../controllers/conversationController');
const chatInfoController = require('../controllers/chatInfoController');
const router = express.Router();

router.get('/', getAllConversations);
router.get('/groups', getAllGroups);
router.get('/userGroups/:userId', getUserJoinGroup);
router.post('/createConversation', createConversation);
router.post('/createConversation2', createConversation2);
router.get('/getAllConversationById/:userId', getAllConversationById);
router.post('/getOrCreateConversation', getOrCreateConversation); // Tạo nhóm hoặc cuộc trò chuyện cá nhân
router.get('/getAllConversationById2/:userId', getAllConversationById2); // Lấy thông tin nhóm hoặc cuộc trò chuyện cá nhân

router.get('/:conversationId', chatInfoController.getChatInfo);
router.put('/:conversationId', chatInfoController.updateChatName);
router.get('/:conversationId/participants', chatInfoController.getParticipants);

router.post('/:conversationId/participants', chatInfoController.addParticipant);
router.delete('/:conversationId/participants', chatInfoController.removeParticipant);
router.put('/:conversationId/transfer-admin/test', chatInfoController.transferGroupAdmin);
// router.put('/:conversationId/participants/role', chatInfoController.changeParticipantRole); // Chưa

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
router.get('/:conversationId/messages', chatInfoController.findMessages);
// deleteConversationHistory
router.delete('/:conversationId', deleteConversationHistory); // Xóa cuộc trò chuyện
// router.delete('/delete-all', chatController.deleteAllMessagesInConversationForMe);

router.delete('/disbandGroup/:conversationId', disbandGroup); // Xóa nhóm

module.exports = router;