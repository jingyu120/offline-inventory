import { Item } from '@burma-inventory/shared-types';
import {
  VIBER_BRAND_TOKENS,
  VIBER_KNOWN_UNITS,
  VIBER_SCORING_WEIGHTS,
  VIBER_SPEC_TOKENS,
} from '../../config/appConfig';

const DEFAULT_UNIT = 'PCS';
const MIN_MATCH_SCORE = 2;

/** Outcome of parsing a single line: the matched item plus quantity metadata. */
export interface ParsedLineMatch {
  item: Item;
  quantity: number;
  selectedUnit: string;
  pendingAllocationCount: number;
}

/** Normalise a raw unit token (e.g. "pk", "bags") into a canonical basket unit. */
function normaliseUnit(rawUnit: string): string | null {
  if (rawUnit.startsWith('pc')) return 'PCS';
  if (rawUnit.startsWith('pk')) return 'PK';
  if (rawUnit.startsWith('bag')) return 'BAGS';
  if (rawUnit.startsWith('pal')) return 'PAL';
  return null;
}

interface LineQuantity {
  qty: number;
  unit: string;
  pendingAllocationCount: number;
  itemSearchText: string;
}

const PAREN_REGEX = /\(\s*([\d,]+)\s*\)/;

/** Parse the parenthesised allocation form, e.g. "Shera 6mm (1,756)". */
function parseParenAllocation(lower: string): LineQuantity {
  const parenMatch = lower.match(PAREN_REGEX);
  let qty = 1;
  let unit = DEFAULT_UNIT;
  let pendingAllocationCount = 0;
  let itemSearchText = lower;

  if (parenMatch) {
    const parsedNum = parseInt(parenMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsedNum)) {
      pendingAllocationCount = parsedNum;
      qty = 0;
    }
    itemSearchText = lower.replace(PAREN_REGEX, '');

    for (const u of VIBER_KNOWN_UNITS) {
      if (itemSearchText.includes(u)) {
        const normalised = normaliseUnit(u);
        if (normalised) unit = normalised;
        itemSearchText = itemSearchText.replace(
          new RegExp(`\\b${u}\\b`, 'g'),
          '',
        );
        break;
      }
    }
  }

  return { qty, unit, pendingAllocationCount, itemSearchText };
}

/** Parse the standard "<qty> <unit> <item>" form. */
function parseStandardQuantity(lower: string): LineQuantity {
  const numRegex = /(\d+(?:\/\d+)?)\s*([a-zA-Z.]+)?/g;
  const candidates: { num: number; unitStr: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = numRegex.exec(lower)) !== null) {
    const numStr = match[1];
    const unitStr = (match[2] || '').replace(/[.\s]/g, '');

    if (
      numStr.includes('/') ||
      unitStr === 'mm' ||
      unitStr === 'inch' ||
      unitStr === 'in' ||
      unitStr === 'kg'
    ) {
      continue;
    }

    const parsedNum = parseInt(numStr, 10);
    if (!isNaN(parsedNum)) {
      candidates.push({ num: parsedNum, unitStr, index: match.index });
    }
  }

  let qtyCandidate = candidates.find((c) =>
    VIBER_KNOWN_UNITS.includes(c.unitStr),
  );
  if (!qtyCandidate && candidates.length > 0) {
    qtyCandidate = candidates[0];
  }

  let qty = 1;
  let unit = DEFAULT_UNIT;
  let itemSearchText = lower;

  if (qtyCandidate) {
    qty = qtyCandidate.num;
    if (qtyCandidate.unitStr) {
      const normalised = normaliseUnit(qtyCandidate.unitStr);
      if (normalised) unit = normalised;
    }
    itemSearchText = lower.replace(
      new RegExp(`\\b${qtyCandidate.num}\\b`, 'g'),
      '',
    );
  }

  return { qty, unit, pendingAllocationCount: 0, itemSearchText };
}

/** Score how well an item matches the residual search text. */
function scoreItem(item: Item, itemSearchText: string): number {
  const nameTokens = item.name.toLowerCase().split(/[\s-,]+/);
  const skuTokens = item.sku.toLowerCase().split(/[\s-,]+/);
  const allTokens = Array.from(new Set([...nameTokens, ...skuTokens])).filter(
    (token) => token.length > 1,
  );

  let score = 0;
  for (const token of allTokens) {
    if (itemSearchText.includes(token)) {
      if (VIBER_BRAND_TOKENS.includes(token)) {
        score += VIBER_SCORING_WEIGHTS.BRAND;
      } else if (VIBER_SPEC_TOKENS.includes(token)) {
        score += VIBER_SCORING_WEIGHTS.SPEC;
      } else {
        score += VIBER_SCORING_WEIGHTS.GENERIC;
      }
    }
  }
  return score;
}

/** Find the best-matching item for the residual search text, if any clears the threshold. */
function findBestMatch(items: Item[], itemSearchText: string): Item | null {
  let bestItem: Item | null = null;
  let maxScore = 0;
  for (const item of items) {
    const score = scoreItem(item, itemSearchText);
    if (score > maxScore) {
      maxScore = score;
      bestItem = item;
    }
  }
  return maxScore >= MIN_MATCH_SCORE ? bestItem : null;
}

/**
 * Token-parse raw order text into matched line items (without pricing). Each
 * non-empty line is matched against the catalogue; unmatched lines are skipped.
 */
export function parseOrderText(
  rawText: string,
  items: Item[],
): ParsedLineMatch[] {
  const parsed: ParsedLineMatch[] = [];

  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    const hasParen = PAREN_REGEX.test(lower);
    const { qty, unit, pendingAllocationCount, itemSearchText } = hasParen
      ? parseParenAllocation(lower)
      : parseStandardQuantity(lower);

    const bestItem = findBestMatch(items, itemSearchText);
    if (bestItem) {
      parsed.push({
        item: bestItem,
        quantity: qty,
        selectedUnit: unit,
        pendingAllocationCount,
      });
    }
  }

  return parsed;
}

/** Shape of a single item returned by the AI note-parsing fallback endpoint. */
export interface AiParsedItem {
  sku: string;
  quantity: number;
}

/** Match AI-parsed SKUs back to catalogue items, returning matches in PCS. */
export function matchAiParsedItems(
  aiItems: AiParsedItem[],
  items: Item[],
): ParsedLineMatch[] {
  const matched: ParsedLineMatch[] = [];
  for (const rawItem of aiItems) {
    const matchedItem = items.find(
      (i) => i.sku.toLowerCase() === rawItem.sku.toLowerCase(),
    );
    if (matchedItem) {
      matched.push({
        item: matchedItem,
        quantity: rawItem.quantity,
        selectedUnit: DEFAULT_UNIT,
        pendingAllocationCount: 0,
      });
    }
  }
  return matched;
}

/** Sanitise free-text numeric input, allowing a single leading minus and one decimal. */
export function sanitisePriceInput(price: string): string {
  let cleanPrice = price.replace(/[^0-9.-]/g, '');
  if (cleanPrice.startsWith('-')) {
    cleanPrice = '-' + cleanPrice.slice(1).replace(/-/g, '');
  } else {
    cleanPrice = cleanPrice.replace(/-/g, '');
  }
  const parts = cleanPrice.split('.');
  if (parts.length > 2) {
    cleanPrice = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleanPrice;
}

/** Strip everything but digits from a quantity input. */
export function sanitiseQuantityInput(quantity: string): string {
  return quantity.replace(/[^0-9]/g, '');
}
