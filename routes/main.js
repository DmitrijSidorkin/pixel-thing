const express = require("express");

const router = express.Router();

const main = require("../controllers/main");
const { fetchRandomGameData } = require("../middleware");
const { ROUTES } = require("../controllers/routes");
const { mainStyle, cardStyle } = require("../public/javascripts/extraStyles");

router.route(ROUTES.index).get((req, res) => {
  res.render("home", { extraStyles: mainStyle });
});

router.route(ROUTES.error).get((req, res) => {
  res.render("error", { extraStyles: cardStyle, error: req.session.error });
});

router.route(ROUTES.playSettings).get(main.renderPlaySettings);
router.route(ROUTES.play).get(fetchRandomGameData, main.renderPlay);
router.route(ROUTES.playOrContinue).get(main.playOrContinue);
router.route(ROUTES.continue).get(main.renderContinue);

router.route(ROUTES.results).get(main.renderResults);
router.route(ROUTES.detailedResults).get(main.renderDetailedResults);

router.route(ROUTES.sendPlayData).post(main.sendPlayData);
router.route(ROUTES.updatePlayData).post(main.updatePlayData);
//router.route(ROUTES.test).get(fetchRandomGameData, main.renderTest);

module.exports = router;
