import { Item } from '@burma-inventory/shared-types';

export const getItemPrice = (
  item: Item,
  priceBookItems: any[],
  selectedCurrency: string,
  exchangeRates: any[],
): number => {
  const pbItem = priceBookItems.find((pbi) => pbi.item_id === item.id);
  let basePrice = item.unitPrice; // standard MMK price
  let baseCurrency = 'MMK';

  if (item.baseWholesalePrice && item.baseCurrency) {
    basePrice = item.baseWholesalePrice;
    baseCurrency = item.baseCurrency;
  }

  if (pbItem) {
    basePrice = pbItem.price;
    baseCurrency = pbItem.currency;
  }

  if (baseCurrency === selectedCurrency) {
    return basePrice;
  }

  // Convert baseCurrency to MMK first
  let priceInMmk = basePrice;
  if (baseCurrency !== 'MMK') {
    const rateToMmk = exchangeRates.find(
      (r) => r.from_currency === baseCurrency && r.to_currency === 'MMK',
    );
    if (rateToMmk) {
      priceInMmk = basePrice * rateToMmk.rate;
    } else {
      const rateToKyatObj = exchangeRates.find(
        (r) => r.currency === baseCurrency || r.from_currency === baseCurrency,
      );
      if (rateToKyatObj) {
        const rateVal = rateToKyatObj.rate_to_kyat || rateToKyatObj.rate || 0;
        if (rateVal > 0) {
          priceInMmk = basePrice * rateVal;
        }
      }
    }
  }

  if (selectedCurrency === 'MMK') {
    return priceInMmk;
  }

  // Convert MMK to selectedCurrency
  const rateFromMmk = exchangeRates.find(
    (r) => r.from_currency === selectedCurrency && r.to_currency === 'MMK',
  );
  if (rateFromMmk && rateFromMmk.rate > 0) {
    return priceInMmk / rateFromMmk.rate;
  } else {
    const rateToKyatObj = exchangeRates.find(
      (r) =>
        r.currency === selectedCurrency || r.from_currency === selectedCurrency,
    );
    if (rateToKyatObj) {
      const rateVal = rateToKyatObj.rate_to_kyat || rateToKyatObj.rate || 0;
      if (rateVal > 0) {
        return priceInMmk / rateVal;
      }
    }
  }

  // Default rate falls back if rates are not loaded yet
  if (selectedCurrency === 'USD') return priceInMmk / 4200;
  if (selectedCurrency === 'THB') return priceInMmk / 115;

  return priceInMmk;
};
