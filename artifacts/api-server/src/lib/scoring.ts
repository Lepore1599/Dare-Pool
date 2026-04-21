/**
 * Feed scoring utilities for Hot and Trending tabs.
 * All functions are pure and easy to tweak — adjust weights here only.
 */

export interface HotInput {
  recentFundingDollars: number;   // dollars added to pool in the last 24h
  recentFunderCount: number;      // unique funders in the last 24h
  entryCount: number;             // total non-removed entries
}

export interface TrendingInput {
  prizePool: number;     // current prize pool in dollars
  entryCount: number;
  voteCount: number;
  commentCount: number;
  funderCount: number;   // all-time unique funders
}

/**
 * Hot score — rewards fast-growing pools right now.
 * Primary signal: recent funding velocity.
 */
export function hotScore(d: HotInput): number {
  return (
    d.recentFundingDollars * 1.5 +
    d.recentFunderCount * 6 +
    d.entryCount * 2
  );
}

/**
 * Trending score — rewards overall engagement and consistency.
 * Balanced across pool size, activity breadth, and community involvement.
 */
export function trendingScore(d: TrendingInput): number {
  return (
    d.prizePool * 0.5 +
    d.entryCount * 10 +
    d.voteCount * 5 +
    d.funderCount * 8 +
    d.commentCount * 2
  );
}
