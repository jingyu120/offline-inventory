export interface SearchItem {
  id: string;
  name: string;
  sku: string;
}

const SYNONYMS: Record<string, string[]> = {
  waterproof: [
    'coating',
    'sealant',
    'roofing',
    'zinc',
    'steel',
    'sheet',
    'aluzinc',
    'membrane',
  ],
  roofing: ['zinc', 'steel', 'sheet', 'aluzinc', 'roof', 'corrugated'],
  layer: ['sheet', 'membrane', 'coating', 'panel'],
  cement: ['concrete', 'mortar', 'brick'],
  paint: ['coating', 'primer', 'finish', 'gloss'],
  pipe: ['pvc', 'tube', 'hose', 'fitting'],
  wire: ['cable', 'electrical', 'copper'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Perform a local on-device TF-IDF & Synonym-based semantic vector search.
 */
export function semanticSearch<T extends SearchItem>(
  items: T[],
  query: string,
): T[] {
  if (!query || !query.trim()) return items;

  const cleanQuery = query.trim().toLowerCase();

  // Shortcut for exact SKU or name match
  const exactSkuMatch = items.find(
    (item) => item.sku.toLowerCase() === cleanQuery,
  );
  if (exactSkuMatch) {
    return [exactSkuMatch];
  }

  const exactNameMatch = items.find(
    (item) => item.name.toLowerCase() === cleanQuery,
  );
  if (exactNameMatch) {
    return [exactNameMatch];
  }

  // Check global thermal state if available
  const thermalGuard = (globalThis as Record<string, unknown>).ThermalGuard as
    | { getThermalState: () => string }
    | undefined;
  const thermalState = thermalGuard
    ? thermalGuard.getThermalState()
    : 'NOMINAL';

  if (thermalState === 'CRITICAL') {
    // High-speed indexed substring regex fallback
    const escapedQuery = cleanQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');
    return items.filter(
      (item) => regex.test(item.name) || regex.test(item.sku),
    );
  }

  let searchItems = items;
  if (thermalState === 'SERIOUS') {
    // Step down comparisons by 50%
    const limit = Math.ceil(items.length / 2);
    searchItems = items.slice(0, limit);
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return searchItems;

  // Semantic query expansion
  const expandedQueryTokens = [...queryTokens];
  for (const token of queryTokens) {
    if (SYNONYMS[token]) {
      for (const synonym of SYNONYMS[token]) {
        if (!expandedQueryTokens.includes(synonym)) {
          expandedQueryTokens.push(synonym);
        }
      }
    }
  }

  const N = searchItems.length;
  if (N === 0) return [];

  // 1. Tokenize all items and compute Document Frequency (DF)
  const itemTokensList = searchItems.map((item) => {
    const text = `${item.name} ${item.sku}`;
    return tokenize(text);
  });

  const df: Record<string, number> = {};
  for (const tokens of itemTokensList) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  // 2. Compute Inverse Document Frequency (IDF) for tokens
  const idf: Record<string, number> = {};
  const allWords = new Set([...Object.keys(df), ...expandedQueryTokens]);
  for (const word of allWords) {
    const docFreq = df[word] || 0;
    idf[word] = Math.log(1 + N / (docFreq + 1));
  }

  // 3. Represent items as normalized TF-IDF vectors
  const itemVectors = itemTokensList.map((tokens, idx) => {
    const tf: Record<string, number> = {};
    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    const vector: Record<string, number> = {};
    let magnitudeSq = 0;
    for (const [token, count] of Object.entries(tf)) {
      const tfIdf = count * idf[token];
      vector[token] = tfIdf;
      magnitudeSq += tfIdf * tfIdf;
    }

    const magnitude = Math.sqrt(magnitudeSq);
    if (magnitude > 0) {
      for (const token of Object.keys(vector)) {
        vector[token] /= magnitude;
      }
    }

    return { index: idx, vector };
  });

  // 4. Represent expanded query as normalized TF-IDF vector
  // Give direct tokens a higher weight than expanded synonym tokens
  const queryTf: Record<string, number> = {};
  for (const token of queryTokens) {
    queryTf[token] = (queryTf[token] || 0) + 1.0;
  }
  for (const token of expandedQueryTokens) {
    if (!queryTokens.includes(token)) {
      queryTf[token] = (queryTf[token] || 0) + 0.5; // lower weight for synonyms
    }
  }

  const queryVector: Record<string, number> = {};
  let queryMagnitudeSq = 0;
  for (const [token, tfVal] of Object.entries(queryTf)) {
    const tfIdf = tfVal * (idf[token] || 0);
    queryVector[token] = tfIdf;
    queryMagnitudeSq += tfIdf * tfIdf;
  }
  const queryMagnitude = Math.sqrt(queryMagnitudeSq);
  if (queryMagnitude > 0) {
    for (const token of Object.keys(queryVector)) {
      queryVector[token] /= queryMagnitude;
    }
  }

  // 5. Calculate cosine similarity
  const scoredItems = itemVectors.map(({ index, vector }) => {
    let dotProduct = 0;
    for (const [token, val] of Object.entries(queryVector)) {
      if (vector[token]) {
        dotProduct += val * vector[token];
      }
    }

    const item = searchItems[index];
    const itemNameLower = item.name.toLowerCase();
    const itemSkuLower = item.sku.toLowerCase();
    let exactBoost = 0;

    // Apply exact boost if query tokens exactly match parts of the SKU/name
    for (const qToken of queryTokens) {
      if (itemSkuLower === qToken || itemNameLower.startsWith(qToken)) {
        exactBoost += 0.25;
      }
    }

    return {
      item,
      score: dotProduct + exactBoost,
    };
  });

  // Filter out irrelevant items and sort descending by score
  return scoredItems
    .filter((res) => res.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .map((res) => res.item);
}
