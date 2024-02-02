module.exports.ROUTES = {
  index: "/",
  playOrContinue: "/play",
  play: "/play/:id/:pageNum",
  fetchPlayGameData: "/fetch-play-game-data/:id/:pageNum",
  continue: "/play/continue",
  login: "/login",
  logout: "/logout",
  register: "/register",
  account: "/account",
  fetchUserData: "/fetch-user-data",
  changePassword: "/account/change-password",
  updatePassword: "/update-password",
  changeProfile: "/account/change-profile",
  updateProfile: "/update-profile",
  viewProfile: "/view-profile/:id",
  results: "/results/:id",
  fetchTopHighscores: "/fetch-top-highscores",
  detailedResults: "/detailed-results/:id",
  fetchDetailedGameData: "/fetch-detailed-game-data",
  playSettings: "/play-settings",
  sendPlayData: "/send-play-data",
  updatePlayData: "/update-play-data",
  error: "/error",
};
