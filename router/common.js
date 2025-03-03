const express = require("express");
const router = express.Router();

const commonHandle = require("../router_handle/commonHandle");
router.post("/getApiLogs", commonHandle.getApiLogs);

router.get("/clearApiLogs", commonHandle.clearApiLogs);

router.post("/recordOperationLogs", commonHandle.recordOperationLogs);

router.post("/getOperationLogs", commonHandle.getOperationLogs);

router.get("/clearOperationLogs", commonHandle.clearOperationLogs);

router.post("/analyzeImgUrl", commonHandle.analyzeImgUrl);

router.post("/getImages", commonHandle.getImages);

router.post("/clearImages", commonHandle.clearImages);


module.exports = router;
