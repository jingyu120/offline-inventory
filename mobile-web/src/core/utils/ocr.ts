import { OCR_MOCK_HEURISTIC } from '../../config/appConfig';

export const checkDiscrepancy = (ocrText: string, items: $Any[]): boolean => {
  const lowerOcr = ocrText.toLowerCase();

  // Heuristic 1: Config-driven check if OCR text triggers rule
  const triggersRule = OCR_MOCK_HEURISTIC.ocrTriggerWords.every((word) =>
    lowerOcr.includes(word),
  );
  if (triggersRule) {
    if (items.length !== 1) return true;
    const si = items[0];
    const qty =
      typeof si.quantity === 'number'
        ? si.quantity
        : parseInt(si.quantity || '0', 10);
    const nameMatch = si.item.name
      .toLowerCase()
      .includes(OCR_MOCK_HEURISTIC.targetNameToken);
    const skuMatch = si.item.sku
      .toLowerCase()
      .includes(OCR_MOCK_HEURISTIC.targetSkuToken);
    if ((!nameMatch && !skuMatch) || qty !== OCR_MOCK_HEURISTIC.targetQty) {
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
