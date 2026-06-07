/**
 * Unit tests for the OCR discrepancy checker.
 *
 * The checker uses OCR_MOCK_HEURISTIC from appConfig:
 *   - ocrTriggerWords: ['5', 'premium']
 *   - targetNameToken: 'premium'
 *   - targetSkuToken:  'pb-640'
 *   - targetQty:       5
 */
import { checkDiscrepancy } from './ocr';

describe('checkDiscrepancy', () => {
  describe('Heuristic 1: trigger-word matching', () => {
    it('reports discrepancy when all trigger words match but quantity differs from target', () => {
      // ocrText contains '5' and 'premium' → triggers heuristic 1
      // item name contains 'premium', sku contains 'pb-640', but quantity=10 ≠ targetQty=5
      const items = [
        { quantity: 10, item: { name: 'Premium Beer', sku: 'pb-640' } },
      ];
      expect(checkDiscrepancy('premium 5 bottles', items)).toBe(true);
    });

    it('reports no discrepancy when trigger words match and quantity equals target', () => {
      // quantity=5 = targetQty=5, name/sku both match → clean invoice
      const items = [
        { quantity: 5, item: { name: 'Premium Beer', sku: 'pb-640' } },
      ];
      expect(checkDiscrepancy('premium 5 bottles', items)).toBe(false);
    });

    it('reports discrepancy when trigger fires but item name and sku do not match', () => {
      // Trigger fires, but name='Generic Item' and sku='xyz' do not match targetNameToken or targetSkuToken
      const items = [
        { quantity: 5, item: { name: 'Generic Item', sku: 'xyz-999' } },
      ];
      expect(checkDiscrepancy('premium 5 units', items)).toBe(true);
    });

    it('reports discrepancy when trigger fires but item count != 1', () => {
      const items = [
        { quantity: 5, item: { name: 'Premium Beer', sku: 'pb-640' } },
        { quantity: 5, item: { name: 'Another', sku: 'another' } },
      ];
      expect(checkDiscrepancy('premium 5 cases', items)).toBe(true);
    });
  });

  describe('Heuristic 2: general quantity matching in OCR text', () => {
    it('reports no discrepancy when total quantity appears in OCR text', () => {
      const items = [
        { quantity: 12, item: { name: 'Some Item', sku: 'sku-123' } },
      ];
      expect(checkDiscrepancy('invoice count is 12', items)).toBe(false);
    });

    it('reports discrepancy when OCR quantity does not match total selected quantity', () => {
      const items = [
        { quantity: 12, item: { name: 'Some Item', sku: 'sku-123' } },
      ];
      expect(checkDiscrepancy('invoice count is 10', items)).toBe(true);
    });

    it('reports discrepancy when total quantity of multiple items differs from OCR', () => {
      const items = [
        { quantity: 5, item: { name: 'A', sku: 'sku-a' } },
        { quantity: 7, item: { name: 'B', sku: 'sku-b' } },
      ];
      // totalQty=12; OCR shows 11 → discrepancy
      expect(checkDiscrepancy('total 11 units sold', items)).toBe(true);
      // OCR shows 12 → match
      expect(checkDiscrepancy('total 12 units sold', items)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('reports discrepancy when items are non-empty but OCR text is empty', () => {
      const items = [{ quantity: 1, item: { name: 'X', sku: 'sku-x' } }];
      expect(checkDiscrepancy('', items)).toBe(true);
    });

    it('returns false when both items list and OCR text are empty', () => {
      expect(checkDiscrepancy('', [])).toBe(false);
    });

    it('returns false when OCR has text but no items are selected', () => {
      expect(checkDiscrepancy('some invoice text', [])).toBe(false);
    });

    it('supports string quantity parsing in Heuristic 1 and 2', () => {
      // Heuristic 1
      const itemsH1 = [
        { quantity: '5', item: { name: 'Premium Beer', sku: 'pb-640' } },
      ];
      expect(checkDiscrepancy('premium 5 bottles', itemsH1 as any)).toBe(false);

      // Heuristic 2
      const itemsH2 = [
        { quantity: '12', item: { name: 'Some Item', sku: 'sku-123' } },
      ];
      expect(checkDiscrepancy('invoice count is 12', itemsH2 as any)).toBe(
        false,
      );

      // Empty string quantity fallback
      const itemsH3 = [
        { quantity: '', item: { name: 'Some Item', sku: 'sku-123' } },
      ];
      expect(checkDiscrepancy('invoice count is 0', itemsH3 as any)).toBe(
        false,
      );
    });
  });
});
