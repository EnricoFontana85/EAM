const express = require("express");
const controller = require("../controllers/controller");

const router = express.Router();

// Routes management
router.get("/home", controller.home);
router.get("/home/annual", controller.home);
router.get("/support/:id/id", controller.support);
router.get("/support/:id/sus", controller.support);
router.get("/compliance/:id/port", controller.compliance);
router.get("/compliance/:id/xdp", controller.compliance);
router.get("/source/:id/eam", controller.source);
router.get("/source/:id/ch", controller.source);

router.get("/", (req, res) => {
  res.redirect("home");
});

module.exports = router;
