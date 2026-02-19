"use client";

import { Role } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type Props = {
  storeId: string;
  role: Role;
};

type SummaryData = {
  range?: {
    start: string;
    end: string;
  };
  metrics: { totalSales: number; totalOrders: number; avgOrderValue: number };
  paymentBreakdown: Record<string, number>;
  bestSellers: Array<{ name: string; qty: number }>;
  orderedItems: Array<{
    id: string;
    orderNumber: string;
    placedAt: string;
    productName: string;
    quantity: number;
    cashierName: string;
    waiterName: string;
    costAmount: number;
    salesAmount: number;
    profitAmount: number;
  }>;
  discountAndVoidAudits: Array<{
    id: string;
    action: string;
    message: string | null;
    createdAt: string;
  }>;
};

type SettingsData = {
  settings: {
    storeId: string;
    taxRate: number;
    serviceChargeRate: number;
    roundingUnit: number;
    receiptHeader?: string;
    receiptFooter?: string;
    printerName?: string;
    receiptCopies: number;
    allowTips: boolean;
  };
};

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  categoryId?: string | null;
  basePrice: number;
  costPrice?: number;
  profitPerItem?: number;
  stock: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isFavorite: boolean;
  categoryName?: string;
};

type ProductData = { products: Product[] };
type CategoryData = { categories: Array<{ id: string; name: string }> };

type ShiftData = {
  shifts: Array<{
    id: string;
    status: string;
    openedAt: string;
    closedAt?: string;
    totalSales: number;
    totalCost: number;
    totalProfit: number;
    expectedCash: number;
    actualCash: number;
    user: { name: string; role: string };
    register: { name: string };
  }>;
};

type StaffData = {
  users: Array<{
    id: string;
    name: string;
    email: string | null;
    username: string | null;
    role: Role;
    isActive: boolean;
    defaultStoreId: string | null;
  }>;
};

type ProductFormState = {
  id?: string;
  name: string;
  categoryId: string;
  sku: string;
  description: string;
  basePrice: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  isFavorite: boolean;
  isAvailable: boolean;
};

type StaffFormState = {
  id?: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  password: string;
  pin: string;
  defaultStoreId: string;
  isActive: boolean;
};

function defaultProductForm(): ProductFormState {
  return {
    name: "",
    categoryId: "",
    sku: "",
    description: "",
    basePrice: 0,
    costPrice: 0,
    stock: 100,
    imageUrl: "",
    isFavorite: false,
    isAvailable: true,
  };
}

function deriveCostPrice(basePrice: number) {
  return Math.max(0, basePrice - 5000);
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeByPeriod(period: "daily" | "weekly" | "monthly") {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  if (period === "weekly") {
    start.setDate(start.getDate() - 6);
  } else if (period === "monthly") {
    start.setDate(start.getDate() - 29);
  }

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function toProductForm(product: Product): ProductFormState {
  const basePrice = Number(product.basePrice) || 0;
  return {
    id: product.id,
    name: product.name ?? "",
    categoryId: product.categoryId ?? "",
    sku: product.sku ?? "",
    description: product.description ?? "",
    basePrice,
    costPrice: deriveCostPrice(basePrice),
    stock: 100,
    imageUrl: product.imageUrl ?? "",
    isFavorite: product.isFavorite ?? false,
    isAvailable: product.isAvailable ?? true,
  };
}

function defaultStaffForm(storeId: string): StaffFormState {
  return {
    name: "",
    email: "",
    username: "",
    role: Role.CASHIER,
    password: "",
    pin: "",
    defaultStoreId: storeId,
    isActive: true,
  };
}

function roleBadgeClass(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "border-[#6F4E37]/35 bg-[#6F4E37]/15 text-[#6F4E37]";
    case Role.MANAGER:
      return "border-[#DDB892] bg-[#DDB892]/35 text-[#6F4E37]";
    case Role.CASHIER:
      return "border-amber-200 bg-amber-100 text-amber-800";
    case Role.BARISTA:
      return "border-orange-200 bg-orange-100 text-orange-800";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function staffStatusBadgeClass(isActive: boolean) {
  return isActive
    ? "border-green-200 bg-green-100 text-green-800"
    : "border-gray-200 bg-gray-100 text-gray-600";
}

function productCategoryBadgeClass(categoryName?: string | null) {
  const name = (categoryName ?? "").toLowerCase();
  if (name.includes("non-coffee") || name.includes("tea") || name.includes("matcha")) {
    return "border-sky-200 bg-sky-100 text-sky-800";
  }
  if (name.includes("pastry")) return "border-amber-200 bg-amber-100 text-amber-800";
  if (name.includes("coffee")) return "border-[#6F4E37]/35 bg-[#DDB892]/35 text-[#6F4E37]";
  return "border-gray-200 bg-gray-100 text-gray-600";
}

function productStockBadgeClass(stockValue?: number) {
  const stock = typeof stockValue === "number" ? stockValue : 0;
  if (stock <= 0) return "border-red-200 bg-red-100 text-red-800";
  if (stock <= 50) return "border-amber-200 bg-amber-100 text-amber-800";
  return "border-green-200 bg-green-100 text-green-800";
}

function shiftStatusBadgeClass(status: string) {
  if (status === "OPEN") return "border-green-200 bg-green-100 text-green-800";
  if (status === "CLOSED") return "border-red-200 bg-red-100 text-red-800";
  return "border-gray-200 bg-gray-100 text-gray-600";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export function AdminDashboard({ storeId, role }: Props) {
  const queryClient = useQueryClient();
  const isAdmin = role === Role.ADMIN;
  const defaultWeeklyRange = useMemo(() => getDateRangeByPeriod("weekly"), []);

  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [overviewDateFrom, setOverviewDateFrom] = useState(defaultWeeklyRange.from);
  const [overviewDateTo, setOverviewDateTo] = useState(defaultWeeklyRange.to);
  const [shiftDateFrom, setShiftDateFrom] = useState(defaultWeeklyRange.from);
  const [shiftDateTo, setShiftDateTo] = useState(defaultWeeklyRange.to);
  const [productView, setProductView] = useState<"list" | "card">("list");

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm);
  const [productDeleteId, setProductDeleteId] = useState<string | null>(null);

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [staffForm, setStaffForm] = useState<StaffFormState>(() => defaultStaffForm(storeId));
  const [staffDeleteId, setStaffDeleteId] = useState<string | null>(null);

  const summary = useQuery<SummaryData>({
    queryKey: ["admin-summary", storeId, period, overviewDateFrom, overviewDateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId,
        period,
        startDate: overviewDateFrom,
        endDate: overviewDateTo,
      });
      const response = await fetch(`/api/reports/summary?${params.toString()}`);
      if (!response.ok) throw new Error("Failed summary");
      return response.json();
    },
  });

  const products = useQuery<ProductData>({
    queryKey: ["admin-products", storeId, isAdmin],
    queryFn: async () => {
      const params = new URLSearchParams({ storeId, all: "1", includeCost: isAdmin ? "1" : "0" });
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed products");
      return response.json();
    },
  });

  const categories = useQuery<CategoryData>({
    queryKey: ["admin-categories", storeId],
    queryFn: async () => (await fetch(`/api/categories?storeId=${storeId}`)).json(),
  });

  const settings = useQuery<SettingsData>({
    queryKey: ["admin-settings", storeId],
    queryFn: async () => (await fetch(`/api/settings?storeId=${storeId}`)).json(),
  });

  const shifts = useQuery<ShiftData>({
    queryKey: ["admin-shifts", storeId, shiftDateFrom, shiftDateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId,
        startDate: shiftDateFrom,
        endDate: shiftDateTo,
      });
      return (await fetch(`/api/shifts?${params.toString()}`)).json();
    },
  });

  const staff = useQuery<StaffData>({
    queryKey: ["admin-staff", storeId],
    enabled: isAdmin,
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed staff");
      return response.json();
    },
  });
  const createProduct = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          categoryId: payload.categoryId || null,
          name: payload.name,
          sku: payload.sku || undefined,
          description: payload.description || undefined,
          basePrice: Number(payload.basePrice) || 0,
          costPrice: deriveCostPrice(Number(payload.basePrice) || 0),
          stock: 100,
          imageUrl: payload.imageUrl || undefined,
          isFavorite: payload.isFavorite,
          isAvailable: payload.isAvailable,
        }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed create product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Product created");
      setProductDialogOpen(false);
      setProductForm(defaultProductForm());
      queryClient.invalidateQueries({ queryKey: ["admin-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateProduct = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      if (!payload.id) throw new Error("Missing product ID");
      const response = await fetch(`/api/products/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: payload.categoryId || null,
          name: payload.name,
          sku: payload.sku || undefined,
          description: payload.description || undefined,
          basePrice: Number(payload.basePrice) || 0,
          costPrice: deriveCostPrice(Number(payload.basePrice) || 0),
          stock: 100,
          imageUrl: payload.imageUrl || undefined,
          isFavorite: payload.isFavorite,
          isAvailable: payload.isAvailable,
        }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed update product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Product updated");
      setProductDialogOpen(false);
      setProductForm(defaultProductForm());
      queryClient.invalidateQueries({ queryKey: ["admin-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed delete product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Product deleted");
      setProductDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleProductAvailability = useMutation({
    mutationFn: async (payload: { id: string; isAvailable: boolean }) => {
      const response = await fetch(`/api/products/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: payload.isAvailable }),
      });
      if (!response.ok) throw new Error("Failed update availability");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products", storeId] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createStaff = useMutation({
    mutationFn: async (payload: StaffFormState) => {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email || undefined,
          username: payload.username,
          role: payload.role,
          password: payload.password,
          pin: payload.pin || undefined,
          defaultStoreId: payload.defaultStoreId || undefined,
          isActive: payload.isActive,
        }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed create staff");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Staff created");
      setStaffDialogOpen(false);
      setStaffForm(defaultStaffForm(storeId));
      queryClient.invalidateQueries({ queryKey: ["admin-staff", storeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateStaff = useMutation({
    mutationFn: async (payload: StaffFormState) => {
      if (!payload.id) throw new Error("Missing staff ID");
      const response = await fetch(`/api/staff/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email || "",
          username: payload.username,
          role: payload.role,
          password: payload.password || "",
          pin: payload.pin || "",
          defaultStoreId: payload.defaultStoreId || "",
          isActive: payload.isActive,
        }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed update staff");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Staff updated");
      setStaffDialogOpen(false);
      setStaffForm(defaultStaffForm(storeId));
      queryClient.invalidateQueries({ queryKey: ["admin-staff", storeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed delete staff");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Staff deactivated");
      setStaffDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-staff", storeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveSettings = useMutation({
    mutationFn: async (payload: SettingsData["settings"]) => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed settings save");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin-settings", storeId] });
    },
  });

  const selectedProductForDelete = useMemo(
    () => products.data?.products.find((product) => product.id === productDeleteId),
    [productDeleteId, products.data?.products],
  );

  const selectedStaffForDelete = useMemo(
    () => staff.data?.users.find((user) => user.id === staffDeleteId),
    [staff.data?.users, staffDeleteId],
  );
  const adminNavTriggerClass =
    "text-foreground hover:bg-primary hover:text-white data-[state=active]:bg-primary data-[state=active]:text-white";

  const handlePeriodChange = (nextPeriod: "daily" | "weekly" | "monthly") => {
    setPeriod(nextPeriod);
    const range = getDateRangeByPeriod(nextPeriod);
    setOverviewDateFrom(range.from);
    setOverviewDateTo(range.to);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6">
      <Tabs defaultValue="overview">
        <TabsList className="border-border mb-4 grid w-full grid-cols-4 rounded-2xl border bg-white p-1">
          <TabsTrigger value="overview" className={adminNavTriggerClass}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className={adminNavTriggerClass}>
            Products
          </TabsTrigger>
          <TabsTrigger value="staff" className={adminNavTriggerClass}>
            Staff & Shifts
          </TabsTrigger>
          <TabsTrigger value="settings" className={adminNavTriggerClass}>
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={period === "daily" ? "default" : "outline"}
                onClick={() => handlePeriodChange("daily")}
              >
                Daily
              </Button>
              <Button
                variant={period === "weekly" ? "default" : "outline"}
                onClick={() => handlePeriodChange("weekly")}
              >
                Weekly
              </Button>
              <Button
                variant={period === "monthly" ? "default" : "outline"}
                onClick={() => handlePeriodChange("monthly")}
              >
                Monthly
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-500">Tanggal awal</Label>
                <Input
                  type="date"
                  value={overviewDateFrom}
                  onChange={(event) => setOverviewDateFrom(event.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-500">Tanggal akhir</Label>
                <Input
                  type="date"
                  value={overviewDateTo}
                  onChange={(event) => setOverviewDateTo(event.target.value)}
                  className="w-[150px]"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              asChild
            >
              <a href={`/api/reports/export?storeId=${storeId}`}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </a>
            </Button>
          </div>

          {summary.isLoading ? (
            <div className="text-sm text-neutral-600">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading report...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="Total Sales"
                  value={formatCurrency(summary.data?.metrics.totalSales ?? 0)}
                />
                <MetricCard
                  title="Total Orders"
                  value={String(summary.data?.metrics.totalOrders ?? 0)}
                />
                <MetricCard
                  title="Average Order"
                  value={formatCurrency(summary.data?.metrics.avgOrderValue ?? 0)}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border bg-card rounded-3xl">
                  <CardHeader>
                    <CardTitle>Best Sellers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(summary.data?.bestSellers ?? []).map((item) => (
                      <div
                        key={item.name}
                        className="border-border flex items-center justify-between rounded-xl border bg-white p-2"
                      >
                        <span>{item.name}</span>
                        <Badge variant="secondary">{item.qty}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-border bg-card rounded-3xl">
                  <CardHeader>
                    <CardTitle>Payment Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(summary.data?.paymentBreakdown ?? {}).map(
                      ([method, amount]) => (
                        <div
                          key={method}
                          className="border-border flex items-center justify-between rounded-xl border bg-white p-2"
                        >
                          <span>{method}</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ),
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-card rounded-3xl">
                <CardHeader>
                  <CardTitle>Menu Ordered Details</CardTitle>
                  <CardDescription>
                    Mengikuti filter period dan rentang tanggal yang dipilih.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Waktu</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Menu</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Kasir</TableHead>
                          <TableHead>Waiter</TableHead>
                          <TableHead>Modal</TableHead>
                          <TableHead>Jual</TableHead>
                          {isAdmin && <TableHead>Profit</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(summary.data?.orderedItems ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDateTime(item.placedAt)}</TableCell>
                            <TableCell>{item.orderNumber}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.cashierName || "-"}</TableCell>
                            <TableCell>{item.waiterName || "-"}</TableCell>
                            <TableCell>{formatCurrency(item.costAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.salesAmount)}</TableCell>
                            {isAdmin && (
                              <TableCell className="text-success">
                                {formatCurrency(item.profitAmount)}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 md:hidden">
                    {(summary.data?.orderedItems ?? []).map((item) => (
                      <article
                        key={item.id}
                        className="border-border space-y-2 rounded-2xl border bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">{item.productName}</div>
                          <Badge variant="secondary">x{item.quantity}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-neutral-500">Order:</span> {item.orderNumber}
                          </div>
                          <div>
                            <span className="text-neutral-500">Kasir:</span> {item.cashierName || "-"}
                          </div>
                          <div>
                            <span className="text-neutral-500">Waiter:</span> {item.waiterName || "-"}
                          </div>
                          <div>
                            <span className="text-neutral-500">Waktu:</span> {formatDateTime(item.placedAt)}
                          </div>
                          <div>
                            <span className="text-neutral-500">Modal:</span>{" "}
                            {formatCurrency(item.costAmount)}
                          </div>
                          <div>
                            <span className="text-neutral-500">Jual:</span> {formatCurrency(item.salesAmount)}
                          </div>
                          {isAdmin && (
                            <div className="col-span-2 text-success">
                              <span className="text-neutral-500">Profit:</span>{" "}
                              {formatCurrency(item.profitAmount)}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="products" className="space-y-4">
          <Card className="border-border bg-card rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Tab List/Card, upload foto, stock, dan harga modal.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setProductForm(defaultProductForm());
                  setProductDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </CardHeader>
          </Card>

          <Tabs
            value={productView}
            onValueChange={(value) => setProductView(value as "list" | "card")}
          >
            <div className="flex justify-end">
              <TabsList className="bg-card border-border inline-grid w-full max-w-[110px] grid-cols-2 rounded-2xl border p-1">
                <TabsTrigger
                  value="list"
                  aria-label="List View"
                  className="hover:bg-primary hover:text-white data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <List className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger
                  value="card"
                  aria-label="Card View"
                  className="hover:bg-primary hover:text-white data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list">
              <Card className="border-border bg-card rounded-3xl">
                <CardContent className="pt-6">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Stock</TableHead>
                          {isAdmin && <TableHead>Modal</TableHead>}
                          <TableHead>Jual</TableHead>
                          {isAdmin && <TableHead>Profit</TableHead>}
                          <TableHead>Available</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(products.data?.products ?? []).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex flex-col items-center gap-1">
                                <div className="font-medium">{product.name}</div>
                                {!product.isAvailable && (
                                  <span className="text-danger text-xs">Not available</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                                  productCategoryBadgeClass(product.categoryName),
                                )}
                              >
                                {product.categoryName ?? "-"}
                              </span>
                            </TableCell>
                            <TableCell>{product.stock ?? 100}</TableCell>
                            {isAdmin && (
                              <TableCell>{formatCurrency(product.costPrice ?? 0)}</TableCell>
                            )}
                            <TableCell>{formatCurrency(product.basePrice)}</TableCell>
                            {isAdmin && (
                              <TableCell className="text-success">
                                {formatCurrency(product.profitPerItem ?? 0)}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex justify-center">
                                <div className="border-border rounded-full border p-1">
                                  <Switch
                                    checked={product.isAvailable}
                                    onCheckedChange={(checked) =>
                                      toggleProductAvailability.mutate({
                                        id: product.id,
                                        isAvailable: checked,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="inline-flex gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="hover:border-primary hover:bg-primary hover:text-white"
                                  aria-label="Edit product"
                                  onClick={() => {
                                    setProductForm(toProductForm(product));
                                    setProductDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setProductDeleteId(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 md:hidden">
                    {(products.data?.products ?? []).map((product) => (
                      <article
                        key={product.id}
                        className="border-border space-y-3 rounded-2xl border bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{product.name}</div>
                            {!product.isAvailable && (
                              <div className="text-danger mt-0.5 text-xs">Not available</div>
                            )}
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                              productCategoryBadgeClass(product.categoryName),
                            )}
                          >
                            {product.categoryName ?? "-"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="border-border rounded-xl border bg-white p-2">
                            <div className="text-xs text-neutral-500">Stock</div>
                            <div className="font-semibold">{product.stock ?? 100}</div>
                          </div>
                          <div className="border-border rounded-xl border bg-white p-2">
                            <div className="text-xs text-neutral-500">Jual</div>
                            <div className="font-semibold">{formatCurrency(product.basePrice)}</div>
                          </div>
                          {isAdmin && (
                            <div className="border-border rounded-xl border bg-white p-2">
                              <div className="text-xs text-neutral-500">Modal</div>
                              <div className="font-semibold">
                                {formatCurrency(product.costPrice ?? 0)}
                              </div>
                            </div>
                          )}
                          {isAdmin && (
                            <div className="border-border rounded-xl border bg-white p-2">
                              <div className="text-xs text-neutral-500">Profit</div>
                              <div className="text-success font-semibold">
                                {formatCurrency(product.profitPerItem ?? 0)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="border-border rounded-full border p-1">
                            <Switch
                              checked={product.isAvailable}
                              onCheckedChange={(checked) =>
                                toggleProductAvailability.mutate({
                                  id: product.id,
                                  isAvailable: checked,
                                })
                              }
                            />
                          </div>
                          <div className="inline-flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="hover:border-primary hover:bg-primary hover:text-white"
                              aria-label="Edit product"
                              onClick={() => {
                                setProductForm(toProductForm(product));
                                setProductDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setProductDeleteId(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="card">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
                {(products.data?.products ?? []).map((product) => (
                  <Card
                    key={product.id}
                    className="border-border bg-card overflow-hidden rounded-3xl"
                  >
                    <div className="bg-muted relative h-52 w-full">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 260px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                          No image
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute right-2 bottom-2 rounded-full border px-2 py-0.5 text-xs font-semibold shadow-sm",
                          productStockBadgeClass(product.stock),
                        )}
                      >
                        Stok: {product.stock ?? 100}
                      </span>
                    </div>
                    <CardContent className="space-y-1 p-3">
                      <div className="line-clamp-1 text-[15px] leading-tight font-semibold">
                        {product.name}
                      </div>
                      <div className="-mt-0.5 mb-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            productCategoryBadgeClass(product.categoryName),
                          )}
                        >
                          {product.categoryName ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2 pt-0.5">
                        <div className="min-w-0 flex-1">
                          {isAdmin && (
                            <div className="text-xs text-neutral-500">
                              Modal:{" "}
                              <span className="font-medium text-neutral-700">
                                {formatCurrency(product.costPrice ?? 0)}
                              </span>
                            </div>
                          )}
                          <div className="text-[18px] leading-tight font-bold">
                            {formatCurrency(product.basePrice)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <div className="border-border rounded-full border p-1">
                            <Switch
                              checked={product.isAvailable}
                              onCheckedChange={(checked) =>
                                toggleProductAvailability.mutate({
                                  id: product.id,
                                  isAvailable: checked,
                                })
                              }
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-[#6F4E37]/35 text-[#6F4E37] hover:bg-primary hover:text-white"
                            onClick={() => {
                              setProductForm(toProductForm(product));
                              setProductDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => setProductDeleteId(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card className="border-border bg-card rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Accounts</CardTitle>
                <CardDescription>Admin bisa mengubah semua isi akun tiap role.</CardDescription>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setStaffForm(defaultStaffForm(storeId));
                    setStaffDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="border-border rounded-2xl border bg-white p-4 text-sm text-neutral-600">
                  Staff CRUD hanya untuk ADMIN.
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(staff.data?.users ?? []).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email ?? "-"}</TableCell>
                            <TableCell>{user.username ?? "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={roleBadgeClass(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={staffStatusBadgeClass(user.isActive)}
                              >
                                {user.isActive ? "ACTIVE" : "INACTIVE"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="inline-flex gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="hover:border-primary hover:bg-primary hover:text-white"
                                  aria-label="Edit staff"
                                  onClick={() => {
                                    setStaffForm({
                                      id: user.id,
                                      name: user.name,
                                      email: user.email ?? "",
                                      username: user.username ?? "",
                                      role: user.role,
                                      password: "",
                                      pin: "",
                                      defaultStoreId: user.defaultStoreId ?? storeId,
                                      isActive: user.isActive,
                                    });
                                    setStaffDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setStaffDeleteId(user.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 md:hidden">
                    {(staff.data?.users ?? []).map((user) => (
                      <article
                        key={user.id}
                        className="border-border space-y-2 rounded-2xl border bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-xs text-neutral-500">{user.email ?? "-"}</div>
                          </div>
                          <Badge variant="secondary" className={roleBadgeClass(user.role)}>
                            {user.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-neutral-600">Username: {user.username ?? "-"}</div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className={staffStatusBadgeClass(user.isActive)}>
                            {user.isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                          <div className="inline-flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="hover:border-primary hover:bg-primary hover:text-white"
                              aria-label="Edit staff"
                              onClick={() => {
                                setStaffForm({
                                  id: user.id,
                                  name: user.name,
                                  email: user.email ?? "",
                                  username: user.username ?? "",
                                  role: user.role,
                                  password: "",
                                  pin: "",
                                  defaultStoreId: user.defaultStoreId ?? storeId,
                                  isActive: user.isActive,
                                });
                                setStaffDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setStaffDeleteId(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card rounded-3xl">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <CardTitle>Shift Summary & Reconciliation</CardTitle>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-500">Tanggal awal</Label>
                  <Input
                    type="date"
                    value={shiftDateFrom}
                    onChange={(event) => setShiftDateFrom(event.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-500">Tanggal akhir</Label>
                  <Input
                    type="date"
                    value={shiftDateTo}
                    onChange={(event) => setShiftDateTo(event.target.value)}
                    className="w-[150px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Register</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Closed</TableHead>
                      <TableHead>Modal</TableHead>
                      <TableHead>Jual</TableHead>
                      {isAdmin && <TableHead>Profit</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shifts.data?.shifts ?? []).map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell>
                          <Badge variant="secondary" className={shiftStatusBadgeClass(shift.status)}>
                            {shift.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{shift.user.name}</TableCell>
                        <TableCell>{shift.register.name}</TableCell>
                        <TableCell>{formatDateTime(shift.openedAt)}</TableCell>
                        <TableCell>{shift.closedAt ? formatDateTime(shift.closedAt) : "-"}</TableCell>
                        <TableCell>{formatCurrency(shift.totalCost)}</TableCell>
                        <TableCell>{formatCurrency(shift.totalSales)}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-success">
                            {formatCurrency(shift.totalProfit)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 md:hidden">
                {(shifts.data?.shifts ?? []).map((shift) => (
                  <article
                    key={shift.id}
                    className="border-border space-y-2 rounded-2xl border bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={shiftStatusBadgeClass(shift.status)}>
                        {shift.status}
                      </Badge>
                      <span className="text-xs text-neutral-500">{shift.register.name}</span>
                    </div>
                    <div className="text-sm">
                      <div>
                        <span className="text-neutral-500">Staff:</span> {shift.user.name}
                      </div>
                      <div>
                        <span className="text-neutral-500">Opened:</span>{" "}
                        {formatDateTime(shift.openedAt)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Closed:</span>{" "}
                        {shift.closedAt ? formatDateTime(shift.closedAt) : "-"}
                      </div>
                      <div>
                        <span className="text-neutral-500">Modal:</span>{" "}
                        {formatCurrency(shift.totalCost)}
                      </div>
                      <div>
                        <span className="text-neutral-500">Jual:</span>{" "}
                        {formatCurrency(shift.totalSales)}
                      </div>
                      {isAdmin && (
                        <div className="text-success">
                          <span className="text-neutral-500">Profit:</span>{" "}
                          {formatCurrency(shift.totalProfit)}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <Card className="border-border bg-card rounded-3xl">
            <CardHeader>
              <CardTitle>Store & Receipt Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {settings.data?.settings ? (
                <SettingsForm
                  data={settings.data.settings}
                  onSave={(payload) => saveSettings.mutate(payload)}
                  isSaving={saveSettings.isPending}
                />
              ) : (
                <div className="text-sm text-neutral-600">Loading settings...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) setProductForm(defaultProductForm());
        }}
        categories={categories.data?.categories ?? []}
        form={productForm}
        setForm={setProductForm}
        isSaving={createProduct.isPending || updateProduct.isPending}
        onSave={() => {
          if (productForm.id) {
            updateProduct.mutate(productForm);
            return;
          }
          createProduct.mutate(productForm);
        }}
      />

      <StaffDialog
        open={staffDialogOpen}
        onOpenChange={(open) => {
          setStaffDialogOpen(open);
          if (!open) setStaffForm(defaultStaffForm(storeId));
        }}
        form={staffForm}
        setForm={setStaffForm}
        isSaving={createStaff.isPending || updateStaff.isPending}
        onSave={() => {
          if (staffForm.id) {
            updateStaff.mutate(staffForm);
            return;
          }
          createStaff.mutate(staffForm);
        }}
      />

      <ConfirmDialog
        open={Boolean(productDeleteId)}
        onOpenChange={(open) => {
          if (!open) setProductDeleteId(null);
        }}
        title="Hapus produk?"
        description={`Produk "${selectedProductForDelete?.name ?? ""}" akan dinonaktifkan dari POS.`}
        confirmText="Hapus"
        isDanger
        onConfirm={async () => {
          if (!productDeleteId) return;
          await deleteProduct.mutateAsync(productDeleteId);
        }}
      />

      <ConfirmDialog
        open={Boolean(staffDeleteId)}
        onOpenChange={(open) => {
          if (!open) setStaffDeleteId(null);
        }}
        title="Nonaktifkan staff?"
        description={`Akun "${selectedStaffForDelete?.name ?? ""}" akan dinonaktifkan.`}
        confirmText="Nonaktifkan"
        isDanger
        onConfirm={async () => {
          if (!staffDeleteId) return;
          await deleteStaff.mutateAsync(staffDeleteId);
        }}
      />
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-border bg-card rounded-3xl">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  categories,
  form,
  setForm,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Array<{ id: string; name: string }>;
  form: ProductFormState;
  setForm: (form: ProductFormState) => void;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>Lengkapi data produk termasuk foto dan stok.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[calc(90vh-11rem)] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama Produk</Label>
            <Input
              value={form.name ?? ""}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select
              value={form.categoryId || "none"}
              onValueChange={(value) =>
                setForm({ ...form, categoryId: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa kategori</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input
              value={form.sku ?? ""}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Stok</Label>
            <Input type="number" min={0} value={100} disabled />
          </div>
          <div className="space-y-2">
            <Label>Harga Jual</Label>
            <Input
              type="number"
              min={0}
              value={form.basePrice ?? 0}
              onChange={(event) => {
                const nextBasePrice = Number(event.target.value) || 0;
                setForm({
                  ...form,
                  basePrice: nextBasePrice,
                  costPrice: deriveCostPrice(nextBasePrice),
                  stock: 100,
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Harga Modal</Label>
            <Input type="number" min={0} value={form.costPrice ?? 0} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Link Foto</Label>
            <Input
              value={form.imageUrl ?? ""}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Upload Foto</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const imageUrl = await fileToDataUrl(file);
                  setForm({ ...form, imageUrl });
                  toast.success("Photo uploaded");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed upload photo");
                }
              }}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Preview</Label>
            <div className="border-border bg-muted relative h-40 w-full overflow-hidden rounded-2xl border">
              {form.imageUrl ? (
                <Image
                  src={form.imageUrl}
                  alt="Product preview"
                  fill
                  sizes="640px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Belum ada foto
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.name || !form.basePrice || isSaving}
            onClick={() => {
              onSave();
            }}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : form.id ? (
              "Update Product"
            ) : (
              "Create Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function StaffDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: StaffFormState;
  setForm: (form: StaffFormState) => void;
  isSaving: boolean;
  onSave: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Staff" : "Add Staff"}</DialogTitle>
          <DialogDescription>Admin dapat mengubah seluruh data akun staff.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm({ ...form, role: value as Role })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.ADMIN}>ADMIN</SelectItem>
                <SelectItem value={Role.MANAGER}>MANAGER</SelectItem>
                <SelectItem value={Role.CASHIER}>CASHIER</SelectItem>
                <SelectItem value={Role.BARISTA}>BARISTA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Password {form.id && "(opsional)"}</Label>
            <div className="relative mt-[0.35rem]">
              <Input
                type={showPassword ? "text" : "password"}
                className="pr-10"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>PIN (4-8 digit)</Label>
            <div className="relative mt-[0.35rem]">
              <Input
                type={showPin ? "text" : "password"}
                className="pr-10"
                value={form.pin}
                onChange={(event) => setForm({ ...form, pin: event.target.value })}
                placeholder={form.id ? "Kosongkan untuk hapus PIN" : "Contoh: 123456"}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                onClick={() => setShowPin((value) => !value)}
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Default Store ID</Label>
            <Input
              value={form.defaultStoreId}
              onChange={(event) => setForm({ ...form, defaultStoreId: event.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            />
            <span className="text-sm">Active</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.name || !form.username || (!form.id && !form.password) || isSaving}
            onClick={onSave}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : form.id ? (
              "Update Staff"
            ) : (
              "Create Staff"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({
  data,
  onSave,
  isSaving,
}: {
  data: SettingsData["settings"];
  onSave: (payload: SettingsData["settings"]) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(data);

  useEffect(() => {
    setForm(data);
  }, [data]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Tax (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.taxRate}
            onChange={(event) => setForm({ ...form, taxRate: Number(event.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Service (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.serviceChargeRate}
            onChange={(event) =>
              setForm({ ...form, serviceChargeRate: Number(event.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label>Rounding Unit</Label>
          <Input
            type="number"
            min={0}
            value={form.roundingUnit}
            onChange={(event) =>
              setForm({ ...form, roundingUnit: Number(event.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Printer Name</Label>
          <Input
            value={form.printerName ?? ""}
            onChange={(event) => setForm({ ...form, printerName: event.target.value })}
          />
        </div>
        <div>
          <Label>Receipt Copies</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={form.receiptCopies}
            onChange={(event) =>
              setForm({ ...form, receiptCopies: Number(event.target.value) || 1 })
            }
          />
        </div>
      </div>
      <div>
        <Label>Receipt Header</Label>
        <Textarea
          value={form.receiptHeader ?? ""}
          onChange={(event) => setForm({ ...form, receiptHeader: event.target.value })}
        />
      </div>
      <div>
        <Label>Receipt Footer</Label>
        <Textarea
          value={form.receiptFooter ?? ""}
          onChange={(event) => setForm({ ...form, receiptFooter: event.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={form.allowTips}
          onCheckedChange={(checked) => setForm({ ...form, allowTips: checked })}
        />
        <span className="text-sm">Allow tips</span>
      </div>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving
          </>
        ) : (
          <>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Save Settings
          </>
        )}
      </Button>
    </form>
  );
}
