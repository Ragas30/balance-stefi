"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Receipt,
  Calculator,
  Save,
  Loader2,
  Banknote,
  CreditCard,
  UserRound,
  AlertCircle,
} from "lucide-react";
import Toast from "@/components/Toast";

type PenjualanItem = { id: string; label: string; qty: number; price: number };

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: typeof Banknote; color: string; bg: string }
> = {
  CASH:   { label: "Tunai (Cash)",        icon: Banknote,    color: "text-emerald-600", bg: "border-emerald-400 bg-emerald-50" },
  VOUCHER:{ label: "Voucher Belanja",     icon: CreditCard,  color: "text-rose-600",    bg: "border-rose-400 bg-rose-50" },
  KASBON: { label: "Kasbon (Piutang)",    icon: UserRound,   color: "text-amber-600",   bg: "border-amber-400 bg-amber-50" },
};

export default function PenjualanPage() {
  const [items, setItems] = useState<PenjualanItem[]>([
    { id: "1", label: "", qty: 1, price: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [voucherCode, setVoucherCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const addItem = () =>
    setItems([...items, { id: Date.now().toString(), label: "", qty: 1, price: 0 }]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof PenjualanItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (showProducts && !products.length) {
      setLoadingProducts(true);
      fetch("/api/products")
        .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => { if (Array.isArray(data)) setProducts(data); })
        .catch(() => {})
        .finally(() => setLoadingProducts(false));
    }
  }, [showProducts, products.length]);

  const handleSave = async () => {
    const validItems = items.filter((i) => i.label.trim() && i.qty > 0 && i.price >= 0);
    if (!validItems.length) return setError("Isi minimal 1 produk");
    if (paymentMethod === "VOUCHER" && !voucherCode) return setError("Kode Voucher wajib diisi");
    if (paymentMethod === "KASBON" && !customerName) return setError("Nama Kasbon wajib diisi");

    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(),
          paymentMethod,
          voucherCode: paymentMethod === "VOUCHER" ? voucherCode : undefined,
          customerName: paymentMethod === "KASBON" ? customerName : undefined,
          details: validItems.map((i) => ({
            label: i.label.trim(),
            qty: i.qty,
            price: i.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setItems([{ id: Date.now().toString(), label: "", qty: 1, price: 0 }]);
      setVoucherCode("");
      setCustomerName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan penjualan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Toast show={success} message="Transaksi berhasil disimpan!" onClose={() => setSuccess(false)} />
      <Toast show={!!error} message={error} type="error" onClose={() => setError("")} />

      {/* Header */}
      <div className="animate-slide-up flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ShoppingCart className="text-emerald-600" size={28} />
            Catat Penjualan
          </h1>
          <p className="page-subtitle">Input transaksi penjualan dan pilih metode pembayaran</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Items Form */}
        <div className="md:col-span-2 animate-slide-up-2">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Receipt size={18} className="text-emerald-500" />
                Detail Item Penjualan
              </h2>
              <button onClick={addItem} className="btn btn-ghost text-emerald-600 text-sm py-2 px-3">
                <Plus size={15} /> Tambah Baris
              </button>
            </div>

            {/* Header Labels */}
            <div className="grid grid-cols-12 gap-3 mb-2 px-1">
              <div className="col-span-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Produk</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</div>
              <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Harga</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Subtotal</div>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="col-span-5">
                    <div className="relative">
                      <input
                        type="text"
                        value={item.label}
                        onFocus={() => setShowProducts(true)}
                        onChange={(e) => updateItem(item.id, "label", e.target.value)}
                        placeholder="Cari produk..."
                        className="form-input text-sm"
                      />
                      {showProducts && products.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {loadingProducts ? (
                            <div className="p-3 text-sm text-slate-400 text-center">Loading...</div>
                          ) : (
                            products.filter((p) => p.name.toLowerCase().includes(item.label.toLowerCase())).slice(0, 10).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between items-center"
                                onClick={() => {
                                  updateItem(item.id, "label", p.name);
                                  updateItem(item.id, "price", Number(p.price));
                                  setShowProducts(false);
                                }}
                              >
                                <span>{p.name}</span>
                                <span className="text-xs text-slate-400 font-mono">{fmt(Number(p.price))}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 0)}
                      className="form-input text-sm text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                      className="form-input text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      {fmt(item.qty * item.price)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Row */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-slate-500">{totalItems} item dipilih</p>
                <p className="text-lg font-bold text-slate-800">{fmt(total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Sidebar */}
        <div className="animate-slide-up-3">
          <div className="card p-6 sticky top-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
              <Calculator size={18} className="text-violet-500" />
              Pembayaran
            </h2>

            {/* Payment Methods */}
            <div className="space-y-2.5 mb-5">
              {Object.entries(METHOD_CONFIG).map(([method, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = paymentMethod === method;
                return (
                  <label
                    key={method}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected ? cfg.bg + " " + cfg.color.replace("text-", "border-").replace("-600", "-400") : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={isSelected}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <Icon size={17} className={isSelected ? cfg.color : "text-slate-400"} />
                    <span className={`text-sm font-semibold ${isSelected ? cfg.color : "text-slate-600"}`}>
                      {cfg.label}
                    </span>
                    {isSelected && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-current opacity-60" />
                    )}
                  </label>
                );
              })}
            </div>

            {/* Conditional fields */}
            {paymentMethod === "VOUCHER" && (
              <div className="mb-4 animate-slide-up">
                <label className="form-label">Kode Voucher</label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="VCHR-XXXXX"
                  className="form-input"
                />
              </div>
            )}
            {paymentMethod === "KASBON" && (
              <div className="mb-4 animate-slide-up">
                <label className="form-label">Nama Pelanggan / Karyawan</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama kasbon..."
                  className="form-input"
                />
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-slate-500">Total Tagihan</span>
                <span className="text-2xl font-bold text-slate-800">{fmt(total)}</span>
              </div>
              <p className="text-xs text-slate-400 text-right mb-4">{totalItems} item</p>

              <button
                onClick={handleSave}
                disabled={loading}
                className="btn btn-emerald w-full justify-center py-3 text-base"
              >
                {loading ? <div className="spinner" /> : <Save size={18} />}
                {loading ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
