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
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, isOfflineError, OperationType } from './firebase';
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

/* ----------------- LOCAL PERSISTENCE HELPERS ----------------- */

const ITEMS_KEY = 'campusfind_items';
const CLAIMS_KEY = 'campusfind_claims';
const NOTIFICATIONS_KEY = 'campusfind_notifications';
const REPORTS_KEY = 'campusfind_reports';
const SETTINGS_KEY = 'campusfind_system_settings';
const LOCATIONS_KEY = 'campusfind_locations';
const USERS_KEY = 'campusfind_users';

export const INITIAL_SAMPLE_ITEMS: Item[] = [
  {
    id: 'sample-item-1',
    type: 'found',
    title: 'Casio FX-991EX Scientific Calculator',
    category: 'Electronics',
    locationId: 'main-block',
    locationName: 'Main Block',
    currentPossession: 'Room 204, Second floor desk row 3',
    dateOfIncident: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    status: 'open',
    description: 'Black Casio ClassWiz calculator left after morning Physics examination. It is in good condition with minor scratches on sliding cover.',
    secretIdentifyingDetails: 'Sticker on battery cover or inscribed initials inside cover',
    contactPreference: 'in_app',
    reportedBy: 'admin-system-seed',
    reporterName: 'Campus Security Desk',
    imageUrls: [],
    isDeleted: false,
    reportedCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString()
  },
  {
    id: 'sample-item-2',
    type: 'lost',
    title: 'Navy Blue Hydro Flask Water Bottle (32oz)',
    category: 'Water Bottle',
    locationId: 'library',
    locationName: 'Library',
    currentPossession: 'Quiet study tables on the 1st Floor',
    dateOfIncident: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    status: 'open',
    description: 'Deep navy blue metal bottle with an insulated wide-mouth straw lid. Has multiple tech and campus club stickers.',
    secretIdentifyingDetails: 'Specific laptop sticker brands on side or dent on lower rim',
    contactPreference: 'in_app',
    reportedBy: 'student-ananya',
    reporterName: 'Ananya Sharma',
    imageUrls: [],
    isDeleted: false,
    reportedCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString()
  },
  {
    id: 'sample-item-3',
    type: 'found',
    title: 'Official Student ID Card - Computer Science Dept',
    category: 'ID Card',
    locationId: 'bus-stop',
    locationName: 'Campus Bus Stop',
    currentPossession: 'College Security Office (Main Gate)',
    dateOfIncident: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: 'open',
    description: 'Found smart campus identity card on the wooden bench. Deposited securely with the College Main Gate Security.',
    secretIdentifyingDetails: 'Student USN / Roll number and branch name',
    contactPreference: 'in_app',
    reportedBy: 'admin-system-seed',
    reporterName: 'Officer Murthy (Security)',
    imageUrls: [],
    isDeleted: false,
    reportedCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: 'sample-item-4',
    type: 'found',
    title: 'Apple AirPods Pro (2nd Gen) in Case',
    category: 'Earphones',
    locationId: 'sports-area',
    locationName: 'Sports Arena & Gym',
    currentPossession: 'Badminton court 2 spectator bench',
    dateOfIncident: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    status: 'open',
    description: 'White AirPods charging case with both buds inside. Has a clear silicone protective shell.',
    secretIdentifyingDetails: 'Exact Bluetooth broadcast name or keychain attachment',
    contactPreference: 'in_app',
    reportedBy: 'student-karthik',
    reporterName: 'Karthik Rao',
    imageUrls: [],
    isDeleted: false,
    reportedCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
  },
  {
    id: 'sample-item-5',
    type: 'lost',
    title: 'Dell 65W USB-C Laptop Charger',
    category: 'Charger',
    locationId: 'laboratory',
    locationName: 'Laboratory Complex',
    currentPossession: 'Computer Lab 3, Workstation #18',
    dateOfIncident: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    status: 'open',
    description: 'Standard black Dell Type-C charging adapter with three-pin cable. Wrapped with a yellow cable tie.',
    secretIdentifyingDetails: 'Marking or initials written on the adapter block',
    contactPreference: 'in_app',
    reportedBy: 'student-rahul',
    reporterName: 'Rahul Verma',
    imageUrls: [],
    isDeleted: false,
    reportedCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString()
  },
  {
    id: 'sample-item-6',
    type: 'lost',
    title: 'Brown Leather Bi-fold Wallet',
    category: 'Wallet',
    locationId: 'canteen',
    locationName: 'Canteen & Food Court',
    currentPossession: 'College Security Office (Main Gate)',
    dateOfIncident: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    status: 'returned',
    description: 'WildHorn genuine brown leather wallet with metro transit pass and library card. Verified and returned to owner!',
    secretIdentifyingDetails: 'Bank card bank name and family photo inside',
    contactPreference: 'in_app',
    reportedBy: 'student-sneha',
    reporterName: 'Sneha Patel',
    imageUrls: [],
    isDeleted: false,
    reportedCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString()
  }
];

function getStoredItems(): Item[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  // Initialize with samples if empty
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(INITIAL_SAMPLE_ITEMS));
  } catch {}
  return INITIAL_SAMPLE_ITEMS;
}

function setStoredItems(items: Item[]): void {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch {}
}

function getStoredClaims(): Claim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setStoredClaims(claims: Claim[]): void {
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  } catch {}
}

function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setStoredNotifications(notifs: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  } catch {}
}

function getStoredReports(): AbuseReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setStoredReports(reports: AbuseReport[]): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch {}
}

function getStoredMessages(claimId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`campusfind_messages_${claimId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function setStoredMessages(claimId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`campusfind_messages_${claimId}`, JSON.stringify(messages));
  } catch {}
}

/* ----------------- ITEMS ----------------- */

export async function createItemInFirestore(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'items';
  const now = new Date().toISOString();
  const localId = 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const newItem: Item = {
    ...itemData,
    id: localId,
    isDeleted: false,
    reportedCount: 0,
    createdAt: now,
    updatedAt: now
  };

  // 1. Immediately store in local persistence
  const currentItems = getStoredItems();
  setStoredItems([newItem, ...currentItems]);

  // 2. Attempt Firestore creation if online
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      ...itemData,
      isDeleted: false,
      reportedCount: 0,
      createdAt: now,
      updatedAt: now
    });
    // Replace temporary local ID with real Firestore document ID
    const updatedItems = getStoredItems().map(it => it.id === localId ? { ...it, id: docRef.id } : it);
    setStoredItems(updatedItems);
    return docRef.id;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Operating in local-storage mode: Item saved locally with ID:', localId);
      return localId;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateItemInFirestore(itemId: string, updates: Partial<Item>): Promise<void> {
  const path = `items/${itemId}`;
  const now = new Date().toISOString();

  // 1. Update local item
  const currentItems = getStoredItems();
  const updatedItems = currentItems.map(it => it.id === itemId ? { ...it, ...updates, updatedAt: now } : it);
  setStoredItems(updatedItems);

  // 2. Attempt Firestore
  try {
    const docRef = doc(db, 'items', itemId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now
    });
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Operating in local-storage mode: Item updated locally:', itemId);
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function softDeleteItemInFirestore(itemId: string): Promise<void> {
  await updateItemInFirestore(itemId, { isDeleted: true, status: 'closed' });
}

export async function getItemByIdFromFirestore(itemId: string): Promise<Item | null> {
  const path = `items/${itemId}`;
  const localItem = getStoredItems().find(it => it.id === itemId);

  try {
    const docRef = doc(db, 'items', itemId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const remote = { id: snapshot.id, ...snapshot.data() } as Item;
      // Sync local copy
      const items = getStoredItems().map(it => it.id === itemId ? remote : it);
      if (!items.some(it => it.id === itemId)) items.push(remote);
      setStoredItems(items);
      return remote;
    }
    return localItem || null;
  } catch (err) {
    if (isOfflineError(err) || localItem) {
      return localItem || null;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function getAllItemsFromFirestore(includeDeleted = false): Promise<Item[]> {
  const path = 'items';
  const localItems = getStoredItems();

  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: Item[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<Item, 'id'>;
        if (includeDeleted || !data.isDeleted) {
          items.push({ id: docSnap.id, ...data });
        }
      });
      const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStoredItems(sorted);
      return sorted;
    }
  } catch (err) {
    // Silently fall back to local items when offline or unprovisioned
    if (!isOfflineError(err)) {
      console.warn('Notice loading items from cloud, using local store:', err);
    }
  }

  const filtered = includeDeleted ? localItems : localItems.filter(i => !i.isDeleted);
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  } catch {
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
  const now = new Date().toISOString();
  const localId = 'claim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const newClaim: Claim = {
    ...claimData,
    id: localId,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  // 1. Local persistence
  const currentClaims = getStoredClaims();
  setStoredClaims([newClaim, ...currentClaims]);

  // Create notification locally
  await createNotificationInFirestore({
    userId: claimData.ownerId,
    type: 'claim_request',
    title: 'New Claim Request',
    message: `${claimData.claimantName} submitted a claim verification for "${claimData.itemTitle}".`,
    relatedItemId: claimData.itemId,
    relatedClaimId: localId
  });

  // 2. Attempt Firestore
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      ...claimData,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    });
    const updatedClaims = getStoredClaims().map(c => c.id === localId ? { ...c, id: docRef.id } : c);
    setStoredClaims(updatedClaims);
    return docRef.id;
  } catch (err) {
    if (isOfflineError(err)) {
      console.warn('Operating in local-storage mode: Claim created locally:', localId);
      return localId;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateClaimInFirestore(claimId: string, updates: Partial<Claim>): Promise<void> {
  const path = `claims/${claimId}`;
  const now = new Date().toISOString();

  // Local update
  const current = getStoredClaims();
  const updated = current.map(c => c.id === claimId ? { ...c, ...updates, updatedAt: now } : c);
  setStoredClaims(updated);

  try {
    const docRef = doc(db, 'claims', claimId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now
    });
  } catch (err) {
    if (isOfflineError(err)) {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getAllClaimsFromFirestore(): Promise<Claim[]> {
  const path = 'claims';
  const localClaims = getStoredClaims();

  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const claims: Claim[] = [];
      snapshot.forEach(docSnap => {
        claims.push({ id: docSnap.id, ...docSnap.data() } as Claim);
      });
      const sorted = claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStoredClaims(sorted);
      return sorted;
    }
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Notice fetching claims from cloud, using local store:', err);
    }
  }

  return localClaims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  const now = new Date().toISOString();
  const localMsg: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    claimId,
    senderId,
    senderName,
    text: text.trim(),
    isRead: false,
    createdAt: now
  };

  // 1. Store locally
  const currentMsgs = getStoredMessages(claimId);
  const nextMsgs = [...currentMsgs, localMsg];
  setStoredMessages(claimId, nextMsgs);

  // Dispatch storage event so active subscriber components update immediately
  window.dispatchEvent(new CustomEvent(`campusfind_msg_event_${claimId}`, { detail: nextMsgs }));

  // 2. Try Firestore
  try {
    const colRef = collection(db, 'claims', claimId, 'messages');
    await addDoc(colRef, {
      claimId,
      senderId,
      senderName,
      text: text.trim(),
      isRead: false,
      createdAt: now
    });
  } catch (err) {
    if (isOfflineError(err)) {
      return;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToClaimMessages(
  claimId: string,
  onMessages: (msgs: ChatMessage[]) => void
): () => void {
  const path = `claims/${claimId}/messages`;
  // Initial emit from local storage immediately
  const initialLocal = getStoredMessages(claimId);
  onMessages(initialLocal);

  // Listen to local event
  const handleLocalEvent = (e: any) => {
    if (e.detail) {
      onMessages(e.detail);
    }
  };
  window.addEventListener(`campusfind_msg_event_${claimId}`, handleLocalEvent);

  let unsubscribeFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, 'claims', claimId, 'messages');
    const q = query(colRef, orderBy('createdAt', 'asc'));

    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach(docSnap => {
          messages.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
        });
        if (messages.length > 0) {
          setStoredMessages(claimId, messages);
          onMessages(messages);
        }
      },
      (err) => {
        if (!isOfflineError(err)) {
          console.warn('Notice listening to chat messages:', err);
        }
      }
    );
  } catch {
    // offline
  }

  return () => {
    window.removeEventListener(`campusfind_msg_event_${claimId}`, handleLocalEvent);
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
}

/* ----------------- NOTIFICATIONS ----------------- */

export async function createNotificationInFirestore(
  notifData: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<void> {
  const path = 'notifications';
  const now = new Date().toISOString();
  const newNotif: AppNotification = {
    ...notifData,
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    isRead: false,
    createdAt: now
  };

  const current = getStoredNotifications();
  setStoredNotifications([newNotif, ...current]);

  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      ...notifData,
      isRead: false,
      createdAt: now
    });
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Error creating notification:', err);
    }
  }
}

export async function getUserNotificationsFromFirestore(userId: string): Promise<AppNotification[]> {
  const path = 'notifications';
  const localNotifs = getStoredNotifications().filter(n => n.userId === userId);

  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const notifs: AppNotification[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<AppNotification, 'id'>;
        if (data.userId === userId) {
          notifs.push({ id: docSnap.id, ...data });
        }
      });
      const sorted = notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted;
    }
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Notice loading notifications:', err);
    }
  }

  return localNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationAsReadInFirestore(notificationId: string): Promise<void> {
  const current = getStoredNotifications();
  const updated = current.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
  setStoredNotifications(updated);

  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { isRead: true });
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Error marking notification read:', err);
    }
  }
}

export async function markAllNotificationsAsReadInFirestore(userId: string): Promise<void> {
  const current = getStoredNotifications();
  const updated = current.map(n => n.userId === userId ? { ...n, isRead: true } : n);
  setStoredNotifications(updated);

  const notifs = await getUserNotificationsFromFirestore(userId);
  const unread = notifs.filter(n => !n.isRead);
  await Promise.all(unread.map(n => markNotificationAsReadInFirestore(n.id)));
}

/* ----------------- ABUSE REPORTS ----------------- */

export async function submitAbuseReportInFirestore(report: Omit<AbuseReport, 'id' | 'status' | 'createdAt'>): Promise<void> {
  const path = 'reports';
  const now = new Date().toISOString();
  const localRep: AbuseReport = {
    ...report,
    id: 'report_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    status: 'pending',
    createdAt: now
  };

  const current = getStoredReports();
  setStoredReports([localRep, ...current]);

  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      ...report,
      status: 'pending',
      createdAt: now
    });
  } catch (err) {
    if (isOfflineError(err)) {
      return;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getAllAbuseReportsFromFirestore(): Promise<AbuseReport[]> {
  const path = 'reports';
  const local = getStoredReports();

  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const reports: AbuseReport[] = [];
      snapshot.forEach(docSnap => {
        reports.push({ id: docSnap.id, ...docSnap.data() } as AbuseReport);
      });
      const sorted = reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStoredReports(sorted);
      return sorted;
    }
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Notice loading abuse reports:', err);
    }
  }

  return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function resolveAbuseReportInFirestore(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
  const path = `reports/${reportId}`;
  const current = getStoredReports();
  setStoredReports(current.map(r => r.id === reportId ? { ...r, status } : r));

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, { status });
  } catch (err) {
    if (isOfflineError(err)) {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* ----------------- USERS (ADMIN) ----------------- */

export async function getAllUsersFromFirestore(): Promise<UserProfile[]> {
  const path = 'users';

  // Seed default admin and sample users into local storage if not present
  const defaultSampleUsers: UserProfile[] = [
    {
      uid: 'admin-preetham',
      name: 'Preetham (Campus Admin)',
      email: 'preethamirl@gmail.com',
      role: 'admin',
      department: 'Administration',
      college: 'Campus University',
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: 'admin-prajju',
      name: 'Preetham M (Campus Super Admin)',
      email: 'prajju.m016@gmail.com',
      role: 'superadmin',
      department: 'Computer Science',
      college: 'Campus University',
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: 'student-ananya',
      name: 'Ananya Sharma',
      email: 'ananya.s@campus.edu',
      role: 'student',
      department: 'Electrical Engineering',
      year: '3rd Year',
      studentId: 'EE2023-045',
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      uid: 'student-karthik',
      name: 'Karthik Rao',
      email: 'karthik.r@campus.edu',
      role: 'student',
      department: 'Mechanical Engineering',
      year: '2nd Year',
      studentId: 'ME2024-012',
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 100).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  let localUsers = defaultSampleUsers;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      localUsers = JSON.parse(raw);
    } else {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultSampleUsers));
    }
  } catch {}

  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const users: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        users.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      return users;
    }
  } catch (err) {
    if (!isOfflineError(err)) {
      console.warn('Notice loading users:', err);
    }
  }

  return localUsers;
}

export async function updateUserRoleInFirestore(userId: string, role: UserRole): Promise<void> {
  const path = `users/${userId}`;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const users: UserProfile[] = JSON.parse(raw);
      const updated = users.map(u => u.uid === userId ? { ...u, role, updatedAt: new Date().toISOString() } : u);
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    }
  } catch {}

  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      role,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    if (isOfflineError(err)) {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleUserSuspensionInFirestore(userId: string, isActive: boolean): Promise<void> {
  const path = `users/${userId}`;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const users: UserProfile[] = JSON.parse(raw);
      const updated = users.map(u => u.uid === userId ? { ...u, isActive, updatedAt: new Date().toISOString() } : u);
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    }
  } catch {}

  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    if (isOfflineError(err)) {
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* ----------------- CAMPUS LOCATIONS & SETTINGS ----------------- */

export async function getCampusLocationsFromFirestore(): Promise<CampusLocation[]> {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    const colRef = collection(db, 'locations');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const locations: CampusLocation[] = [];
      snapshot.forEach(d => locations.push({ id: d.id, ...d.data() } as CampusLocation));
      try {
        localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
      } catch {}
      return locations;
    }
  } catch {}

  return DEFAULT_LOCATIONS;
}

export async function saveCampusLocationInFirestore(location: CampusLocation): Promise<void> {
  try {
    const current = await getCampusLocationsFromFirestore();
    const updated = [...current.filter(l => l.id !== location.id), location];
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(updated));
  } catch {}

  try {
    const docRef = doc(db, 'locations', location.id);
    await setDoc(docRef, location);
  } catch (err) {
    if (!isOfflineError(err)) {
      handleFirestoreError(err, OperationType.WRITE, `locations/${location.id}`);
    }
  }
}

export async function getSystemSettingsFromFirestore(): Promise<SystemSettings> {
  const defaultSettings: SystemSettings = {
    id: 'global',
    allowedDomain: '', // empty means any email allowed
    googleLoginEnabled: true,
    requireAdminApproval: false,
    announcementText: 'Lost items can be securely dropped off and picked up at the College Security Office or Central Reception.',
    announcementActive: true,
    handoverLocations: DEFAULT_HANDOVER_LOCATIONS
  };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {}

  try {
    const docRef = doc(db, 'settings', 'global');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as SystemSettings;
      const merged = { ...defaultSettings, ...data };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch {}

  return defaultSettings;
}

export async function updateSystemSettingsInFirestore(updates: Partial<SystemSettings>): Promise<void> {
  try {
    const current = await getSystemSettingsFromFirestore();
    const merged = { ...current, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {}

  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, updates, { merge: true });
  } catch (err) {
    if (!isOfflineError(err)) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    }
  }
}
