const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const UserFcmToken = require("../models/UserFcmToken");
const admin = require("../configs/firebase");

module.exports = {
  getAllNotifications: async (req, res) => {
    try {
      const notifications = await Notification.find();
      console.log("=====Test console Notifications:", notifications);
      res.status(200).json(notifications);
    } catch (error) {
      cónsole.log("=====Khong get duoc Notifications=====");
      res.status(500).json({ message: "Error when get all notifications" });
    }
  },

  sendNotification: async (req, res) => {
    try {
      const {
        userId,
        conversationId,
        messageId,
        typeNotice,
        content,
        data // optional
      } = req.body;

      // Kiểm tra các tham số cần thiết
    if (!userId || !conversationId || !messageId || !content) {
      return res.status(400).json({ message: "Missing required fields" });
    }

  
      // 1. Tìm token từ DB
      const tokenRecord = await UserFcmToken.findOne({ userId });
      if (!tokenRecord || !tokenRecord.fcmToken) {
        return res.status(404).json({ message: "FCM token not found for this user" });
      }
  
      const token = tokenRecord.fcmToken;
  
      // 2. Tạo bản ghi notification
      const newNotification = new Notification({
        userId,
        conversationId,
        messageId,
        typeNotice,
        content,
      });
  
      await newNotification.save();
  
      // 3. Tạo message gửi đến FCM
      const message = {
        token,
        notification: {
          title: 'TingTingChatApp',
          body: content,
        },
        data: {
          notificationId: newNotification._id.toString(),
          typeNotice,
          ...(data || {}),
        },
      };

      // Kiểm tra message
    if (!message.token || !message.notification || !message.data) {
      return res.status(400).json({ message: 'Invalid message format' });
    }

  
      // 4. Gửi FCM
      const response = await admin.messaging().send(message);
      console.log('[✓] FCM sent:', response);
  
      return res.status(200).json({
        message: 'Notification saved and FCM sent',
        notificationId: newNotification._id,
        fcmResponse: response,
      });
    } catch (error) {
      console.error('[!] Error sending notification:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
