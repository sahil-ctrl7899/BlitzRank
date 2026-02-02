import User from "./Users.js";
import Tournament from "./Tournament.js";
import Participant from "./Participant.js";
import ScoreHistory from "./ScoreHistory.js";
import WalletTransaction from "./WalletTransaction.js";

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

export {
  User,
  Tournament,
  Participant,
  ScoreHistory,
  WalletTransaction
};

