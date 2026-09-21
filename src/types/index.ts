export type UserRole = 'student' | 'admin' | 'superadmin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  year?: string;
  college?: string;
  studentId?: string;
  photoURL?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ItemType = 'lost' | 'found';
export type ItemStatus = 'open' | 'claimed' | 'returned' | 'closed';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  locationId: string;
  locationName: string;
  reportedBy: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterRole?: string;
  dateOfIncident: string;
  approximateTime?: string;
  timeOfIncident?: string;
  currentPossession?: string; // where item is kept if found (e.g. reception)
  additionalPrivateInfo?: string; // sensitive ownership verification detail (kept private)
  secretIdentifyingDetails?: string;
  contactPreference?: 'in_app' | 'email_relay';
  status: ItemStatus;
  isPrivate?: boolean;
  isDeleted?: boolean;
  reportedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ClaimStatus = 'pending' | 'under_review' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Claim {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  itemImage?: string;
  claimantId: string;
  claimantName: string;
  claimantEmail?: string;
  ownerId: string; // the reporter of the found/lost item
  ownerName?: string;
  verificationAnswer: string;
  additionalDetails?: string;
  status: ClaimStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  recommendedLocation?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  claimId: string;
  senderId: string;
  senderName: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'possible_match'
  | 'claim_request'
  | 'claim_accepted'
  | 'claim_rejected'
  | 'new_message'
  | 'item_returned'
  | 'admin_announcement';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedItemId?: string;
  relatedClaimId?: string;
  isRead: boolean;
  createdAt: string;
}

export type AbuseReason =
  | 'fake_listing'
  | 'spam'
  | 'scam'
  | 'wrong_information'
  | 'inappropriate_content'
  | 'duplicate'
  | 'other';

export interface AbuseReport {
  id: string;
  targetType: 'item' | 'conversation' | 'user';
  targetId: string;
  targetTitle?: string;
  reporterId: string;
  reporterName?: string;
  reason: AbuseReason;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface CampusLocation {
  id: string;
  name: string;
  description?: string;
  buildingCode?: string;
  isDefault?: boolean;
}

export interface SystemSettings {
  id: string;
  allowedDomain: string; // e.g. "college.edu" (or empty for any)
  googleLoginEnabled: boolean;
  requireAdminApproval: boolean;
  announcementText: string;
  announcementActive: boolean;
  handoverLocations: string[];
}

export interface AIMatchResult {
  itemId: string;
  score: number; // 0 - 100%
  reasons: string[];
  matchedTitle: string;
  matchedCategory: string;
  matchedLocation: string;
}
