export interface Dare {
  id: string;
  title: string;
  description: string;
  prizePool: number;
  createdAt: number;
  expiresAt: number;
  createdBy: string;
  submissionCount: number;
}

export interface Submission {
  id: string;
  dareId: string;
  username: string;
  videoUrl: string;
  videoType: "upload" | "link";
  uploadedAt: number;
  votes: number;
  isWinner?: boolean;
}

export interface Vote {
  dareId: string;
  submissionId: string;
  username: string;
}

const DARES_KEY = "darepool_dares";
const SUBMISSIONS_KEY = "darepool_submissions";
const VOTES_KEY = "darepool_votes";
const USER_KEY = "darepool_user";

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function setUser(username: string) {
  localStorage.setItem(USER_KEY, username);
}

export function getDares(): Dare[] {
  return load<Dare>(DARES_KEY);
}

export function createDare(dare: Omit<Dare, "id" | "submissionCount">): Dare {
  const dares = getDares();
  const newDare: Dare = {
    ...dare,
    id: crypto.randomUUID(),
    submissionCount: 0,
  };
  save(DARES_KEY, [...dares, newDare]);
  return newDare;
}

export function getDareById(id: string): Dare | null {
  return getDares().find((d) => d.id === id) ?? null;
}

export function getSubmissions(dareId: string): Submission[] {
  return load<Submission>(SUBMISSIONS_KEY).filter((s) => s.dareId === dareId);
}

export function getAllSubmissions(): Submission[] {
  return load<Submission>(SUBMISSIONS_KEY);
}

export function createSubmission(sub: Omit<Submission, "id" | "votes" | "isWinner">): Submission {
  const subs = load<Submission>(SUBMISSIONS_KEY);
  const newSub: Submission = {
    ...sub,
    id: crypto.randomUUID(),
    votes: 0,
    isWinner: false,
  };
  const updated = [...subs, newSub];
  save(SUBMISSIONS_KEY, updated);

  const dares = getDares();
  const dareIdx = dares.findIndex((d) => d.id === sub.dareId);
  if (dareIdx !== -1) {
    dares[dareIdx].submissionCount = updated.filter((s) => s.dareId === sub.dareId).length;
    save(DARES_KEY, dares);
  }

  return newSub;
}

export function getVotes(): Vote[] {
  return load<Vote>(VOTES_KEY);
}

export function hasVoted(dareId: string, username: string): boolean {
  return getVotes().some((v) => v.dareId === dareId && v.username === username);
}

export function castVote(dareId: string, submissionId: string, username: string): boolean {
  if (hasVoted(dareId, username)) return false;
  const votes = getVotes();
  save(VOTES_KEY, [...votes, { dareId, submissionId, username }]);

  const subs = load<Submission>(SUBMISSIONS_KEY);
  const idx = subs.findIndex((s) => s.id === submissionId);
  if (idx !== -1) {
    subs[idx].votes += 1;
    save(SUBMISSIONS_KEY, subs);
  }
  return true;
}

export function finalizeWinners(dareId: string) {
  const subs = load<Submission>(SUBMISSIONS_KEY);
  const dareSubs = subs.filter((s) => s.dareId === dareId);
  if (dareSubs.length === 0) return;

  const maxVotes = Math.max(...dareSubs.map((s) => s.votes));
  const updated = subs.map((s) => {
    if (s.dareId === dareId) {
      return { ...s, isWinner: s.votes === maxVotes && maxVotes >= 0 };
    }
    return s;
  });
  save(SUBMISSIONS_KEY, updated);
}

export function isExpired(dare: Dare): boolean {
  return Date.now() >= dare.expiresAt;
}

export function seedIfEmpty() {
  const dares = getDares();
  if (dares.length > 0) return;

  const now = Date.now();
  const d1: Dare = {
    id: "seed-1",
    title: "Eat a spoonful of hot sauce and finish a sentence",
    description: "Down a spoonful of your hottest hot sauce, then immediately recite the pledge of allegiance without stopping. Record the whole thing.",
    prizePool: 250,
    createdAt: now - 3600 * 1000,
    expiresAt: now + 44 * 3600 * 1000,
    createdBy: "DareKing",
    submissionCount: 2,
  };
  const d2: Dare = {
    id: "seed-2",
    title: "Cold plunge for 60 seconds",
    description: "Jump into ice-cold water (a bathtub full of ice counts) and stay submerged up to your chest for a full 60 seconds. Prove it on camera.",
    prizePool: 500,
    createdAt: now - 7200 * 1000,
    expiresAt: now + 38 * 3600 * 1000,
    createdBy: "ChillSeeker",
    submissionCount: 1,
  };
  const d3: Dare = {
    id: "seed-3",
    title: "Order a meal entirely in a made-up language",
    description: "Walk into any fast food place and place your entire order speaking only in a language you've invented on the spot. No backing down.",
    prizePool: 100,
    createdAt: now - 50 * 3600 * 1000,
    expiresAt: now - 2 * 3600 * 1000,
    createdBy: "TongueTwist",
    submissionCount: 3,
  };

  save(DARES_KEY, [d1, d2, d3]);

  const subs: Submission[] = [
    {
      id: "sub-1",
      dareId: "seed-1",
      username: "FireEater99",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoType: "link",
      uploadedAt: now - 1800 * 1000,
      votes: 12,
      isWinner: false,
    },
    {
      id: "sub-2",
      dareId: "seed-1",
      username: "HotMouth",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoType: "link",
      uploadedAt: now - 900 * 1000,
      votes: 7,
      isWinner: false,
    },
    {
      id: "sub-3",
      dareId: "seed-2",
      username: "IceWarrior",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoType: "link",
      uploadedAt: now - 3600 * 1000,
      votes: 19,
      isWinner: false,
    },
    {
      id: "sub-4",
      dareId: "seed-3",
      username: "JibberJabber",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoType: "link",
      uploadedAt: now - 48 * 3600 * 1000,
      votes: 31,
      isWinner: true,
    },
    {
      id: "sub-5",
      dareId: "seed-3",
      username: "LinguistPro",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoType: "link",
      uploadedAt: now - 47 * 3600 * 1000,
      votes: 14,
      isWinner: false,
    },
    {
      id: "sub-6",
      dareId: "seed-3",
      username: "SpeakEasy",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoType: "link",
      uploadedAt: now - 46 * 3600 * 1000,
      votes: 9,
      isWinner: false,
    },
  ];

  save(SUBMISSIONS_KEY, subs);
}
