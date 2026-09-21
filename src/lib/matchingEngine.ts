import { Item } from '../types';

export interface MatchScoreResult {
  targetItem: Item;
  candidateItem: Item;
  score: number; // 0 - 100
  breakdown: {
    categoryScore: number;
    descriptionScore: number;
    locationScore: number;
    dateScore: number;
    keywordScore: number;
  };
  reasons: string[];
}

/**
 * Weights per PRD Section 24:
 * Category: 20%
 * Description: 30%
 * Location: 20%
 * Date: 15%
 * Image/Keywords: 15%
 */
const WEIGHTS = {
  category: 20,
  description: 30,
  location: 20,
  date: 15,
  keywords: 15
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function calculateJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

export function computeItemSimilarity(itemA: Item, itemB: Item): MatchScoreResult {
  const reasons: string[] = [];

  // 1. Category Similarity (20%)
  let categoryScore = 0;
  if (itemA.category.toLowerCase() === itemB.category.toLowerCase()) {
    categoryScore = 1.0;
    reasons.push(`Matching category: ${itemA.category}`);
  } else if (
    (itemA.category.includes('Phone') && itemB.category.includes('Electronics')) ||
    (itemA.category.includes('Earphones') && itemB.category.includes('Electronics'))
  ) {
    categoryScore = 0.6;
    reasons.push(`Related category: ${itemA.category} & ${itemB.category}`);
  }

  // 2. Title & Description Similarity (30%)
  const tokensA = tokenize(`${itemA.title} ${itemA.description}`);
  const tokensB = tokenize(`${itemB.title} ${itemB.description}`);
  const descriptionScore = calculateJaccardSimilarity(tokensA, tokensB);
  if (descriptionScore > 0.25) {
    reasons.push(`Similar wording in item description`);
  }

  // 3. Location Similarity (20%)
  let locationScore = 0;
  if (
    itemA.locationId &&
    itemB.locationId &&
    itemA.locationId.toLowerCase() === itemB.locationId.toLowerCase()
  ) {
    locationScore = 1.0;
    reasons.push(`Reported at same campus location: ${itemA.locationName || itemA.locationId}`);
  } else if (
    itemA.locationName &&
    itemB.locationName &&
    itemA.locationName.toLowerCase() === itemB.locationName.toLowerCase()
  ) {
    locationScore = 1.0;
    reasons.push(`Reported at same campus location`);
  } else {
    // Check substring match
    const locATokens = tokenize(itemA.locationName || '');
    const locBTokens = tokenize(itemB.locationName || '');
    if (locATokens.some(t => locBTokens.includes(t))) {
      locationScore = 0.5;
      reasons.push(`Nearby location overlap`);
    }
  }

  // 4. Date Proximity (15%)
  let dateScore = 0;
  if (itemA.dateOfIncident && itemB.dateOfIncident) {
    const timeA = new Date(itemA.dateOfIncident).getTime();
    const timeB = new Date(itemB.dateOfIncident).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
      const diffDays = Math.abs(timeA - timeB) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) {
        dateScore = 1.0;
        reasons.push('Happened on or adjacent day');
      } else if (diffDays <= 3) {
        dateScore = 0.8;
        reasons.push('Happened within 3 days');
      } else if (diffDays <= 7) {
        dateScore = 0.6;
        reasons.push('Happened within a week');
      } else if (diffDays <= 14) {
        dateScore = 0.3;
      }
    }
  }

  // 5. Keyword Overlap (15%) - Colors, brands, specific identifiers
  const commonKeywords = tokensA.filter(t => tokensB.includes(t));
  const keywordScore = Math.min(1.0, commonKeywords.length / 3);
  if (commonKeywords.length > 0) {
    reasons.push(`Key terms shared: ${commonKeywords.slice(0, 3).join(', ')}`);
  }

  const rawTotal =
    categoryScore * WEIGHTS.category +
    descriptionScore * WEIGHTS.description +
    locationScore * WEIGHTS.location +
    dateScore * WEIGHTS.date +
    keywordScore * WEIGHTS.keywords;

  const finalScore = Math.round(Math.min(100, Math.max(0, rawTotal)));

  return {
    targetItem: itemA,
    candidateItem: itemB,
    score: finalScore,
    breakdown: {
      categoryScore,
      descriptionScore,
      locationScore,
      dateScore,
      keywordScore
    },
    reasons: reasons.length > 0 ? reasons : ['General campus listing attributes similarity']
  };
}

/**
 * Finds potential opposite matches for a given item
 * e.g., for a 'lost' item, looks for 'found' items
 */
export function findPotentialMatches(targetItem: Item, allItems: Item[], minScore = 35): MatchScoreResult[] {
  const oppositeType = targetItem.type === 'lost' ? 'found' : 'lost';
  const candidates = allItems.filter(
    item =>
      item.id !== targetItem.id &&
      item.type === oppositeType &&
      item.status === 'open' &&
      !item.isDeleted
  );

  const results: MatchScoreResult[] = candidates.map(candidate =>
    computeItemSimilarity(targetItem, candidate)
  );

  return results
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

/**
 * Finds potential duplicates among items of the SAME type
 * Used in PRD section 60 before publishing
 */
export function findPotentialDuplicates(targetItem: Partial<Item>, allItems: Item[], minScore = 45): MatchScoreResult[] {
  if (!targetItem.title || !targetItem.type) return [];
  const sameTypeCandidates = allItems.filter(
    item =>
      item.id !== targetItem.id &&
      item.type === targetItem.type &&
      item.status === 'open' &&
      !item.isDeleted
  );

  const mockTarget = {
    ...targetItem,
    id: targetItem.id || 'temp',
    type: targetItem.type,
    title: targetItem.title || '',
    description: targetItem.description || '',
    category: targetItem.category || '',
    imageUrls: targetItem.imageUrls || [],
    locationId: targetItem.locationId || '',
    locationName: targetItem.locationName || '',
    reportedBy: targetItem.reportedBy || '',
    dateOfIncident: targetItem.dateOfIncident || new Date().toISOString().split('T')[0],
    status: 'open' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Item;

  return sameTypeCandidates
    .map(cand => computeItemSimilarity(mockTarget, cand))
    .filter(r => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
