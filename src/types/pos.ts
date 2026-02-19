export type ProductOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ProductModifierGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  isMulti: boolean;
  options: ProductOption[];
};

export type PosProduct = {
  id: string;
  name: string;
  basePrice: number;
  stock: number;
  imageUrl?: string | null;
  isFavorite: boolean;
  isAvailable: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  modifierGroups: ProductModifierGroup[];
};

export type PosCategory = {
  id: string;
  name: string;
};

export type PosCustomer = {
  id: string;
  name: string;
  phone?: string | null;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  totalAmount: number;
};
