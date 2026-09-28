"use strict";

/**
 * Pushes business invariants down into Postgres so they hold even if
 * application code (or a concurrent request) gets it wrong:
 *  - wallet balance can never go negative
 *  - prize payouts are exactly-once per (user, tournament)
 *  - score submissions are idempotent via a client supplied key
 *  - hot leaderboard / ledger queries are index-backed
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;

    await queryInterface.addColumn("Tournaments", "prizePool", {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("Tournaments", "payoutStatus", {
      type: Sequelize.ENUM("PENDING", "PROCESSING", "DONE"),
      allowNull: false,
      defaultValue: "PENDING"
    });
    await queryInterface.addColumn("ScoreHistories", "idempotencyKey", {
      type: Sequelize.STRING(128),
      allowNull: true
    });

    await q.query(`ALTER TABLE "Users" ADD CONSTRAINT users_balance_non_negative CHECK (balance >= 0)`);
    await q.query(`ALTER TABLE "Tournaments" ADD CONSTRAINT tournaments_time_order CHECK ("endTime" > "startTime")`);
    await q.query(`ALTER TABLE "WalletTransactions" ADD CONSTRAINT wallet_amount_positive CHECK (amount > 0)`);

    await queryInterface.addIndex("Participants", ["tournamentId", "currentScore"], {
      name: "participants_tournament_score_idx"
    });
    await queryInterface.addIndex("ScoreHistories", ["participantId", "createdAt"], {
      name: "score_history_participant_created_idx"
    });
    await queryInterface.addIndex("WalletTransactions", ["userId", "createdAt"], {
      name: "wallet_tx_user_created_idx"
    });
    await queryInterface.addIndex("Tournaments", ["status", "startTime"], {
      name: "tournaments_status_start_idx"
    });

    // Score idempotency: the same key may only ever be applied once.
    await q.query(
      `CREATE UNIQUE INDEX score_history_idem_uq ON "ScoreHistories" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`
    );
    // Exactly-once payout per winner per tournament, enforced by the database.
    await q.query(
      `CREATE UNIQUE INDEX wallet_prize_once_uq ON "WalletTransactions" ("userId", "referenceId") WHERE reason = 'TOURNAMENT_PRIZE'`
    );
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.query(`DROP INDEX IF EXISTS wallet_prize_once_uq`);
    await q.query(`DROP INDEX IF EXISTS score_history_idem_uq`);
    await queryInterface.removeIndex("Tournaments", "tournaments_status_start_idx");
    await queryInterface.removeIndex("WalletTransactions", "wallet_tx_user_created_idx");
    await queryInterface.removeIndex("ScoreHistories", "score_history_participant_created_idx");
    await queryInterface.removeIndex("Participants", "participants_tournament_score_idx");
    await q.query(`ALTER TABLE "WalletTransactions" DROP CONSTRAINT wallet_amount_positive`);
    await q.query(`ALTER TABLE "Tournaments" DROP CONSTRAINT tournaments_time_order`);
    await q.query(`ALTER TABLE "Users" DROP CONSTRAINT users_balance_non_negative`);
    await queryInterface.removeColumn("ScoreHistories", "idempotencyKey");
    await queryInterface.removeColumn("Tournaments", "payoutStatus");
    await q.query(`DROP TYPE IF EXISTS "enum_Tournaments_payoutStatus"`);
    await queryInterface.removeColumn("Tournaments", "prizePool");
  }
};
