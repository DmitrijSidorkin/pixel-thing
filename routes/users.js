const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const User = require("../models/user");
const passport = require("passport");
const users = require("../controllers/users");
const { fetchRandomGameData } = require("../middleware");
const { render } = require("ejs");

router
  .route("/register")
  .get(fetchRandomGameData, users.renderRegister)
  .post(catchAsync(users.register));

router
  .route("/login")
  .get(fetchRandomGameData, users.renderLogin)
  .post(
    passport.authenticate("local", {
      failureFlash: true,
      failureRedirect: "/login",
      successRedirect: "/",
    }),
    users.login
  );

router.route("/account").get(users.renderAccount);

router.get("/logout", users.logout);

module.exports = router;
