const express = require("express");
const { initiateCall } = require("../controllers/callController");
const router = express.Router();

router.post("/initiate", initiateCall);

module.exports = router;
