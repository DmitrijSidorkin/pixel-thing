const { v4: uuidv4 } = require("uuid");

const PlaySession = require("../models/session");
const { getPixelatedImage, fetchRandomGameDataArr } = require("../middleware");
const { fetchPlaySessionData } = require("../middleware/helpers");
const playSettingsImage =
  "https://res.cloudinary.com/dyguovdbc/image/upload/v1676908287/pixelify/placeholder-image_ykgw2b.jpg";
const {
  cardStyle,
  resultsStyle,
  detailedResultsStyle,
} = require("../public/javascripts/extraStyles.js");

const remapDifficulty = {
  1: "Very Easy",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Very Hard",
};

module.exports.playOrContinue = async (req, res) => {
  if (req.user?._id) {
    const lastSessionData = await fetchPlaySessionData(req.user._id);
    if (lastSessionData) {
      if (
        lastSessionData.sessionData.length &&
        lastSessionData.sessionData.length !== lastSessionData.length
      ) {
        res.redirect("/play/continue");
      } else {
        res.redirect("/play-settings");
      }
    }
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

module.exports.renderContinue = async (req, res) => {
  if (!req.user._id) {
    res.redirect("/play-settings");
  }
  const user = req.user._id;
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

module.exports.renderPlay = async (req, res) => {
  const { id, pageNum } = req.params;
  const playSessionData = await PlaySession.findOne({ sessionId: id });
  let pageGameData;
  const userGuessText =
    playSessionData.sessionData[parseInt(pageNum - 1)]?.userGuessText || "";

  //checking if the play session page doesnt have play data yet
  if (pageNum > playSessionData.sessionData.length) {
    const gameData = await fetchRandomGameDataArr();

    pageGameData = {
      gamesArray: gameData.gamesArray,
      gameName: gameData.name,
      imgLink: gameData.background_image,
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
    gamesArray: pageGameData.gamesArray,
    gameName: pageGameData.gameName,
    imgLink: pageGameData.imgLink,
    elemId: pageGameData._id,
    extraStyles: cardStyle,
    sessionLength: playSessionData.length,
    sessionId: id,
    pageNum,
    userGuessText,
  });
};

module.exports.renderResults = async (req, res, next) => {
  const { id } = req.params;
  const playSessionData = JSON.stringify(
    await PlaySession.findOne({ sessionId: id })
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

module.exports.sendPlayData = async (req, res, next) => {
  const id = uuidv4();
  const playSession = new PlaySession({
    userId: req.user?._id || "guest",
    sessionId: id,
    difficulty: req.body.difficulty,
    length: req.body.sessionLength,
    sessionData: [],
  });
  await playSession.save();
  res.redirect(`/play/${id}/1`);
  next();
};

module.exports.updatePlayData = async (req, res, next) => {
  const sessionId = req.body.sessionId;
  const thisSession = await PlaySession.findOne({ sessionId });
  if (thisSession.sessionEnded) {
    res.redirect(`/results/${sessionId}`);
  } else {
    const pageNum = parseInt(req.body.pageNum);
    const playSession = await PlaySession.findOne({ sessionId });
    const userGuess =
      req.body.guess === playSession.sessionData[pageNum - 1].gameName;
    const elemId = req.body.elemId;
    await PlaySession.updateOne(
      { sessionId },
      {
        $set: {
          "sessionData.$[elem].userGuess": userGuess,
          "sessionData.$[elem].userGuessText": req.body.guess,
        },
      },
      { arrayFilters: [{ "elem._id": elemId }] }
    );
    if (req.body.action === "back") {
      res.redirect(`/play/${sessionId}/${pageNum - 1}`);
    } else if (playSession.length === parseInt(req.body.pageNum)) {
      await PlaySession.updateOne(
        { sessionId },
        { $set: { sessionEnded: true } }
      );
      res.redirect(`/results/${sessionId}`);
    }
    res.redirect(`/play/${sessionId}/${pageNum + 1}`);
    next();
  }
};

module.exports.renderTest = async (req, res) => {
  res.render("main/test.ejs");
};
