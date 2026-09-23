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
  ExternalLink
} from 'lucide-react';
import {
  Item,
  Claim,
  AbuseReport,
  UserProfile,
  CampusLocation,
  SystemSettings,
  UserRole
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
  markItemReturnedInFirestore
} from '../../lib/firestoreService';

interface AdminDashboardProps {
  navigate: (route: string, params?: Record<string, any>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { currentUser, isAdmin, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'claims' | 'reports' | 'users' | 'locations' | 'settings'>('overview');

  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // New location state
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      try {
        const [itemsList, claimsList, reportsList, usersList, locsList, sysSettings] =
          await Promise.all([
            getAllItemsFromFirestore(true),
            getAllClaimsFromFirestore(),
            getAllAbuseReportsFromFirestore(),
            getAllUsersFromFirestore(),
            getCampusLocationsFromFirestore(),
            getSystemSettingsFromFirestore()
          ]);

        setItems(itemsList);
        setClaims(claimsList);
        setReports(reportsList);
        setUsers(usersList);
        setLocations(locsList);
        setSettings(sysSettings);
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
      setUsers(users.map(u => (u.uid === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleToggleSuspension = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserSuspensionInFirestore(userId, !currentStatus);
      setUsers(users.map(u => (u.uid === userId ? { ...u, isActive: !currentStatus } : u)));
    } catch (err) {
      console.error('Failed to toggle suspension:', err);
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
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 font-medium ${
            activeTab === 'items'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Items ({items.length})
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
            <div className="card-stylish p-4 rounded-xl">
              <span className="text-xs text-slate-400 block font-medium">Total Users</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
                {users.length}
              </span>
            </div>
            <div className="card-stylish p-4 rounded-xl">
              <span className="text-xs text-slate-400 block font-medium">Lost Items</span>
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-1 block">
                {items.filter(i => i.type === 'lost' && !i.isDeleted).length}
              </span>
            </div>
            <div className="card-stylish p-4 rounded-xl">
              <span className="text-xs text-slate-400 block font-medium">Found Items</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
                {items.filter(i => i.type === 'found' && !i.isDeleted).length}
              </span>
            </div>
            <div className="card-stylish p-4 rounded-xl">
              <span className="text-xs text-slate-400 block font-medium">Active Claims</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1 block">
                {claims.filter(c => c.status === 'pending' || c.status === 'accepted').length}
              </span>
            </div>
            <div className="card-stylish p-4 rounded-xl">
              <span className="text-xs text-slate-400 block font-medium">Reunited Items</span>
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono tabular-nums mt-1 block">
                {items.filter(i => i.status === 'returned').length}
              </span>
            </div>
            <div className="card-stylish p-4 rounded-xl">
              <span className="text-xs text-slate-400 block font-medium">Pending Reports</span>
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1 block">
                {pendingReportsCount}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent System Activity</h3>
            <div className="space-y-3">
              {items.slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${
                      item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}>
                      {item.type}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                    <span className="text-slate-400">by {item.reporterName}</span>
                  </div>
                  <span className="text-slate-400">{item.dateOfIncident}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ITEMS MODERATION */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2">Title</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Location</th>
                  <th className="pb-3 px-2">Reporter</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${
                        item.type === 'lost' ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{item.category}</td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{item.locationName}</td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{item.reporterName}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.isDeleted ? 'Deleted' : item.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      <button
                        onClick={() => navigate('item-detail', { id: item.id })}
                        className="text-theme-main hover:underline font-medium"
                      >
                        View
                      </button>
                      {!item.isDeleted && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Tab 5: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="pb-3 px-2">Name</th>
                <th className="pb-3 px-2">Email</th>
                <th className="pb-3 px-2">Department</th>
                <th className="pb-3 px-2">Role</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">{u.name}</td>
                  <td className="py-3 px-2 text-slate-500">{u.email}</td>
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
                      u.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {u.isActive !== false ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => handleToggleSuspension(u.uid, u.isActive !== false)}
                      className={`text-xs font-semibold ${
                        u.isActive !== false ? 'text-rose-600 hover:underline' : 'text-emerald-600 hover:underline'
                      }`}
                    >
                      {u.isActive !== false ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
