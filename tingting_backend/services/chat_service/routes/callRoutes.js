const express = require("express");
const { initiateCall } = require("../controllers/callController");
const router = express.Router();
const Call = require("../models/Call");
const Conversation = require("../models/Conversation");

router.post("/initiate", initiateCall);
router.get("/history/:userId", async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ callerId: req.params.userId }, { receiverId: req.params.userId }],
    }).sort({ createdAt: -1 });
    res.json(calls);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch call history", error });
  }
});

router.get("/:conversationId/calls", async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId)
      .populate({
        path: "calls",
        select:
          "callerId receiverId callType status startedAt endedAt duration",
      })
      .select("calls");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation.calls);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch calls", error });
  }
});

module.exports = router;
