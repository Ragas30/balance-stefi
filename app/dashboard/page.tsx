"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Search } from "lucide-react";

type BreakdownItem = {
    id: string;
    code: string;
    name: string;
    type: "REVENUE" | "EXPENSE";
    total: number;
};

export default function DashboardPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<{
        summary: { revenue: number, expense: number, laba: number },
        breakdown: BreakdownItem[]
    }>({ summary: { revenue: 0, expense: 0, laba: 0 }, breakdown: [] });

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            let url = "/api/report/laba-rugi";
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setReport(data);
        } catch (e) {
            console.error(e);
            alert("Gagal mengambil laporan.");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val);
    };

    const revenues = report.breakdown.filter(i => i.type === "REVENUE");
    const expenses = report.breakdown.filter(i => i.type === "EXPENSE");

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
            <h1 className="text-3xl font-bold text-slate-800">Dashboard Keuangan</h1>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600">Dari Tanggal</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none w-48"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600">Sampai Tanggal</label>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none w-48"
                    />
                </div>
                <button 
                    onClick={fetchReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
                    <Search size={18} /> Terapkan Filter
                </button>
            </div>

            {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-500">Memuat data Laba Rugi...</div>
            ) : (
                <>
                    {/* Ringkasan Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-emerald-100 font-medium">Total Pendapatan</p>
                                    <h3 className="text-2xl font-bold mt-1">{formatCurrency(report.summary.revenue)}</h3>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-6 text-white shadow hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-rose-100 font-medium">Total Beban/Pengeluaran</p>
                                    <h3 className="text-2xl font-bold mt-1">{formatCurrency(report.summary.expense)}</h3>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <TrendingDown size={24} />
                                </div>
                            </div>
                        </div>

                        <div className={`bg-gradient-to-br rounded-xl p-6 text-white shadow hover:-translate-y-1 transition-transform ${report.summary.laba >= 0 ? "from-blue-600 to-blue-700" : "from-orange-500 to-orange-600"}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-white/80 font-medium">{report.summary.laba >= 0 ? "Laba Bersih" : "Rugi Bersih"}</p>
                                    <h3 className="text-2xl font-bold mt-1">{formatCurrency(report.summary.laba)}</h3>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <DollarSign size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rincian Table */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Pendapatan */}
                        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-emerald-50 border-b p-4">
                                <h2 className="text-lg font-semibold text-emerald-800">Rincian Pendapatan (Revenue)</h2>
                            </div>
                            <div className="p-4">
                                <table className="w-full text-left">
                                    <tbody>
                                        {revenues.length > 0 ? revenues.map(r => (
                                            <tr key={r.id} className="border-b last:border-0 border-slate-100">
                                                <td className="py-3 text-slate-700">{r.code} - {r.name}</td>
                                                <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(r.total)}</td>
                                            </tr>
                                        )) : (
                                            <tr><td className="py-4 text-center text-slate-500 italic">Belum ada pendapatan.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Beban */}
                        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-rose-50 border-b p-4">
                                <h2 className="text-lg font-semibold text-rose-800">Rincian Beban (Expense)</h2>
                            </div>
                            <div className="p-4">
                                <table className="w-full text-left">
                                    <tbody>
                                        {expenses.length > 0 ? expenses.map(e => (
                                            <tr key={e.id} className="border-b last:border-0 border-slate-100">
                                                <td className="py-3 text-slate-700">{e.code} - {e.name}</td>
                                                <td className="py-3 text-right font-medium text-rose-600">{formatCurrency(e.total)}</td>
                                            </tr>
                                        )) : (
                                            <tr><td className="py-4 text-center text-slate-500 italic">Belum ada beban.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
