export type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export const GARMENT_SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL'];

export type GarmentCategory = 'Jersey' | 'Shirting' | 'Outerwear' | 'Knitwear';

export type InventoryMap = Record<GarmentSize, number>;

export interface Garment {
  id: string;
  sku: string;
  sortOrder: number;
  name: string;
  colorVariant: string;
  category: GarmentCategory;
  price: number;
  description: string;
  material: string;
  fit: string;
  sizes: GarmentSize[];
  frontImage: string;
  flatImage: string;
  modelImage: string;
  modelOverlayMode: 'native' | 'composite';
  swatchHex: string;
  isPublished: boolean;
  inventory: InventoryMap;
  updatedAt?: string;
}

export interface EditorialMoment {
  id: string;
  indexLabel: string;
  title: string;
  caption: string;
  image: string;
}

export interface CmsContent {
  seasonLabel: string;
  railTitle: string;
  railSubtitle: string;
  tryOnTitle: string;
  tryOnSubtitle: string;
  outDoorHeadline: string;
  outDoorSubline: string;
  lookbookKicker: string;
  lookbookTitle: string;
  lookbookBody: string;
  lookbookFeaturedProductId: string;
  studioTitle: string;
  studioBody: string;
  outInItTitle: string;
  freeShippingThreshold: number;
  studioAddress: string;
  studioDays: string;
  studioHours: string;
}

export interface BagItem {
  productId: string;
  sku: string;
  name: string;
  colorVariant: string;
  price: number;
  size: GarmentSize;
  quantity: number;
  image: string;
}

export type OrderStatus = 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItemRecord {
  productId: string;
  sku: string;
  name: string;
  colorVariant: string;
  size: GarmentSize;
  quantity: number;
  unitPrice: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  items: OrderItemRecord[];
  createdAt: string;
}

export interface DatabaseInfo {
  engine: 'mysql' | 'local-store';
  engineLabel: string;
  mysqlConfigured: boolean;
  mysqlConnected: boolean;
  databaseName: string;
  tables: string[];
  productCount: number;
  orderCount: number;
  totalUnitsInStock: number;
}
