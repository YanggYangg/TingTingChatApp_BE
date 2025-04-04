const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/messageController");

router.post("/send", MessageController.sendMessage);
router.get("/:messageId", MessageController.getMessage);
router.get("/user/:userId", MessageController.getMessagesByUser);

module.exports = router;
