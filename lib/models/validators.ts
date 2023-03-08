/**
 * Casts Unix timestamp from milliseconds to seconds.
 * @remarks
 * Casts Unix timestamp from millisecond to seconds, if provided timestamp is in milliseconds.
 */
export const fromMsToS = (timestamp: number): number => {
  // 1 January 10000 00:00:00 - first date to not fit into the datetime instance
  if (timestamp >= 2_147_483_647) {
    return Math.floor(timestamp / 1000);
  }

  return timestamp;
};
