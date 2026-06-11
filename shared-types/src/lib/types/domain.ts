// ─── Domain Types ───────────────────────────────────────────────────
// CamelCase app-facing shapes used throughout client/server business logic.
// See ./records.ts for the snake_case on-the-wire / on-disk counterparts.

export interface Region {
  id: string;
  name: string;
  division: string;
  createdAt: number;
  updatedAt: number;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  regionId: string;
  townshipId?: string | null;
  wardId?: string | null;
  assignedRepId: string | null;
  lifetimeValue: number;
  sentimentTrend: string;
  priceBookId: string | null;
  priceTier: string;
  creditLimitMmk: number;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  shopId: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  category: string;
  brandId: string | null;
  thickness: string | null;
  weight: string | null;
  unitType: string;
  conversionFactor: number;
  color: string | null;
  materialSubType: string | null;
  hardwareFinish: string | null;
  isInDeficit: boolean;
  baseWholesalePrice?: number | null;
  baseCurrency?: string | null;
  volumeDiscountBrackets?: string | null;
  inventoryStatus?: string;
  createdAt: number;
  updatedAt: number;
  finishCode?: string | null;
  structuralClass?: string | null;
  dimensions?: string | null;
}

export interface InteractionLog {
  id: string;
  shopId: string;
  repId: string;
  projectId: string | null;
  type: string;
  commercialStatus: string;
  notes: string;
  nextFollowUpDate: number | null;
  viberScreenshotUrl: string | null;
  createdAtLocal: number;
  syncedAtServer: number | null;
  isOfflineEntry: boolean;
  deviceId: string;
  executedById?: string | null;
  salespersonId?: string | null;
  approvedById?: string | null;
  createdAt: number;
  updatedAt: number;
  negotiatedPrice: number | null;
  objectionReason: string | null;
  competitorPrice: number | null;
  viberMessageText: string | null;
}

export interface InteractionItem {
  id: string;
  interactionLogId: string;
  itemId: string;
  quantity: number;
  unitPriceAtSale: number;
  interestLevel: string | null;
  unitPrice: number | null;
  selectedCurrency: string | null;
  selectedUnit: string | null;
  stockCondition: string;
  pendingAllocationCount: number;
  fulfillmentStatus: string;
  complianceStatus: string;
  createdAt: number;
  updatedAt: number;
}

export interface DailyQuota {
  id: string;
  userId: string;
  targetVisits: number;
  targetPhone: number;
  targetViber: number;
  effectiveFrom: number;
  createdAt: number;
  updatedAt: number;
}

export interface ItemStock {
  id: string;
  itemId: string;
  goodStockCount: number;
  wetStockCount: number;
  badStockCount: number;
  pendingAllocationCount: number;
  inventoryStatus?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlannedRoute {
  id: string;
  repId: string;
  date: string;
  shopIds: string;
  createdAt: number;
  updatedAt: number;
}

export interface CheckInLog {
  id: string;
  shopId: string;
  repId: string;
  checkInTime: number;
  latitude: number;
  longitude: number;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ViberChannel {
  id: string;
  userId: string;
  viberProfileId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PredictionLog {
  id: string;
  shopId: string;
  predictedLtv: number;
  churnRisk: number;
  stockoutRisk: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecommendedOrder {
  id: string;
  shopId: string;
  itemId: string;
  quantity: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface PriceBook {
  id: string;
  name: string;
  regionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PriceBookItem {
  id: string;
  priceBookId: string;
  itemId: string;
  price: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: number;
}

export interface RepScore {
  id: string;
  repId: string;
  points: number;
  streakDays: number;
  badges: string;
  createdAt: number;
  updatedAt: number;
}

export interface PointsLog {
  id: string;
  repId: string;
  pointsAdded: number;
  reason: string;
  createdAt: number;
}

export interface TelemetryLog {
  id: string;
  level: string;
  eventType: string;
  message: string;
  timestamp: number;
  syncedAtServer?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface RepKpis {
  id: string;
  repId: string;
  date: string;
  salesVolume: number;
  salesTarget: number;
  visitsCount: number;
  visitsTarget: number;
  createdAt: number;
  updatedAt: number;
}

export interface CurrencyExchangeRate {
  id: string;
  currency: string;
  rateToKyat: number;
  pushedAt: number;
}

export interface CompetitorInsight {
  id: string;
  productName: string;
  streetPrice: number;
  photoUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PendingInventoryUpdate {
  id: string;
  type: string;
  itemId: string | null;
  locationId: string;
  quantityDelta: number | null;
  sku: string | null;
  name: string | null;
  unitPrice: number | null;
  category: string | null;
  submittedBy: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface Township {
  id: string;
  name: string;
  regionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Ward {
  id: string;
  name: string;
  townshipId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExpectedInbound {
  id: string;
  sku: string;
  expectedQuantity: number;
  origin: string;
  estimatedArrivalDate: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Accounts Receivable (Sprint 35) ────────────────────────────────

export interface Invoice {
  id: string;
  shopId: string;
  interactionLogId: string | null;
  amount: number;
  dueDate: number; // Unix ms
  gracePeriodDays: number;
  /** PENDING | PARTIALLY_PAID | PAID | OVERDUE | WRITTEN_OFF */
  state: string;
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: number; // Unix ms
  transactionRef: string | null;
  screenshotUrl: string | null;
  reconciledBy: string | null;
  createdAt: number;
  updatedAt: number;
}
