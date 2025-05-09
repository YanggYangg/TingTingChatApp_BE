const mongoose = require("mongoose");
const UserFcmToken = require("../models/UserFcmToken");

module.exports = {
  saveUserTokenFcm: async (req, res) => {
    try {
      console.log("Nhận từ FE:", req.body); 
      const { userId, fcmToken } = req.body;

      if (!userId || !fcmToken) {
        return res.status(400).json({ message: "Missing userId or fcmToken" });
      }

      const tokenRecord = await UserFcmToken.findOneAndUpdate(
        { userId },
        { fcmToken, updatedAt: new Date() },
        { upsert: true, new: true }
      );

      res.status(200).json({ message: "FCM token saved", data: tokenRecord });
    } catch (err) {
      console.error("[!] Error saving token:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};