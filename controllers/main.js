const { v4: uuidv4 } = require("uuid");

const PlaySession = require("../models/session");
const User = require("../models/user");
const GameData = require("../models/game-data");
const { fetchRandomGameDataArr, calculateScore } = require("../middleware");
const { fetchPlaySessionData } = require("../middleware/helpers");
const {
  cardStyle,
  resultsStyle,
  detailedResultsStyle,
  mediaButtonsStyle,
} = require("../public/javascripts/extraStyles.js");
const playSettingsImage =
  "https://res.cloudinary.com/dyguovdbc/image/upload/v1676908287/pixelify/placeholder-image_ykgw2b.jpg";
const { lengthSettingsOptions } = require("../middleware/remaps");
const { remapDifficultyTexts } = require("../public/helpers.js");
const { pixelateImageFromURL } = require("../middleware/imagePixelation");

module.exports.playOrContinue = async (req, res) => {
  if (req.user?._id) {
    const lastSessionData = await fetchPlaySessionData(req.user._id);
    if (lastSessionData !== null) {
      if (
        lastSessionData.sessionData.length &&
        lastSessionData.sessionData.length !== lastSessionData.length
      ) {
        res.redirect("/play/continue");
      }
    }
  }
  res.redirect("/play-settings");
};

module.exports.renderPlaySettings = (req, res) => {
  res.render("./main/play-settings.ejs", {
    extraStyles: cardStyle,
    remapDifficultyTexts,
    lengthSettingsOptions,
  });
};

module.exports.renderContinue = async (req, res) => {
  if (!req.user._id) {
    res.redirect("/play-settings");
  }
  const user = req.user._id;
  const lastSessionData = await fetchPlaySessionData(user);
  const image = await pixelateImageFromURL(
    lastSessionData.sessionData[lastSessionData.sessionData.length - 1].imgLink,
    lastSessionData.difficulty
  );
  const sessionData = {
    difficulty: remapDifficultyTexts[lastSessionData.difficulty],
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
  if (playSessionData.sessionEnded) {
    res.redirect("/results");
  }
  let pageGameData;
  const userGuessText =
    playSessionData.sessionData[parseInt(pageNum - 1)]?.userGuessText || "";

  //checking if the play session page doesnt have play data yet
  if (pageNum > playSessionData.sessionData.length) {
    const gameData = await fetchRandomGameDataArr();
    pageGameData = {
      gamesArray: gameData.gamesArray,
      gameName: gameData.name,
      gameId: gameData.gameId,
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
  const image = await pixelateImageFromURL(
    pageGameData.imgLink,
    playSessionData.difficulty
  );
  res.render("main/play.ejs", {
    image,
    extraStyles: cardStyle,
    gamesArray: pageGameData.gamesArray,
    gameName: pageGameData.gameName,
    imgLink: pageGameData.imgLink,
    elemId: pageGameData._id,
    sessionLength: playSessionData.length,
    sessionId: id,
    pageNum,
    userGuessText,
  });
};

module.exports.renderResults = async (req, res, next) => {
  const { id } = req.params;
  let playSessionData = await PlaySession.findOne({ sessionId: id });
  const highscoreText = `${
    remapDifficultyTexts[playSessionData.difficulty] + playSessionData.length
  }`;
  const difficultyFilter = `bestScores.${playSessionData.difficulty}`;
  const highscoresData = JSON.stringify(
    await User.find()
      .sort({ [difficultyFilter]: -1 })
      .limit(10)
  );

  playSessionData = JSON.stringify(playSessionData);
  res.render("main/results", {
    extraStyles: resultsStyle + mediaButtonsStyle,
    playSessionData,
    highscoresData,
    highscoreText,
    defaultProfileImg: playSettingsImage,
    sessionId: id,
  });
  next();
};

module.exports.renderDetailedResults = async (req, res, next) => {
  const { id } = req.params;
  const playSessionData = JSON.stringify(
    await PlaySession.findOne({ sessionId: id })
  );
  res.render("main/detailed-results", {
    extraStyles: detailedResultsStyle + mediaButtonsStyle,
    playSessionData,
  });
  next();
};

module.exports.sendPlayData = async (req, res, next) => {
  const id = uuidv4();
  const difficulty = parseInt(req.body.difficulty);
  const length = parseInt(req.body.sessionLength);
  if (
    !(difficulty in remapDifficultyTexts) ||
    !lengthSettingsOptions.includes(length)
  ) {
    //send feedback to user on selected play settings being invalid
    res.redirect("/play-settings");
  } else {
    const playSession = new PlaySession({
      userId: req.user?._id || "guest",
      sessionId: id,
      difficulty,
      length,
      sessionData: [],
      sessionEnded: false,
      sessionStartTime: Date.now(),
    });
    await playSession.save();
    res.redirect(`/play/${id}/1`);
    next();
  }
};

module.exports.updatePlayData = async (req, res, next) => {
  const sessionId = req.body.sessionId;
  const thisSession = await PlaySession.findOne({ sessionId });
  //if session has already previously ended redirect to results page
  if (thisSession.sessionEnded) {
    res.redirect(`/results/${sessionId}`);
  }
  //update session data with user guess
  const pageNum = parseInt(req.body.pageNum);
  const userGuess =
    req.body.guess === thisSession.sessionData[pageNum - 1].gameName;
  await PlaySession.updateOne(
    { sessionId },
    {
      $set: {
        "sessionData.$[elem].userGuess": userGuess,
        "sessionData.$[elem].userGuessText": req.body.guess,
      },
    },
    { arrayFilters: [{ "elem._id": req.body.elemId }] }
  );
  const thisUpdatedSession = await PlaySession.findOne({ sessionId });
  //if back button was pressed, go back a page in /play
  if (req.body.action === "back") {
    res.redirect(`/play/${sessionId}/${pageNum - 1}`);
  }
  //if updating session data on last page, setting sessionEnded to true, calculating session score
  //and (if necessary) updating highscores and redirecting to results page
  if (thisUpdatedSession.length === parseInt(req.body.pageNum)) {
    const userId = thisUpdatedSession.userId;
    const currentUser = await User.findOne({ _id: userId });
    const score = calculateScore(thisUpdatedSession, Date.now());
    await PlaySession.updateOne(
      { sessionId },
      { $set: { sessionEnded: true, sessionScore: score } }
    );
    if (
      currentUser.bestScores[thisSession.difficulty][thisSession.length] ===
        undefined ||
      currentUser.bestScores[thisSession.difficulty][thisSession.length] < score
    ) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            [`bestScores.${thisSession.difficulty}.${thisSession.length}`]:
              score,
          },
        }
      );
    }
    res.redirect(`/results/${sessionId}`);
  }
  //redirecting to next guess page
  res.redirect(`/play/${sessionId}/${pageNum + 1}`);
  next();
};

module.exports.fetchDetailedGameData = async (req, res) => {
  const gameId = req.query.gameId;
  const requestedGameData = JSON.stringify(
    await GameData.findOne({ gameId: gameId })
  );
  res.json(requestedGameData);
};

module.exports.renderTest = async (req, res) => {
  res.render("main/test.ejs");
};
