export const checkDiscrepancy = (ocrText: string, items: $Any[]): boolean => {
  const lowerOcr = ocrText.toLowerCase();

  // Heuristic 1: If OCR text mentions "5 premium beers" (or similar), check if we selected exactly that.
  if (lowerOcr.includes('5') && lowerOcr.includes('premium')) {
    if (items.length !== 1) return true;
    const si = items[0];
    const qty =
      typeof si.quantity === 'number'
        ? si.quantity
        : parseInt(si.quantity || '0', 10);
    const isPremium =
      si.item.name.toLowerCase().includes('premium') ||
      si.item.sku.toLowerCase().includes('pb-640');
    if (!isPremium || qty !== 5) {
      return true; // Discrepancy!
    }
    return false; // Match!
  }

  // Heuristic 2: General number mapping if any numbers are found
  const numbersInOcr = ocrText.match(/\d+/g);
  if (numbersInOcr && items.length > 0) {
    const totalSelectedQty = items.reduce(
      (sum, si) =>
        sum +
        (typeof si.quantity === 'number'
          ? si.quantity
          : parseInt(si.quantity || '0', 10)),
      0,
    );
    const ocrQuantities = numbersInOcr.map((n) => parseInt(n, 10));
    if (!ocrQuantities.includes(totalSelectedQty)) {
      return true;
    }
  }

  if (items.length > 0 && !ocrText) {
    return true;
  }

  return false;
};
