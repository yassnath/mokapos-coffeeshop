import { ItemStatus, OrderStatus, PaymentMethod, Role } from "@prisma/client";
import { z } from "zod";

export const modifierSelectionSchema = z.object({
  optionId: z.string().min(1),
  modifierGroupName: z.string().min(1),
  modifierOptionName: z.string().min(1),
  priceDelta: z.number().nonnegative(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1).optional(),
  productName: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  discountAmount: z.number().nonnegative().default(0),
  lineTotal: z.number().nonnegative(),
  note: z.string().max(250).optional(),
  modifiers: z.array(modifierSelectionSchema).default([]),
});

export const paymentInputSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  reference: z.string().max(120).optional(),
});

export const submitOrderSchema = z.object({
  storeId: z.string().min(1),
  registerId: z.string().min(1),
  shiftId: z.string().optional(),
  customerId: z.string().optional(),
  notes: z.string().max(250).optional(),
  subtotal: z.number().nonnegative(),
  itemDiscount: z.number().nonnegative().default(0),
  orderDiscount: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  serviceChargeAmount: z.number().nonnegative().default(0),
  tipAmount: z.number().nonnegative().default(0),
  roundingAmount: z.number().default(0),
  totalAmount: z.number().nonnegative(),
  items: z.array(orderItemSchema).min(1),
  payments: z.array(paymentInputSchema).min(1),
});

export const orderStatusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  itemStatus: z.nativeEnum(ItemStatus).optional(),
  reason: z.string().max(200).optional(),
  amount: z.number().nonnegative().optional(),
});

export const customerCreateSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(2).max(80),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  notes: z.string().max(200).optional(),
});

export const settingsUpdateSchema = z.object({
  storeId: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  serviceChargeRate: z.number().min(0).max(100),
  roundingUnit: z.number().int().nonnegative(),
  receiptHeader: z.string().max(200).optional(),
  receiptFooter: z.string().max(200).optional(),
  printerName: z.string().max(100).optional(),
  receiptCopies: z.number().int().positive().max(5),
  allowTips: z.boolean(),
});

export const openShiftSchema = z.object({
  storeId: z.string().min(1),
  registerId: z.string().min(1),
  openingCash: z.number().nonnegative(),
  notes: z.string().max(200).optional(),
});

export const closeShiftSchema = z.object({
  actualCash: z.number().nonnegative(),
  notes: z.string().max(200).optional(),
});

export const productUpsertSchema = z.object({
  storeId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  name: z.string().min(2).max(80),
  sku: z.string().max(40).optional(),
  description: z.string().max(400).optional(),
  basePrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(100),
  imageUrl: z.string().max(2_000_000).optional(),
  isFavorite: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  modifierGroupIds: z.array(z.string()).optional(),
});

export const staffCreateSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  username: z.string().min(3).max(40),
  role: z.nativeEnum(Role),
  password: z.string().min(6),
  pin: z
    .string()
    .regex(/^\d{4,8}$/)
    .optional()
    .or(z.literal("")),
  defaultStoreId: z.string().min(1).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const staffUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  username: z.string().min(3).max(40).optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  pin: z
    .string()
    .regex(/^\d{4,8}$/)
    .optional()
    .or(z.literal("")),
  defaultStoreId: z.string().min(1).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
