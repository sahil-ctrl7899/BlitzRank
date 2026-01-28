const User = require("./Users");
const Tournament = require("./Tournament");
const Participant = require("./Participant");
const ScoreHistory = require("./ScoreHistory");
const WalletTransaction = require("./WalletTransaction");

/* User Relations */
User.hasMany(Participant, { foreignKey: "userId" });
User.hasMany(WalletTransaction, { foreignKey: "userId" });

/* Tournament Relations */
Tournament.hasMany(Participant, { foreignKey: "tournamentId" });

/* Participant Relations */
Participant.belongsTo(User, { foreignKey: "userId" });
Participant.belongsTo(Tournament, { foreignKey: "tournamentId" });
Participant.hasMany(ScoreHistory, { foreignKey: "participantId" });

/* ScoreHistory Relations */
ScoreHistory.belongsTo(Participant, { foreignKey: "participantId" });

/* Wallet Relations */
WalletTransaction.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  User,
  Tournament,
  Participant,
  ScoreHistory,
  WalletTransaction
};
