import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Item,
  Claim,
  ChatMessage,
  AppNotification,
  AbuseReport,
  CampusLocation,
  SystemSettings,
  UserProfile,
  UserRole
} from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_LOCATIONS, DEFAULT_HANDOVER_LOCATIONS } from './constants';

/* ----------------- ITEMS ----------------- */

export async function createItemInFirestore(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'items';
  try {
    const colRef = collection(db, path);
    const now = new Date().toISOString();
    const docRef = await addDoc(colRef, {
      ...itemData,
      isDeleted: false,
      reportedCount: 0,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateItemInFirestore(itemId: string, updates: Partial<Item>): Promise<void> {
  const path = `items/${itemId}`;
  try {
    const docRef = doc(db, 'items', itemId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function softDeleteItemInFirestore(itemId: string): Promise<void> {
  await updateItemInFirestore(itemId, { isDeleted: true, status: 'closed' });
}

export async function getItemByIdFromFirestore(itemId: string): Promise<Item | null> {
  const path = `items/${itemId}`;
  try {
    const docRef = doc(db, 'items', itemId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Item;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function getAllItemsFromFirestore(includeDeleted = false): Promise<Item[]> {
  const path = 'items';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const items: Item[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Omit<Item, 'id'>;
      if (includeDeleted || !data.isDeleted) {
        items.push({ id: docSnap.id, ...data });
      }
    });
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Error fetching items from firestore (falling back to empty list):', err);
    return [];
  }
}

export async function getCampusStatisticsFromFirestore(): Promise<{
  totalReported: number;
  totalReturned: number;
  activeListings: number;
  lostCount: number;
  foundCount: number;
}> {
  try {
    const items = await getAllItemsFromFirestore(true);
    const totalReported = items.length;
    const totalReturned = items.filter(i => i.status === 'returned').length;
    const activeListings = items.filter(i => i.status === 'open' && !i.isDeleted).length;
    const lostCount = items.filter(i => i.type === 'lost' && !i.isDeleted).length;
    const foundCount = items.filter(i => i.type === 'found' && !i.isDeleted).length;

    return {
      totalReported,
      totalReturned,
      activeListings,
      lostCount,
      foundCount
    };
  } catch (error) {
    return {
      totalReported: 0,
      totalReturned: 0,
      activeListings: 0,
      lostCount: 0,
      foundCount: 0
    };
  }
}

/* ----------------- CLAIMS ----------------- */

export async function createClaimInFirestore(claimData: Omit<Claim, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'claims';
  try {
    const colRef = collection(db, path);
    const now = new Date().toISOString();
    const docRef = await addDoc(colRef, {
      ...claimData,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    });

    // Notify item owner about the claim request
    await createNotificationInFirestore({
      userId: claimData.ownerId,
      type: 'claim_request',
      title: 'New Claim Request',
      message: `${claimData.claimantName} submitted a claim verification for "${claimData.itemTitle}".`,
      relatedItemId: claimData.itemId,
      relatedClaimId: docRef.id
    });

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateClaimInFirestore(claimId: string, updates: Partial<Claim>): Promise<void> {
  const path = `claims/${claimId}`;
  try {
    const docRef = doc(db, 'claims', claimId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getAllClaimsFromFirestore(): Promise<Claim[]> {
  const path = 'claims';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const claims: Claim[] = [];
    snapshot.forEach(docSnap => {
      claims.push({ id: docSnap.id, ...docSnap.data() } as Claim);
    });
    return claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Error getting claims:', err);
    return [];
  }
}

export async function getUserClaimsFromFirestore(userId: string): Promise<Claim[]> {
  const allClaims = await getAllClaimsFromFirestore();
  return allClaims.filter(c => c.claimantId === userId || c.ownerId === userId);
}

export async function markItemReturnedInFirestore(
  itemId: string,
  claimId: string | undefined,
  confirmedByName: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateItemInFirestore(itemId, {
    status: 'returned',
    updatedAt: now
  });

  if (claimId) {
    await updateClaimInFirestore(claimId, {
      status: 'completed',
      completedAt: now,
      updatedAt: now
    });
  }
}

/* ----------------- MESSAGES ----------------- */

export async function sendChatMessageInFirestore(
  claimId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> {
  const path = `claims/${claimId}/messages`;
  try {
    const colRef = collection(db, 'claims', claimId, 'messages');
    await addDoc(colRef, {
      claimId,
      senderId,
      senderName,
      text: text.trim(),
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToClaimMessages(
  claimId: string,
  onMessages: (msgs: ChatMessage[]) => void
): () => void {
  const path = `claims/${claimId}/messages`;
  const colRef = collection(db, 'claims', claimId, 'messages');
  const q = query(colRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach(docSnap => {
        messages.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      onMessages(messages);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

/* ----------------- NOTIFICATIONS ----------------- */

export async function createNotificationInFirestore(
  notifData: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<void> {
  const path = 'notifications';
  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      ...notifData,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Error creating notification:', err);
  }
}

export async function getUserNotificationsFromFirestore(userId: string): Promise<AppNotification[]> {
  const path = 'notifications';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const notifs: AppNotification[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Omit<AppNotification, 'id'>;
      if (data.userId === userId) {
        notifs.push({ id: docSnap.id, ...data });
      }
    });
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Error loading notifications:', err);
    return [];
  }
}

export async function markNotificationAsReadInFirestore(notificationId: string): Promise<void> {
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { isRead: true });
  } catch (err) {
    console.warn('Error marking notification read:', err);
  }
}

export async function markAllNotificationsAsReadInFirestore(userId: string): Promise<void> {
  const notifs = await getUserNotificationsFromFirestore(userId);
  const unread = notifs.filter(n => !n.isRead);
  await Promise.all(unread.map(n => markNotificationAsReadInFirestore(n.id)));
}

/* ----------------- ABUSE REPORTS ----------------- */

export async function submitAbuseReportInFirestore(report: Omit<AbuseReport, 'id' | 'status' | 'createdAt'>): Promise<void> {
  const path = 'reports';
  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      ...report,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getAllAbuseReportsFromFirestore(): Promise<AbuseReport[]> {
  const path = 'reports';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const reports: AbuseReport[] = [];
    snapshot.forEach(docSnap => {
      reports.push({ id: docSnap.id, ...docSnap.data() } as AbuseReport);
    });
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Error loading abuse reports:', err);
    return [];
  }
}

export async function resolveAbuseReportInFirestore(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* ----------------- USERS (ADMIN) ----------------- */

export async function getAllUsersFromFirestore(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const users: UserProfile[] = [];
    snapshot.forEach(docSnap => {
      users.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
    });
    return users;
  } catch (err) {
    console.warn('Error getting users:', err);
    return [];
  }
}

export async function updateUserRoleInFirestore(userId: string, role: UserRole): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      role,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleUserSuspensionInFirestore(userId: string, isActive: boolean): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* ----------------- CAMPUS LOCATIONS & SETTINGS ----------------- */

export async function getCampusLocationsFromFirestore(): Promise<CampusLocation[]> {
  try {
    const colRef = collection(db, 'locations');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      return DEFAULT_LOCATIONS;
    }
    const locations: CampusLocation[] = [];
    snapshot.forEach(d => locations.push({ id: d.id, ...d.data() } as CampusLocation));
    return locations;
  } catch (err) {
    return DEFAULT_LOCATIONS;
  }
}

export async function saveCampusLocationInFirestore(location: CampusLocation): Promise<void> {
  try {
    const docRef = doc(db, 'locations', location.id);
    await setDoc(docRef, location);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `locations/${location.id}`);
  }
}

export async function getSystemSettingsFromFirestore(): Promise<SystemSettings> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as SystemSettings;
    }
  } catch (e) {
    // fallback
  }
  return {
    id: 'global',
    allowedDomain: '', // empty means any email allowed
    googleLoginEnabled: true,
    requireAdminApproval: false,
    announcementText: 'Lost items can be securely dropped off and picked up at the College Security Office or Central Reception.',
    announcementActive: true,
    handoverLocations: DEFAULT_HANDOVER_LOCATIONS
  };
}

export async function updateSystemSettingsInFirestore(updates: Partial<SystemSettings>): Promise<void> {
  const docRef = doc(db, 'settings', 'global');
  await setDoc(docRef, updates, { merge: true });
}
