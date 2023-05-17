const { v4: uuidv4 } = require("uuid");

const PlaySession = require("../models/session");
const { getPixelatedImage } = require("../middleware");
const { fetchPlaySessionData } = require("../middleware/helpers");
const playSettingsImage =
  "https://res.cloudinary.com/dyguovdbc/image/upload/v1676908287/pixelify/placeholder-image_ykgw2b.jpg";
const {
  cardStyle,
  resultsStyle,
  detailedResultsStyle,
} = require("../public/javascripts/extraStyles.js");

module.exports.playOrContinue = async (req, res) => {
  const user = req.user.username;
  const lastSessionData = await fetchPlaySessionData(user);
  if (
    lastSessionData.sessionData.length &&
    lastSessionData.sessionData.length !== lastSessionData.length
  ) {
    res.redirect("/play/continue");
  } else {
    res.redirect("/play-settings");
  }
};

module.exports.renderPlaySettings = (req, res) => {
  res.render("./main/play-settings.ejs", {
    extraStyles: cardStyle,
    previewImage: playSettingsImage,
  });
};

module.exports.renderPlay = async (req, res) => {
  const { id, pageNum } = req.params;
  const playSessionData = await PlaySession.findOne({ sessionId: id });
  let pageGameData;

  //checking if the play session page already has data
  if (pageNum > playSessionData.sessionData.length) {
    pageGameData = {
      gameName: req.gameData.name,
      imgLink: req.gameData.background_image,
      userGuess: false,
    };
    await PlaySession.updateOne(
      { sessionId: id },
      { $push: { sessionData: pageGameData } }
    );
    const updatedSessionData = await PlaySession.findOne({ sessionId: id });
    const sessionObjectId =
      updatedSessionData.sessionData[parseInt(pageNum - 1)]._id.toString();
    pageGameData._id = sessionObjectId;
  } else {
    pageGameData = playSessionData.sessionData[parseInt(pageNum) - 1];
  }

  const image = await getPixelatedImage(pageGameData.imgLink);

  res.render("main/play.ejs", {
    image,
    gameName: pageGameData.gameName,
    imgLink: pageGameData.imgLink,
    elemId: pageGameData._id,
    extraStyles: cardStyle,
    sessionLength: playSessionData.length,
    sessionId: id,
    pageNum,
  });
};

const remapDifficulty = {
  1: "Very Easy",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Very Hard",
};

module.exports.renderContinue = async (req, res) => {
  const user = req.user.username;
  const lastSessionData = await fetchPlaySessionData(user);
  const image = await getPixelatedImage(
    lastSessionData.sessionData[lastSessionData.sessionData.length - 1].imgLink
  );
  const sessionData = {
    difficulty: remapDifficulty[lastSessionData.difficulty],
    length: lastSessionData.length,
    progress: lastSessionData.sessionData.length,
    id: lastSessionData.sessionId,
    image,
  };

  res.render("main/continue.ejs", { extraStyles: cardStyle, sessionData });
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
  res.redirect(`/play/${id}/1`);
  next();
};

module.exports.updatePlayData = async (req, res, next) => {
  const sessionId = req.body.sessionId;
  const pageNum = parseInt(req.body.pageNum);
  const userGuess = req.body.guess === req.body.gameName;
  const elemId = req.body.elemId;
  await PlaySession.updateOne(
    { sessionId: sessionId },
    { $set: { "sessionData.$[elem].userGuess": userGuess } },
    { arrayFilters: [{ "elem._id": elemId }] }
  );
  const playSessionData = await fetchPlaySessionData(req.user.username);
  if (req.body.action === "back") {
    res.redirect(`/play/${sessionId}/${pageNum - 1}`);
  } else if (playSessionData.length === parseInt(req.body.pageNum)) {
    res.redirect("/results");
  }
  res.redirect(`/play/${sessionId}/${pageNum + 1}`);
  next();
};

module.exports.renderResults = async (req, res, next) => {
  const playSessionData = JSON.stringify(
    await fetchPlaySessionData(req.user.username)
  );
  res.render("main/results", {
    extraStyles: resultsStyle,
    playSessionData,
  });
  next();
};

module.exports.renderDetailedResults = async (req, res, next) => {
  const { id } = req.params;
  const playSessionData = JSON.stringify(
    await PlaySession.findOne({ sessionId: id })
  );
  res.render("main/detailed-results", {
    extraStyles: detailedResultsStyle,
    playSessionData,
  });
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
