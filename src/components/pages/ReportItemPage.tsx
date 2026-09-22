import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  MapPin,
  Calendar,
  Clock,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { Item, ItemType } from '../../types';
import { useAuth } from '../../lib/authContext';
import { DEFAULT_CATEGORIES } from '../../lib/constants';
import { getCampusLocationsFromFirestore, createItemInFirestore, getAllItemsFromFirestore } from '../../lib/firestoreService';
import { compressAndUploadImage } from '../../lib/storageService';
import { getAISuggestions } from '../../lib/aiService';
import { findPotentialDuplicates, MatchScoreResult } from '../../lib/matchingEngine';

interface ReportItemPageProps {
  initialType: ItemType;
  navigate: (route: string, params?: Record<string, any>) => void;
  openAuthModal: () => void;
}

export const ReportItemPage: React.FC<ReportItemPageProps> = ({
  initialType,
  navigate,
  openAuthModal
}) => {
  const { currentUser, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<ItemType>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [dateOfIncident, setDateOfIncident] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfIncident, setTimeOfIncident] = useState('');
  const [secretIdentifyingDetails, setSecretIdentifyingDetails] = useState('');
  const [currentPossession, setCurrentPossession] = useState('With finder');

  // Images state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);

  // Duplicates modal
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<MatchScoreResult[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successItemId, setSuccessItemId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [locs, items] = await Promise.all([
          getCampusLocationsFromFirestore(),
          getAllItemsFromFirestore()
        ]);
        setLocations(locs);
        if (locs.length > 0) {
          setLocationId(locs[0].id);
          setLocationName(locs[0].name);
        }
        setAllItems(items);
      } catch (err) {
        console.error('Failed to load locations:', err);
      }
    }
    loadData();
  }, []);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    setLocationId(locId);
    const found = locations.find(l => l.id === locId);
    if (found) setLocationName(found.name);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPG, PNG, and WebP images are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file must be smaller than 10MB.');
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    const combinedFiles = [...selectedFiles, ...validFiles].slice(0, 3);
    const combinedPreviews = [...imagePreviews, ...validPreviews].slice(0, 3);

    setSelectedFiles(combinedFiles);
    setImagePreviews(combinedPreviews);
    setError(null);
  };

  const removeImage = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setImagePreviews(updatedPreviews);
  };

  // AI Assistant fill
  const handleAIAssist = async () => {
    setAiAnalyzing(true);
    setError(null);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (selectedFiles.length > 0) {
        const file = selectedFiles[0];
        imageMimeType = file.type;
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(file);
        imageBase64 = await base64Promise;
      }

      const suggestion = await getAISuggestions({
        imageBase64,
        imageMimeType,
        titleHint: title,
        categoryHint: category
      });

      if (suggestion.suggestedTitle && !title) {
        setTitle(suggestion.suggestedTitle);
      }
      if (suggestion.suggestedCategory) {
        setCategory(suggestion.suggestedCategory);
      }
      if (suggestion.suggestedDescription && !description) {
        setDescription(suggestion.suggestedDescription);
      }
      setAiSource(suggestion.source);
    } catch (err: any) {
      console.warn('AI suggestion error:', err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Submission handler with duplicate detection check
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for the item.');
      return;
    }

    // Check for duplicates before publishing (PRD Section 60)
    const duplicates = findPotentialDuplicates(
      {
        title,
        description,
        category,
        type,
        locationId,
        locationName,
        dateOfIncident
      },
      allItems,
      50
    );

    if (duplicates.length > 0 && !showDuplicateModal) {
      setDuplicateMatches(duplicates);
      setShowDuplicateModal(true);
      return;
    }

    await performFinalPublish();
  };

  const performFinalPublish = async () => {
    setUploading(true);
    setError(null);

    try {
      // 1. Upload photos (with automatic compression)
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const url = await compressAndUploadImage(file, 'items');
        uploadedUrls.push(url);
      }

      // 2. Insert item into Firestore
      const newItemId = await createItemInFirestore({
        type,
        title: title.trim(),
        category,
        description: description.trim(),
        locationId,
        locationName: locationName || 'Campus Location',
        dateOfIncident,
        timeOfIncident: timeOfIncident || undefined,
        secretIdentifyingDetails: secretIdentifyingDetails.trim() || undefined,
        currentPossession: type === 'found' ? currentPossession : undefined,
        imageUrls: uploadedUrls,
        status: 'open',
        reportedBy: currentUser!.uid,
        reporterName: profile?.name || currentUser!.displayName || 'Campus Member',
        reporterEmail: currentUser!.email || '',
        reporterRole: profile?.role || 'student'
      });

      setSuccessItemId(newItemId);
      setShowDuplicateModal(false);
    } catch (err: any) {
      console.error('Failed to submit item report:', err);
      setError(err.message || 'Failed to submit report. Please check your network connection.');
    } finally {
      setUploading(false);
    }
  };

  if (successItemId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Report Published Successfully!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your {type} item listing is live in the campus directory. Matching listings will be notified automatically.
          </p>
        </div>
        <div className="flex justify-center space-x-3 pt-4">
          <button
            id="view-created-item-btn"
            onClick={() => navigate('item-detail', { id: successItemId })}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
          >
            View Listing
          </button>
          <button
            onClick={() => navigate('search')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Browse Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Type Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
            {type === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fill in accurate details to help connect with the rightful campus owner.
          </p>
        </div>

        {/* Toggle between Lost / Found */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType('lost')}
            className={`px-4 py-2 rounded-lg transition-all ${
              type === 'lost'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            I Lost It
          </button>
          <button
            type="button"
            onClick={() => setType('found')}
            className={`px-4 py-2 rounded-lg transition-all ${
              type === 'found'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            I Found It
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Section */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Photographs (Max 3)
              </label>
              <p className="text-[11px] text-slate-500">
                Clear photos significantly increase match speed. Images are compressed automatically.
              </p>
            </div>
            {/* AI Assistant Button */}
            {(selectedFiles.length > 0 || title.length > 2) && (
              <button
                type="button"
                onClick={handleAIAssist}
                disabled={aiAnalyzing}
                className="px-3 py-1.5 rounded-xl bg-theme-subtle border border-theme-subtle text-theme-main text-xs font-semibold hover:opacity-90 flex items-center space-x-1.5 shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-theme-main" />
                <span>{aiAnalyzing ? 'Analyzing photo...' : 'Auto-fill with AI'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {imagePreviews.map((url, idx) => (
              <div key={idx} className="relative h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img src={url} alt="Item preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 touch-manipulation min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {imagePreviews.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-theme-main flex flex-col items-center justify-center text-slate-500 hover:text-theme-main transition-colors touch-manipulation active:scale-95"
              >
                <Camera className="w-6 h-6 mb-1 text-slate-400 group-hover:text-theme-main" />
                <span className="text-[11px] font-bold">Snap or Upload</span>
                <span className="text-[9px] text-slate-400">Camera / Files</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelection}
            className="hidden"
          />

          {aiSource && (
            <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>AI suggestions applied. Review and adjust values before publishing.</span>
            </p>
          )}
        </div>

        {/* Item Details */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Item Title *
            </label>
            <input
              id="report-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Black Sony WH-1000XM4 Headphones, Student ID Card, Hydro Flask"
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <span className="text-[11px] text-slate-400">Tap to select</span>
            </div>

            {/* Quick 1-tap category chips for mobile */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DEFAULT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation min-h-[34px] ${
                    category === cat
                      ? 'bg-theme-main text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <select
              id="report-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
            >
              {DEFAULT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Campus Location *
              </label>
              <select
                id="report-location-select"
                value={locationId}
                onChange={handleLocationChange}
                className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Date of Incident *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={dateOfIncident}
                  onChange={(e) => setDateOfIncident(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Approximate Time (Optional)
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="time"
                value={timeOfIncident}
                onChange={(e) => setTimeOfIncident(e.target.value)}
                className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Public Description *
            </label>
            <textarea
              id="report-description-input"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe color, general condition, case type, or visible accessories. Do NOT include secret passcodes or private IDs."
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Current possession if found */}
          {type === 'found' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Current Item Custody *
              </label>
              <select
                value={currentPossession}
                onChange={(e) => setCurrentPossession(e.target.value)}
                className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[46px]"
              >
                <option value="With finder">Kept securely with me (Finder)</option>
                <option value="Campus Security Office">Deposited at Campus Security Office</option>
                <option value="Central Library Reception">Handed to Central Library Reception</option>
                <option value="Department Office">Left at Department Office</option>
              </select>
            </div>
          )}

          {/* Secret / Private Verification Detail (PRD Section 18) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
              <Lock className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-bold uppercase tracking-wider">
                Private Verification Identifier (Kept Confidential)
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Enter one hidden identifier only known to the owner (e.g. scratch under sticker, engraving, phone wallpaper, inside cash amount). This is NOT shown on the public listing and is used to verify ownership claims.
            </p>
            <input
              type="text"
              value={secretIdentifyingDetails}
              onChange={(e) => setSecretIdentifyingDetails(e.target.value)}
              placeholder="e.g. 'Blue astronaut sticker behind the phone case' or 'Silver initials PB on zipper'"
              className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit action */}
        <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="w-full sm:w-auto py-3.5 sm:py-2.5 px-6 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 touch-manipulation min-h-[46px]"
          >
            Cancel
          </button>
          <button
            id="publish-report-btn"
            type="submit"
            disabled={uploading}
            className={`w-full sm:w-auto py-4 sm:py-2.5 px-8 text-xs font-bold rounded-xl text-white shadow-md transition-all active:scale-[0.98] touch-manipulation min-h-[48px] ${
              type === 'lost'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            } disabled:opacity-50`}
          >
            {uploading ? 'Compressing & Publishing...' : `Publish ${type === 'lost' ? 'Lost' : 'Found'} Report`}
          </button>
        </div>
      </form>

      {/* Duplicate Detection Warning Modal (PRD Section 60) */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white font-display">
                  A similar item may already have been reported
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We noticed potential duplicates matching your description.
                </p>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {duplicateMatches.map(({ candidateItem, score, reasons }) => (
                <div
                  key={candidateItem.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{candidateItem.title}</span>
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                      {score}% similarity
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1 line-clamp-1">{candidateItem.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Location: {candidateItem.locationName} • Date: {candidateItem.dateOfIncident}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  navigate('search', { query: title });
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                View Similar Items
              </button>
              <button
                id="duplicate-continue-btn"
                type="button"
                onClick={() => performFinalPublish()}
                className="px-4 py-2 text-xs font-semibold rounded-xl btn-theme"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
