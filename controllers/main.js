const { v4: uuidv4 } = require("uuid");

const PlaySession = require("../models/session");
const { getPixelatedImage } = require("../middleware");
const playSettingsImage =
  "https://res.cloudinary.com/dyguovdbc/image/upload/v1676908287/pixelify/placeholder-image_ykgw2b.jpg";

const { fetchPlaySessionData } = require("../middleware/helpers");
const {
  cardStyle,
  resultsStyle,
} = require("../public/javascripts/extraStyles.js");

module.exports.renderPlaySettings = (req, res) => {
  res.render("./main/play-settings.ejs", {
    extraStyles: cardStyle,
    previewImage: playSettingsImage,
  });
};

module.exports.renderPlay = async (req, res) => {
  const image = await getPixelatedImage(req.gameData.background_image);
  const playSessionData = await fetchPlaySessionData(req.user.username);
  res.render("main/play.ejs", {
    image,
    gameName: req.gameData.name,
    imgLink: req.gameData.background_image,
    extraStyles: cardStyle,
    fetchedSession: playSessionData,
  });
};

module.exports.sendPlayData = async (req, res, next) => {
  const id = uuidv4();
  const playSession = new PlaySession({
    userId: req.user?.username || "guest",
    sessionId: id,
    difficulty: req.body.difficulty,
    length: req.body.sessionLength,
  });
  await playSession.save();
  res.redirect("/play");
  next();
};

module.exports.updatePlayData = async (req, res, next) => {
  // await PlaySession.findOneAndUpdate()
  const guessData = {
    gameName: req.body.gameName,
    imgLink: req.body.imageLink,
    userGuess: req.body.guess === req.body.gameName,
  };
  await PlaySession.updateOne(
    { sessionId: req.body.sessionId },
    { $push: { sessionData: guessData } }
  );
  res.redirect("/play");
  next();
};

// module.exports.renderTest = async (req, res) => {
//   const image = await getPixelatedImage(req.gameData.background_image);

//   res.render("main/test.ejs", {
//     image,
//     gameName: req.gameData.name,
//     imgLink: req.gameData.background_image,
//     extraStyles: cardStyle,
//   });
// };

module.exports.renderResults = (req, res) => {
  res.render("main/results.ejs", {
    extraStyles: resultsStyle,
  });
};
