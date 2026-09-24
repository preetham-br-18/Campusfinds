import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Layers,
  Flag,
  Settings,
  MapPin,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Search,
  Volume2,
  Save,
  Lock,
  UserCheck,
  UserX,
  ExternalLink,
  Check,
  X,
  History,
  AlertOctagon,
  Loader2
} from 'lucide-react';
import {
  Item,
  Claim,
  AbuseReport,
  UserProfile,
  CampusLocation,
  SystemSettings,
  UserRole,
  AdminAuditLog,
  ListingReport
} from '../../types';
import { useAuth } from '../../lib/authContext';
import { UnauthorizedPage } from './UnauthorizedPage';
import {
  getAllItemsFromFirestore,
  getAllClaimsFromFirestore,
  getAllAbuseReportsFromFirestore,
  getAllUsersFromFirestore,
  updateUserRoleInFirestore,
  toggleUserSuspensionInFirestore,
  softDeleteItemInFirestore,
  resolveAbuseReportInFirestore,
  getCampusLocationsFromFirestore,
  saveCampusLocationInFirestore,
  getSystemSettingsFromFirestore,
  updateSystemSettingsInFirestore,
  markItemReturnedInFirestore,
  moderateReportInFirestore,
  restrictUserInFirestore,
  getAdminAuditLogsFromFirestore,
  getListingReportsFromFirestore,
  resolveListingReportInFirestore
} from '../../lib/firestoreService';

interface AdminDashboardProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { currentUser, isAdmin, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'items' | 'claims' | 'reports' | 'flagged' | 'users' | 'audit' | 'locations' | 'settings'
  >('overview');

  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [listingReports, setListingReports] = useState<ListingReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [itemStatusFilter, setItemStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspicious' | 'rejected' | 'flagged'>('all');
  const [modActionLoading, setModActionLoading] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

  // New location state
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      try {
        const [itemsList, claimsList, reportsList, usersList, locsList, sysSettings, logsList, flagsList] =
          await Promise.all([
            getAllItemsFromFirestore(true, false),
            getAllClaimsFromFirestore(),
            getAllAbuseReportsFromFirestore(),
            getAllUsersFromFirestore(),
            getCampusLocationsFromFirestore(),
            getSystemSettingsFromFirestore(),
            getAdminAuditLogsFromFirestore(),
            getListingReportsFromFirestore()
          ]);

        setItems(itemsList);
        setClaims(claimsList);
        setReports(reportsList);
        setUsers(usersList);
        setLocations(locsList);
        setSettings(sysSettings);
        setAuditLogs(logsList);
        setListingReports(flagsList);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  if (!isAdmin) {
    return <UnauthorizedPage navigate={navigate} />;
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const prevRole = users.find(u => u.uid === userId)?.role || 'student';
    // Instant optimistic update (0ms lag)
    setUsers(prev => prev.map(u => (u.uid === userId ? { ...u, role: newRole } : u)));
    setUserActionLoading(userId);

    try {
      if (currentUser) {
        try {
          const idToken = (await getIdToken()) || (typeof currentUser.getIdToken === 'function' ? await currentUser.getIdToken() : null);
          if (idToken) {
            await fetch('/api/admin/set-claim', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                uid: userId,
                admin: newRole === 'admin' || newRole === 'superadmin'
              })
            });
          }
        } catch (serverErr) {
          console.warn('Backend custom claim sync notice:', serverErr);
        }
      }
      await updateUserRoleInFirestore(userId, newRole);
      getAdminAuditLogsFromFirestore().then(setAuditLogs).catch(() => {});
    } catch (err) {
      console.error('Failed to update role:', err);
      // Revert if failed
      setUsers(prev => prev.map(u => (u.uid === userId ? { ...u, role: prevRole } : u)));
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleToggleSuspension = async (userId: string, currentStatus: boolean) => {
    const newActive = !currentStatus;
    // Instant optimistic UI update (0ms lag)
    setUserActionLoading(userId);
    setUsers(prev => prev.map(u => (u.uid === userId ? { ...u, isActive: newActive } : u)));

    try {
      await toggleUserSuspensionInFirestore(userId, newActive);
      getAdminAuditLogsFromFirestore().then(setAuditLogs).catch(() => {});
    } catch (err) {
      console.error('Failed to toggle suspension:', err);
      // Revert if failed
      setUsers(prev => prev.map(u => (u.uid === userId ? { ...u, isActive: currentStatus } : u)));
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Soft-delete this listing? It will no longer appear in the directory.')) return;
    try {
      await softDeleteItemInFirestore(itemId);
      setItems(items.map(i => (i.id === itemId ? { ...i, isDeleted: true, status: 'closed' } : i)));
    } catch (err) {
      console.error('Error soft-deleting item:', err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await resolveAbuseReportInFirestore(reportId, status);
      setReports(reports.map(r => (r.id === reportId ? { ...r, status } : r)));
    } catch (err) {
      console.error('Error resolving report:', err);
    }
  };

  const handleModerateItem = async (
    itemId: string,
    action: 'approve' | 'reject' | 'mark_suspicious' | 'resolve'
  ) => {
    let rejectionReason: string | undefined = undefined;
    let suspiciousReason: string | undefined = undefined;

    if (action === 'reject') {
      const reason = window.prompt('Enter reason for rejecting this report (will be visible to reporter):', 'Incomplete details or invalid listing');
      if (reason === null) return;
      rejectionReason = reason.trim() || 'Incomplete details';
    } else if (action === 'mark_suspicious') {
      const reason = window.prompt('Reason for flagging as suspicious (internal note):', 'Suspicious activity or unverified claim');
      if (reason === null) return;
      suspiciousReason = reason.trim() || 'Potential spam/unverified';
    }

    setModActionLoading(itemId);
    try {
      await moderateReportInFirestore(itemId, action, { rejectionReason, suspiciousReason });
      
      const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'mark_suspicious' ? 'suspicious' : 'resolved';
      setItems(items.map(i => (i.id === itemId ? {
        ...i,
        status: newStatus,
        moderatedBy: currentUser?.uid,
        rejectionReason: rejectionReason || i.rejectionReason,
        suspiciousReason: suspiciousReason || i.suspiciousReason
      } : i)));

      // Refresh audit logs
      const updatedLogs = await getAdminAuditLogsFromFirestore();
      setAuditLogs(updatedLogs);
    } catch (err: any) {
      console.error('Error moderating item:', err);
      alert(err.message || 'Failed to update item moderation status.');
    } finally {
      setModActionLoading(null);
    }
  };

  const handleToggleUserRestriction = async (userId: string, currentlyRestricted: boolean) => {
    const newRestricted = !currentlyRestricted;
    const restrictionUntil = newRestricted ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;

    // Instant optimistic UI update (0ms lag)
    setUserActionLoading(userId);
    setUsers(prev => prev.map(u => (u.uid === userId ? {
      ...u,
      reportingRestricted: newRestricted,
      restrictionUntil
    } : u)));

    try {
      await restrictUserInFirestore(userId, newRestricted, 24, 'Administrative moderation action');
      getAdminAuditLogsFromFirestore().then(setAuditLogs).catch(() => {});
    } catch (err: any) {
      console.error('Error restricting user:', err);
      // Revert if failed
      setUsers(prev => prev.map(u => (u.uid === userId ? {
        ...u,
        reportingRestricted: currentlyRestricted,
        restrictionUntil: currentlyRestricted ? u.restrictionUntil : undefined
      } : u)));
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleResolveListingReport = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    try {
      await resolveListingReportInFirestore(reportId, status);
      setListingReports(listingReports.map(lr => (lr.id === reportId ? { ...lr, status } : lr)));
    } catch (err: any) {
      console.error('Error resolving listing report:', err);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    const newLoc: CampusLocation = {
      id: newLocName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: newLocName.trim(),
      description: newLocDesc.trim()
    };
    try {
      await saveCampusLocationInFirestore(newLoc);
      setLocations([...locations, newLoc]);
      setNewLocName('');
      setNewLocDesc('');
    } catch (err) {
      console.error('Failed to add location:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await updateSystemSettingsInFirestore(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Campus Governance
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Admin Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
            Administration Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authenticated as <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser?.email || 'Administrator'}</span> · Full control of campus listings, custom roles, claims, and audit parameters.
          </p>
        </div>
      </div>

      {/* Segmented Navigation Bar */}
      <div className="flex overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 text-xs font-medium space-x-1 border border-slate-200/60 dark:border-slate-700/60">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`relative px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'items'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Items ({items.length})
          {items.filter(i => i.status === 'pending').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-mono">
              {items.filter(i => i.status === 'pending').length} pending
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'claims'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Claims ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`relative px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'reports'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Abuse Reports ({reports.length})
          {pendingReportsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-mono">
              {pendingReportsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`relative px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'flagged'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Flagged Listings ({listingReports.length})
          {listingReports.filter(l => l.status === 'pending').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-mono">
              {listingReports.filter(l => l.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'users'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'locations'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Locations ({locations.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Campus Settings
        </button>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <button
              onClick={() => setActiveTab('users')}
              className="card-stylish p-4 rounded-xl text-left hover:border-theme-main transition-colors group cursor-pointer"
            >
              <span className="text-xs text-slate-400 group-hover:text-theme-main block font-medium transition-colors">Total Users &rarr;</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
                {users.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('items'); setItemStatusFilter('all'); }}
              className="card-stylish p-4 rounded-xl text-left hover:border-rose-400 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-slate-400 group-hover:text-rose-600 block font-medium transition-colors">Lost Items &rarr;</span>
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1 block">
                {items.filter(i => i.type === 'lost' && !i.isDeleted).length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('items'); setItemStatusFilter('all'); }}
              className="card-stylish p-4 rounded-xl text-left hover:border-emerald-400 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-slate-400 group-hover:text-emerald-600 block font-medium transition-colors">Found Items &rarr;</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
                {items.filter(i => i.type === 'found' && !i.isDeleted).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className="card-stylish p-4 rounded-xl text-left hover:border-blue-400 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-slate-400 group-hover:text-blue-600 block font-medium transition-colors">Active Claims &rarr;</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1 block">
                {claims.filter(c => c.status === 'pending' || c.status === 'accepted').length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('items'); setItemStatusFilter('all'); }}
              className="card-stylish p-4 rounded-xl text-left hover:border-slate-400 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-slate-400 group-hover:text-slate-700 block font-medium transition-colors">Reunited Items &rarr;</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono tabular-nums mt-1 block">
                {items.filter(i => i.status === 'returned').length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('items'); setItemStatusFilter('pending'); }}
              className="card-stylish p-4 rounded-xl text-left hover:border-amber-400 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-slate-400 group-hover:text-amber-600 block font-medium transition-colors">Pending Reports &rarr;</span>
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1 block">
                {pendingReportsCount}
              </span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent System Activity</h3>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No recent activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {items.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate('item-detail', { id: item.id })}
                    className="flex items-center justify-between text-xs py-2 px-2 rounded-lg border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${
                        item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}>
                        {item.type}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 hover:text-theme-main">{item.title}</span>
                      <span className="text-slate-400">by {item.reporterName}</span>
                    </div>
                    <span className="text-slate-400">{item.dateOfIncident}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: ITEMS MODERATION */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Sub-filters and search bar for items moderation */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
              <span className="text-slate-400 font-medium px-2">Filter:</span>
              <button
                onClick={() => setItemStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  itemStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Items ({items.length})
              </button>
              <button
                onClick={() => setItemStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  itemStatusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pending Verification ({items.filter(i => i.status === 'pending').length})
              </button>
              <button
                onClick={() => setItemStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  itemStatusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Live & Approved ({items.filter(i => i.status === 'approved' || i.status === 'open').length})
              </button>
              <button
                onClick={() => setItemStatusFilter('suspicious')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  itemStatusFilter === 'suspicious'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Flagged Suspicious ({items.filter(i => i.status === 'suspicious').length})
              </button>
              <button
                onClick={() => setItemStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  itemStatusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Rejected ({items.filter(i => i.status === 'rejected').length})
              </button>
              <button
                onClick={() => setItemStatusFilter('flagged')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  itemStatusFilter === 'flagged'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Duplicates / Flagged ({items.filter(i => i.isDuplicate || i.duplicateWarning || i.flaggedForReview).length})
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-theme-main"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {(() => {
            const filtered = items.filter(item => {
              if (itemStatusFilter === 'pending' && item.status !== 'pending') return false;
              if (itemStatusFilter === 'approved' && item.status !== 'approved' && item.status !== 'open') return false;
              if (itemStatusFilter === 'suspicious' && item.status !== 'suspicious') return false;
              if (itemStatusFilter === 'rejected' && item.status !== 'rejected') return false;
              if (itemStatusFilter === 'flagged' && !item.isDuplicate && !item.duplicateWarning && !item.flaggedForReview) return false;

              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const match =
                  (item.title && item.title.toLowerCase().includes(q)) ||
                  (item.description && item.description.toLowerCase().includes(q)) ||
                  (item.category && item.category.toLowerCase().includes(q)) ||
                  (item.locationName && item.locationName.toLowerCase().includes(q)) ||
                  (item.reporterName && item.reporterName.toLowerCase().includes(q)) ||
                  (item.reporterEmail && item.reporterEmail.toLowerCase().includes(q));
                if (!match) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    No items found matching the selected filter ({itemStatusFilter !== 'all' ? `status: ${itemStatusFilter}` : ''} {searchQuery ? `query: "${searchQuery}"` : ''}).
                  </p>
                  <div className="flex justify-center gap-2">
                    {itemStatusFilter !== 'all' && (
                      <button
                        onClick={() => setItemStatusFilter('all')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100"
                      >
                        Show All Items ({items.length})
                      </button>
                    )}
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="pb-3 px-2">Type</th>
                      <th className="pb-3 px-2">Title & Alerts</th>
                      <th className="pb-3 px-2">Category</th>
                      <th className="pb-3 px-2">Location</th>
                      <th className="pb-3 px-2">Reporter</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${
                            item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-2 max-w-xs">
                          <div
                            onClick={() => navigate('item-detail', { id: item.id })}
                            className="font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-theme-main hover:underline"
                          >
                            {item.title}
                          </div>
                          {item.duplicateWarning && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-medium">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate max-w-[200px]">{item.duplicateWarning}</span>
                            </div>
                          )}
                          {item.flaggedForReview && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-[10px] font-medium ml-1">
                              <Flag className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Reported by community ({item.reportCount || 1})</span>
                            </div>
                          )}
                          {item.rejectionReason && (
                            <div className="mt-1 text-[10px] text-rose-500 italic">
                              Reason: {item.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{item.category}</td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{item.locationName}</td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                          <div>{item.reporterName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.reporterEmail}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.isDeleted
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              : item.status === 'pending'
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                              : item.status === 'approved' || item.status === 'open'
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                              : item.status === 'suspicious'
                              ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300'
                              : item.status === 'rejected'
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {item.isDeleted ? 'Deleted' : item.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right space-x-1.5 whitespace-nowrap">
                          {/* Quick Moderation Action buttons */}
                          {item.status !== 'approved' && item.status !== 'open' && !item.isDeleted && (
                            <button
                              disabled={modActionLoading === item.id}
                              onClick={() => handleModerateItem(item.id, 'approve')}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                              title="Approve report and publish to campus directory"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}
                          {item.status !== 'rejected' && !item.isDeleted && (
                            <button
                              disabled={modActionLoading === item.id}
                              onClick={() => handleModerateItem(item.id, 'reject')}
                              className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-semibold border border-rose-200 dark:border-rose-800 disabled:opacity-50 inline-flex items-center gap-1"
                              title="Reject report"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          )}
                          {item.status !== 'suspicious' && !item.isDeleted && (
                            <button
                              disabled={modActionLoading === item.id}
                              onClick={() => handleModerateItem(item.id, 'mark_suspicious')}
                              className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[11px] font-semibold border border-purple-200 dark:border-purple-800 disabled:opacity-50"
                              title="Mark as suspicious activity"
                            >
                              Suspicious
                            </button>
                          )}
                          <button
                            onClick={() => navigate('item-detail', { id: item.id })}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                          >
                            View
                          </button>
                          {!item.isDeleted && (
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Soft delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: CLAIMS MANAGEMENT */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-3 px-2">Item Title</th>
                  <th className="pb-3 px-2">Claimant</th>
                  <th className="pb-3 px-2">Finder/Owner</th>
                  <th className="pb-3 px-2">Verification Answer</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claims.map(claim => (
                  <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">
                      {claim.itemTitle}
                    </td>
                    <td className="py-3 px-2">{claim.claimantName}</td>
                    <td className="py-3 px-2">{claim.ownerName}</td>
                    <td className="py-3 px-2 italic text-slate-500 max-w-xs truncate">
                      "{claim.verificationAnswer}"
                    </td>
                    <td className="py-3 px-2 font-semibold uppercase">{claim.status}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => navigate('messages', { claimId: claim.id })}
                        className="text-theme-main hover:underline font-medium"
                      >
                        Inspect Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: ABUSE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No abuse reports reported.</div>
          ) : (
            reports.map(rep => (
              <div
                key={rep.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">
                    Reported Reason: {rep.reason}
                  </span>
                  <span className="text-slate-400">
                    Status: <strong className="uppercase">{rep.status}</strong>
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Target: {rep.targetTitle} ({rep.targetType})
                </p>
                {rep.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    "{rep.description}"
                  </p>
                )}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {rep.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'resolved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Take Action & Resolve
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: FLAGGED LISTINGS */}
      {activeTab === 'flagged' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Community Flagged Listings</h3>
            <span className="text-xs text-slate-400">
              {listingReports.filter(l => l.status === 'pending').length} pending review
            </span>
          </div>

          {listingReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No listings currently flagged by the community.
            </div>
          ) : (
            listingReports.map(flag => (
              <div
                key={flag.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold uppercase text-[10px]">
                    <Flag className="w-3 h-3" />
                    {flag.reason}
                  </span>
                  <span className="text-slate-400">
                    Status: <strong className="uppercase">{flag.status}</strong> · {flag.createdAt ? new Date(flag.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {flag.listingTitle || 'Flagged Item'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Listing ID: {flag.listingId}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('item-detail', { id: flag.listingId })}
                    className="text-xs text-theme-main font-semibold hover:underline"
                  >
                    View Listing &rarr;
                  </button>
                </div>

                {flag.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl">
                    "{flag.description}"
                  </p>
                )}

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {flag.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResolveListingReport(flag.id, 'dismissed')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold"
                      >
                        Dismiss Flag
                      </button>
                      <button
                        onClick={() => handleResolveListingReport(flag.id, 'reviewed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Mark Reviewed
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Campus Users Directory ({users.length})
            </h3>
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search users by name, email, department..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-theme-main"
              />
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {(() => {
            const filteredUsers = users.filter(u => {
              if (!userSearchQuery.trim()) return true;
              const q = userSearchQuery.toLowerCase().trim();
              return (
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.department && u.department.toLowerCase().includes(q)) ||
                (u.studentId && u.studentId.toLowerCase().includes(q)) ||
                (u.role && u.role.toLowerCase().includes(q))
              );
            });

            if (filteredUsers.length === 0) {
              return (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    No users found matching {userSearchQuery ? `"${userSearchQuery}"` : 'the criteria'}.
                  </p>
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200"
                    >
                      Clear User Search
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="pb-3 px-2">Name</th>
                      <th className="pb-3 px-2">Email</th>
                      <th className="pb-3 px-2">Department</th>
                      <th className="pb-3 px-2">Role</th>
                      <th className="pb-3 px-2">Account</th>
                      <th className="pb-3 px-2">Report Submissions</th>
                      <th className="pb-3 px-2 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="py-3 px-2 text-slate-500 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3 px-2 text-slate-500">{u.department || 'General'}</td>
                        <td className="py-3 px-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                          >
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="security">Security Staff</option>
                            <option value="admin">Administrator</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.isActive !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {u.isActive !== false ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase ${
                              u.reportingRestricted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {u.reportingRestricted ? 'Restricted (24h)' : 'Allowed'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {u.reportsSubmitted || 0} submitted ({u.reportsApproved || 0} approved, {u.reportsRejected || 0} rejected)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setActiveTab('items');
                              setItemStatusFilter('all');
                              setSearchQuery(u.email || u.name);
                            }}
                            className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                            title="View listings submitted by this user"
                          >
                            View Listings
                          </button>
                          <button
                            onClick={() => handleToggleUserRestriction(u.uid, !!u.reportingRestricted)}
                            disabled={userActionLoading === u.uid}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border transition-all ${
                              u.reportingRestricted
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                            } ${userActionLoading === u.uid ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                            title={u.reportingRestricted ? 'Lift restriction' : 'Restrict report submissions for 24 hours'}
                          >
                            {userActionLoading === u.uid ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            {u.reportingRestricted ? 'Lift Restriction' : 'Restrict 24h'}
                          </button>
                          <button
                            onClick={() => handleToggleSuspension(u.uid, u.isActive !== false)}
                            disabled={userActionLoading === u.uid}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border transition-all ${
                              u.isActive !== false
                                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                            } ${userActionLoading === u.uid ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                            title={u.isActive !== false ? 'Suspend user account' : 'Reactivate / Unsuspend user account'}
                          >
                            {userActionLoading === u.uid ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            {u.isActive !== false ? 'Suspend' : 'Unsuspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              Administrative Audit Logs
            </h3>
            <span className="text-xs text-slate-400">
              Chronological log of moderation decisions and restrictions
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No moderation actions logged yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-2">Timestamp</th>
                    <th className="pb-3 px-2">Action</th>
                    <th className="pb-3 px-2">Target</th>
                    <th className="pb-3 px-2">Admin</th>
                    <th className="pb-3 px-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                      </td>
                      <td className="py-2.5 px-2 font-bold uppercase text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${
                          log.action.includes('approve')
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : log.action.includes('reject') || log.action.includes('restrict')
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            : log.action.includes('suspicious')
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 text-xs">
                        <div className="font-semibold">{log.reportTitle || 'Report'}</div>
                        <div className="font-mono text-[10px] text-slate-400">ID: {log.reportId ? log.reportId.slice(0, 10) : 'N/A'}</div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-500">
                        {log.adminEmail || log.adminUid || 'Admin'}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 italic max-w-xs truncate">
                        {log.reason || log.moderationNotes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: CAMPUS LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          <form onSubmit={handleAddLocation} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add Campus Location Spot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Science Block Amphitheater"
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={newLocDesc}
                onChange={(e) => setNewLocDesc(e.target.value)}
                placeholder="Description or landmark notes"
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 btn-theme text-xs font-semibold rounded-xl"
            >
              Add Location
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {locations.map(loc => (
              <div
                key={loc.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start space-x-2.5"
              >
                <MapPin className="w-4 h-4 text-theme-main shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">{loc.name}</h5>
                  {loc.description && <p className="text-[11px] text-slate-400 mt-0.5">{loc.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: CAMPUS SETTINGS */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Campus Portal Configuration</h3>
            {settingsSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings saved!</span>
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Restricted Campus Email Domain
            </label>
            <input
              type="text"
              value={settings.allowedDomain || ''}
              onChange={(e) => setSettings({ ...settings, allowedDomain: e.target.value })}
              placeholder="e.g. college.edu (leave blank to allow all verified student emails)"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Campus Announcement Banner
            </label>
            <textarea
              rows={2}
              value={settings.announcementText || ''}
              onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
              placeholder="e.g. Lost ID cards and lab keys should be deposited at Central Security Office."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <label className="flex items-center space-x-2 mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={settings.announcementActive}
                onChange={(e) => setSettings({ ...settings, announcementActive: e.target.checked })}
                className="rounded accent-theme text-theme-main"
              />
              <span>Display announcement banner on homepage</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 btn-theme rounded-xl font-semibold text-xs flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
