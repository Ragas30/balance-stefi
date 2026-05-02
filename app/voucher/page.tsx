"use client";

import { useState, useEffect } from "react";
import { Ticket, Plus, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Voucher = {
    id: string;
    code: string;
    value: number;
    balance: number;
    status: "ACTIVE" | "USED";
};

export default function VoucherPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [newVoucherValue, setNewVoucherValue] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        try {
            const res = await fetch("/api/voucher");
            const data = await res.json();
            if (res.ok) setVouchers(data);
        } catch (e) {
            console.error(e);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseInt(newVoucherValue);
        if (!val || val <= 0) return;

        setLoading(true);
        try {
            const code = `VCHR-${Math.floor(Math.random() * 90000) + 10000}`;
            const res = await fetch("/api/voucher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    value: val
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("Voucher berhasil diterbitkan!");
            setNewVoucherValue("");
            setIsGenerating(false);
            fetchVouchers(); // Refresh data
        } catch (error: any) {
            alert(error.message || "Gagal menerbitkan voucher");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <Ticket className="text-rose-600" size={32} />
                    Manajemen Voucher
                </h1>
                <button 
                    onClick={() => setIsGenerating(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} /> Terbitkan Voucher
                </button>
            </div>

            {/* Modal Terbitkan Voucher */}
            {isGenerating && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 relative">
                        <button 
                            onClick={() => setIsGenerating(false)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                        >
                            <XCircle size={24} />
                        </button>
                        
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-800">
                            <Ticket size={24} className="text-rose-600" /> Form Voucher Baru
                        </h2>
                        
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Nominal Voucher (Rp)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={newVoucherValue}
                                    onChange={(e) => setNewVoucherValue(e.target.value)}
                                    placeholder="Contoh: 100000"
                                    className="w-full border-slate-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-rose-500 outline-none border"
                                    required
                                />
                            </div>
                            <div className="bg-rose-50 text-rose-800 text-sm p-4 rounded-lg flex items-start gap-3">
                                <Ticket size={20} className="shrink-0 mt-0.5" />
                                <p>Sistem akan secara otomatis membuat kode unik dan mencatat utang voucher pada jurnal akuntansi Anda.</p>
                            </div>
                            <button 
                                type="submit"
                                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2"
                                disabled={!newVoucherValue || loading}
                            >
                                {loading ? <Loader2 className="animate-spin" size={18}/> : null}
                                {loading ? "Memproses..." : "Proses & Terbitkan"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Rekap Card */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Voucher Aktif</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {vouchers.filter(v => v.status === "ACTIVE").length} <span className="text-base font-normal text-slate-500">tiket</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Saldo Voucher</p>
                        <p className="text-2xl font-bold text-rose-600">
                            {formatCurrency(vouchers.reduce((acc, v) => acc + Number(v.balance), 0))}
                        </p>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cari kode voucher..." 
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none w-64"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-sm text-slate-600">
                                <th className="p-4 font-semibold">Kode Voucher</th>
                                <th className="p-4 font-semibold">Nominal Asli</th>
                                <th className="p-4 font-semibold">Sisa Saldo</th>
                                <th className="p-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vouchers.map((v) => (
                                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                                        <Ticket size={16} className="text-slate-400" /> {v.code}
                                    </td>
                                    <td className="p-4 text-slate-600">{formatCurrency(Number(v.value))}</td>
                                    <td className="p-4 font-semibold text-slate-700">{formatCurrency(Number(v.balance))}</td>
                                    <td className="p-4">
                                        {v.status === "ACTIVE" ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                                                <CheckCircle2 size={14} /> Aktif
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                                                <XCircle size={14} /> Terpakai
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {vouchers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Belum ada data voucher.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
