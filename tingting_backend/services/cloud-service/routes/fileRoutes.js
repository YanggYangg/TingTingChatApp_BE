const express = require("express");
const router = express.Router();
const FileController = require("../controllers/fileController");
const upload = require("../middleware/upload");

router.post("/upload", upload.array("files", 10), FileController.uploadFile); // Giới hạn 10 file mỗi lần

module.exports = router;
