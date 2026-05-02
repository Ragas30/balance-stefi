"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ShoppingCart, Receipt, Calculator, Save, Loader2 } from "lucide-react";

type Product = {
    id: string;
    name: string;
    price: number;
    stock: number;
};

type PenjualanItem = {
    id: string;
    productId: string;
    qty: number;
    price: number;
};

export default function PenjualanPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<PenjualanItem[]>([
        { id: "1", productId: "", qty: 1, price: 0 }
    ]);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [voucherCode, setVoucherCode] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/products")
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error(err));
    }, []);

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), productId: "", qty: 1, price: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof PenjualanItem, value: string | number) => {
        let newItems = items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                // Autofill price if product selected
                if (field === "productId") {
                    const prod = products.find(p => p.id === value);
                    if (prod) updated.price = Number(prod.price);
                }
                return updated;
            }
            return item;
        });
        setItems(newItems);
    };

    const total = items.reduce((sum, item) => sum + (item.qty * item.price), 0);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val);
    };

    const handleSave = async () => {
        // Validation
        const validItems = items.filter(i => i.productId && i.qty > 0 && i.price >= 0);
        if (validItems.length === 0) return alert("Pilih minimal 1 produk");
        if (paymentMethod === "VOUCHER" && !voucherCode) return alert("Kode Voucher wajib diisi");
        if (paymentMethod === "KASBON" && !customerName) return alert("Nama Kasbon wajib diisi");

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
                    details: validItems.map(i => ({
                        productId: i.productId,
                        qty: i.qty,
                        price: i.price
                    }))
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("Transaksi Penjualan Berhasil Disimpan!");
            // Reset form
            setItems([{ id: Date.now().toString(), productId: "", qty: 1, price: 0 }]);
            setVoucherCode("");
            setCustomerName("");
        } catch (e: any) {
            alert(e.message || "Gagal menyimpan penjualan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <ShoppingCart className="text-blue-600" size={32} />
                    Catat Penjualan Baru
                </h1>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Form Items - Takes 2 columns */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                                <Receipt size={20} /> Detail Item
                            </h2>
                            <button
                                onClick={addItem}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors"
                            >
                                <Plus size={16} /> Tambah Baris
                            </button>
                        </div>

                        {/* Labels */}
                        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
                            <div className="col-span-5 text-sm font-medium text-slate-500">Nama Produk</div>
                            <div className="col-span-2 text-sm font-medium text-slate-500">Qty</div>
                            <div className="col-span-3 text-sm font-medium text-slate-500">Harga Satuan</div>
                            <div className="col-span-2 text-sm font-medium text-slate-500 text-right">Subtotal</div>
                        </div>

                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <div className="col-span-5">
                                        <select
                                            value={item.productId}
                                            onChange={(e) => updateItem(item.id, "productId", e.target.value)}
                                            className="w-full border-slate-200 rounded-md p-2 text-sm focus:ring-blue-500 outline-none border"
                                        >
                                            <option value="">Pilih Produk...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 0)}
                                            className="w-full border-slate-200 rounded-md p-2 text-sm focus:ring-blue-500 outline-none border"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.price}
                                            onChange={(e) => updateItem(item.id, "price", parseInt(e.target.value) || 0)}
                                            className="w-full border-slate-200 rounded-md p-2 text-sm focus:ring-blue-500 outline-none border"
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end gap-2">
                                        <span className="text-sm font-semibold text-slate-700">
                                            {formatCurrency(item.qty * item.price)}
                                        </span>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length === 1}
                                            className="text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-400 p-1"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar - Takes 1 column */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-6">
                    <h2 className="text-xl font-semibold text-slate-700 flex items-center gap-2 mb-6">
                        <Calculator size={20} /> Pembayaran
                    </h2>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-600">Metode Pembayaran</label>
                            <div className="space-y-2">
                                {["CASH", "VOUCHER", "KASBON"].map((method) => (
                                    <label key={method} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === method ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value={method}
                                            checked={paymentMethod === method}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700">{method === "CASH" ? "Tunai (Cash)" : method === "VOUCHER" ? "Voucher Belanja" : "Kasbon (Piutang)"}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {paymentMethod === "VOUCHER" && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-medium mb-1 text-slate-600">Kode Voucher</label>
                                <input
                                    type="text"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value)}
                                    placeholder="Masukkan kode voucher"
                                    className="w-full border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none border text-sm"
                                />
                            </div>
                        )}

                        {paymentMethod === "KASBON" && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-medium mb-1 text-slate-600">Nama Pelanggan/Karyawan</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Nama kasbon"
                                    className="w-full border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none border text-sm"
                                />
                            </div>
                        )}

                        <hr className="border-slate-200" />

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-slate-500">Total Tagihan</span>
                                <span className="text-3xl font-bold text-slate-800">{formatCurrency(total)}</span>
                            </div>
                            <div className="text-xs text-slate-400 text-right">Termasuk {items.reduce((s, i) => s + i.qty, 0)} item</div>
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white p-3 rounded-lg flex justify-center items-center gap-2 font-semibold transition-colors shadow-sm mt-4"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? "Menyimpan..." : "Simpan Transaksi"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
