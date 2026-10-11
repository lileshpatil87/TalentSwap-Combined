export type Id = string;

export interface UserSummary {
  id: Id;
  name: string;
  email: string;
  role: "USER" | "VERIFIED_USER" | "MODERATOR" | "ADMIN";
  avatar?: string;
  headline?: string;
  location?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
}

export interface Profile extends UserSummary {
  bio: string;
  availability: string;
  timezone: string;
  languages: string[];
  joinedAt: string;
}

export interface Skill {
  id: Id;
  userId: Id;
  userName: string;
  title: string;
  category: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  pointsPerHour: number;
  tags: string[];
  active: boolean;
}

export interface MatchSuggestion {
  id: Id;
  user: UserSummary;
  offeredSkill: Skill;
  wantedSkill: string;
  matchScore: number;
  reason: string;
}

export interface WalletSnapshot {
  balance: number;
  available: number;
  pending: number;
  currencyLabel: string;
}

export interface LedgerEntry {
  id: Id;
  createdAt: string;
  type: "CREDIT" | "DEBIT" | "HOLD" | "RELEASE";
  amount: number;
  description: string;
  reference?: string;
}

export type ExchangeStatus = "REQUESTED" | "ACCEPTED" | "IN_ESCROW" | "IN_PROGRESS" | "AWAITING_CONFIRMATION" | "COMPLETED" | "DISPUTED" | "CANCELLED";

export interface Exchange {
  id: Id;
  skillTitle: string;
  partner: UserSummary;
  points: number;
  status: ExchangeStatus;
  scheduledFor: string;
  updatedAt: string;
}

export interface Conversation {
  id: Id;
  participant: UserSummary;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: Id;
  conversationId: Id;
  senderId: Id;
  text: string;
  sentAt: string;
  status: "SENT" | "DELIVERED" | "READ";
}

export interface NotificationItem {
  id: Id;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: "EXCHANGE" | "MESSAGE" | "SYSTEM" | "BADGE" | "VERIFICATION";
}

export interface DocumentItem {
  id: Id;
  name: string;
  type: string;
  size: number;
  status: "PENDING" | "UPLOADING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
  uploadedAt?: string;
  progress?: number;
}

export interface Badge {
  id: Id;
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

export interface GamificationSnapshot {
  level: number;
  xp: number;
  nextLevelXp: number;
  badges: Badge[];
  rank: number;
}

export interface CommunityPost {
  id: Id;
  author: UserSummary;
  title: string;
  body: string;
  createdAt: string;
  likes: number;
  comments: number;
  liked: boolean;
}

export interface Rating {
  id: Id;
  reviewer: UserSummary;
  score: number;
  comment: string;
  createdAt: string;
  exchangeId: Id;
}

export interface AdminMetrics {
  users: number;
  verifiedUsers: number;
  activeExchanges: number;
  pointsMoved: number;
  pendingDocuments: number;
}
