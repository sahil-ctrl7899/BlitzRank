/** score = win / bet, rounded to the column's 4dp so Postgres, Redis and history agree. */
export const computeScore = (bet, win) => Math.round((Number(win) / Number(bet)) * 1e4) / 1e4;
