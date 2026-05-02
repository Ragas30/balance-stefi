"use client";

import { useState, useEffect } from "react";
import { UserRound, Store, Plus, Search, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

type Kasbon = {
    id: string;
    customer?: string; // from PIUTANG
    name?: string;     // from UTANG
    total: number;
    paid: number;
    status: "LUNAS" | "BELUM_LUNAS";
};

export default function KasbonPage() {
    const [activeTab, setActiveTab] = useState<"PIUTANG" | "UTANG">("PIUTANG");
    const [piutangData, setPiutangData] = useState<Kasbon[]>([]);
    const [utangData, setUtangData] = useState<Kasbon[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Form state
    const [formName, setFormName] = useState("");
    const [formTotal, setFormTotal] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchKasbon();
    }, []);

    const fetchKasbon = async () => {
        try {
            const res = await fetch("/api/kasbon");
            const data = await res.json();
            if (res.ok) {
                // Map customer to name for unified mapping in UI
                setPiutangData(data.piutang.map((i: any) => ({ ...i, name: i.customer })));
                setUtangData(data.utang);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        const total = parseInt(formTotal);
        if (!total || total <= 0 || !formName) return;

        setLoading(true);
        try {
            const res = await fetch("/api/kasbon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: activeTab,
                    name: formName,
                    total: total
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("Pencatatan Berhasil!");
            setFormName("");
            setFormTotal("");
            setIsGenerating(false);
            fetchKasbon();
        } catch (error: any) {
            alert(error.message || "Gagal mencatat kasbon");
        } finally {
            setLoading(false);
        }
    };

    const currentData = activeTab === "PIUTANG" ? piutangData : utangData;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <UserRound className="text-indigo-600" size={32} />
                    Manajemen Kasbon
                </h1>
                <button 
                    onClick={() => setIsGenerating(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} /> {activeTab === "PIUTANG" ? "Catat Piutang Baru" : "Catat Utang Baru"}
                </button>
            </div>

            {/* Modal Form */}
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
                            {activeTab === "PIUTANG" ? <UserRound size={24} className="text-indigo-600" /> : <Store size={24} className="text-orange-600" />} 
                            Form {activeTab === "PIUTANG" ? "Piutang" : "Utang"} Baru
                        </h2>
                        
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">{activeTab === "PIUTANG" ? "Nama Pelanggan / Karyawan" : "Nama Supplier / Toko"}</label>
                                <input 
                                    type="text" 
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                    className="w-full border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Total Pinjaman (Rp)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={formTotal}
                                    onChange={(e) => setFormTotal(e.target.value)}
                                    placeholder="Contoh: 100000"
                                    className="w-full border-slate-300 rounded-lg p-3 text-lg focus:ring-2 focus:ring-indigo-500 outline-none border"
                                    required
                                />
                            </div>
                            <div className="bg-indigo-50 text-indigo-800 text-sm p-4 rounded-lg flex items-start gap-3">
                                <Clock size={20} className="shrink-0 mt-0.5" />
                                <p>Sistem akan secara otomatis menjurnal transaksi ini sebagai pengeluaran pinjaman (Kas/Hutang/Piutang).</p>
                            </div>
                            <button 
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2"
                                disabled={!formName || !formTotal || loading}
                            >
                                {loading ? <Loader2 className="animate-spin" size={18}/> : null}
                                {loading ? "Menyimpan..." : "Simpan Pencatatan"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Rekap Card */}
            <div className="grid md:grid-cols-2 gap-6">
                <div 
                    onClick={() => setActiveTab("PIUTANG")}
                    className={`cursor-pointer rounded-xl p-6 shadow-sm border transition-all ${activeTab === "PIUTANG" ? "bg-white border-indigo-500 ring-1 ring-indigo-500" : "bg-slate-50 border-slate-200 hover:bg-white"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${activeTab === "PIUTANG" ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500"}`}>
                            <UserRound size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Piutang (Pelanggan/Karyawan)</p>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {formatCurrency(piutangData.reduce((acc, curr) => acc + (Number(curr.total) - Number(curr.paid)), 0))}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Total tagihan yang belum dibayar ke toko</p>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setActiveTab("UTANG")}
                    className={`cursor-pointer rounded-xl p-6 shadow-sm border transition-all ${activeTab === "UTANG" ? "bg-white border-indigo-500 ring-1 ring-indigo-500" : "bg-slate-50 border-slate-200 hover:bg-white"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${activeTab === "UTANG" ? "bg-orange-100 text-orange-600" : "bg-slate-200 text-slate-500"}`}>
                            <Store size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Utang (Supplier/Toko)</p>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {formatCurrency(utangData.reduce((acc, curr) => acc + (Number(curr.total) - Number(curr.paid)), 0))}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Total kewajiban toko yang harus dibayar</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="font-semibold text-slate-700">
                        {activeTab === "PIUTANG" ? "Daftar Piutang Aktif Jangka Pendek" : "Daftar Utang Jatuh Tempo"}
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cari nama..." 
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white border-b border-slate-200 text-sm text-slate-600">
                                <th className="p-4 font-semibold">{activeTab === "PIUTANG" ? "Nama Pelanggan" : "Nama Supplier"}</th>
                                <th className="p-4 font-semibold text-right">Total Tagihan</th>
                                <th className="p-4 font-semibold text-right">Sudah Dibayar</th>
                                <th className="p-4 font-semibold text-right">Sisa / Kurang</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((item) => (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800">{item.name}</td>
                                    <td className="p-4 text-right text-slate-700">{formatCurrency(Number(item.total))}</td>
                                    <td className="p-4 text-right text-emerald-600">{formatCurrency(Number(item.paid))}</td>
                                    <td className="p-4 text-right font-semibold text-rose-600">
                                        {formatCurrency(Number(item.total) - Number(item.paid))}
                                    </td>
                                    <td className="p-4 text-center">
                                        {item.status === "LUNAS" ? (
                                            <span className="inline-flex flex-col items-center gap-1 text-emerald-600 text-xs font-semibold">
                                                <CheckCircle2 size={18} /> Lunas
                                            </span>
                                        ) : (
                                            <span className="inline-flex flex-col items-center gap-1 text-orange-500 text-xs font-semibold">
                                                <Clock size={18} /> Belum Lunas
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {currentData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        Belum ada data.
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
