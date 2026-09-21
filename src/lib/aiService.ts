import { DEFAULT_CATEGORIES } from './constants';

export interface AISuggestionResponse {
  suggestedTitle: string;
  suggestedCategory: string;
  suggestedDescription: string;
  confidence: number;
  source: 'gemini' | 'heuristic';
}

/**
 * Calls server-side Gemini API or falls back gracefully to smart heuristic suggestion
 */
export async function getAISuggestions(params: {
  imageBase64?: string;
  imageMimeType?: string;
  titleHint?: string;
  categoryHint?: string;
}): Promise<AISuggestionResponse> {
  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.suggestedTitle) {
        return { ...data, source: 'gemini' };
      }
    }
  } catch (err) {
    console.warn('Server AI endpoint unavailable, using heuristic assistant:', err);
  }

  // Graceful heuristic fallback (PRD Section 26: "AI matching temporarily unavailable. Basic matching is being used.")
  return generateHeuristicSuggestion(params.titleHint || '', params.categoryHint);
}

function generateHeuristicSuggestion(titleHint: string, categoryHint?: string): AISuggestionResponse {
  const lower = titleHint.toLowerCase();
  let category = categoryHint || 'Other';

  if (lower.includes('phone') || lower.includes('iphone') || lower.includes('android') || lower.includes('pixel') || lower.includes('samsung')) {
    category = 'Mobile Phones';
  } else if (lower.includes('earbud') || lower.includes('airpod') || lower.includes('headphone') || lower.includes('boat')) {
    category = 'Earphones';
  } else if (lower.includes('wallet') || lower.includes('purse') || lower.includes('billfold')) {
    category = 'Wallet';
  } else if (lower.includes('key') || lower.includes('fob') || lower.includes('keychain')) {
    category = 'Keys';
  } else if (lower.includes('id') || lower.includes('card') || lower.includes('badge') || lower.includes('license')) {
    category = 'ID Card';
  } else if (lower.includes('bottle') || lower.includes('flask') || lower.includes('hydro')) {
    category = 'Water Bottle';
  } else if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('dell') || lower.includes('thinkpad')) {
    category = 'Laptop';
  } else if (lower.includes('charger') || lower.includes('cable') || lower.includes('adapter')) {
    category = 'Charger';
  } else if (lower.includes('bag') || lower.includes('backpack') || lower.includes('tote')) {
    category = 'Bag';
  } else if (lower.includes('book') || lower.includes('notebook') || lower.includes('binder')) {
    category = 'Books';
  }

  return {
    suggestedTitle: titleHint ? titleHint.charAt(0).toUpperCase() + titleHint.slice(1) : `${category} item`,
    suggestedCategory: DEFAULT_CATEGORIES.includes(category) ? category : 'Other',
    suggestedDescription: titleHint
      ? `Found or reported ${titleHint}. Features clean condition, recognizable campus item.`
      : `Campus belonging item categorized under ${category}.`,
    confidence: 0.75,
    source: 'heuristic'
  };
}
