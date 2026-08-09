"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Toast from "@/components/Toast";

type Mode = "summary" | "detailed";

type LabaRugiSummary = {
  revenue: number;
  expense: number;
  laba: number;
};

type BreakdownItem = {
  id: string;
  name: string;
  code: string;
  type: "REVENUE" | "EXPENSE";
  total: number;
};

type LineItem = {
  date: string;
  description: string;
  accountCode: string;
  accountName: string;
  type: "REVENUE" | "EXPENSE";
  debit: number;
  credit: number;
  amount: number;
};

type LabaRugiResponse = {
  summary: LabaRugiSummary;
  breakdown: BreakdownItem[];
  mode: Mode;
  lines: LineItem[];
};

export default function LaporanPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mode, setMode] = useState<Mode>("summary");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LabaRugiResponse | null>(null);
  const [error, setError] = useState("");

  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("mode", mode);

      const res = await fetch(`/api/report/laba-rugi?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memuat laporan");
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const exportReport = (format: "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("mode", mode);
    params.append("format", format);
    window.open(`/api/report/laba-rugi/export?${params.toString()}`, "_blank");
  };

  const summary = data?.summary;
  const isProfit = summary ? summary.laba >= 0 : true;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toast show={!!error} message={error} type="error" onClose={() => setError("")} />

      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <FileText className="text-sky-600" size={28} />
            Laporan Laba Rugi
          </h1>
          <p className="page-subtitle">Laporan pendapatan dan beban untuk menganalisis laba/rugi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 animate-slide-up-2">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={13} className="text-sky-500" />
              Dari Tanggal
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-44" />
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={13} className="text-sky-500" />
              Sampai Tanggal
            </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-44" />
          </div>
          <button onClick={fetchReport} className="btn btn-primary">
            <Search size={16} /> Terapkan Filter
          </button>
          <div>
            <label className="form-label">Mode Laporan</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="form-input w-44">
              <option value="summary">Ringkas</option>
              <option value="detailed">Detail</option>
            </select>
          </div>
          <button onClick={() => { setStartDate(""); setEndDate(""); }} className="btn btn-ghost">
            <RefreshCw size={16} /> Reset
          </button>
          <button onClick={() => exportReport("excel")} className="btn btn-ghost">
            <Download size={16} /> Export Excel
          </button>
          <button onClick={() => exportReport("pdf")} className="btn btn-ghost">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-16 flex flex-col items-center justify-center gap-3 text-slate-400 animate-slide-up-3">
          <div className="w-10 h-10 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-sm">Memuat laporan...</p>
        </div>
      ) : !summary ? (
        <div className="card p-16 text-center text-slate-400 animate-slide-up-3">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p>Tidak ada data laporan</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-5 animate-slide-up-3">
            <div className="stat-emerald rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Pendapatan</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">{fmt(summary.revenue)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs"><ArrowUpRight size={14} /><span>Semua pemasukan</span></div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl"><TrendingUp size={22} /></div>
              </div>
            </div>

            <div className="stat-rose rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-rose-100 text-sm font-medium">Total Beban</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">{fmt(summary.expense)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-rose-100 text-xs"><ArrowDownRight size={14} /><span>Semua pengeluaran</span></div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl"><TrendingDown size={22} /></div>
              </div>
            </div>

            <div className={`rounded-2xl p-6 text-white ${isProfit ? "stat-violet" : "stat-amber"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium">{isProfit ? "Laba Bersih" : "Rugi Bersih"}</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">{fmt(summary.laba)}</h3>
                  <p className="text-xs text-white/60 mt-2">Pendapatan - Beban</p>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl"><DollarSign size={22} /></div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid md:grid-cols-2 gap-5 animate-slide-up-4">
            <div className="card overflow-hidden">
              <div className="section-header bg-emerald-50/60"><h3 className="text-emerald-800">Rincian Pendapatan</h3></div>
              <table className="data-table">
                <thead><tr><th>Akun</th><th className="text-right">Jumlah</th></tr></thead>
                <tbody>
                  {data?.breakdown.filter((b) => b.type === "REVENUE").map((item) => (
                    <tr key={item.id}>
                      <td><span className="font-mono text-xs text-slate-400">{item.code}</span> {item.name}</td>
                      <td className="text-right font-semibold text-emerald-600">{fmt(item.total)}</td>
                    </tr>
                  ))}
                  {data?.breakdown.filter((b) => b.type === "REVENUE").length === 0 && (
                    <tr><td colSpan={2} className="text-center text-slate-400 py-8">Tidak ada pendapatan</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden">
              <div className="section-header bg-rose-50/60"><h3 className="text-rose-800">Rincian Beban</h3></div>
              <table className="data-table">
                <thead><tr><th>Akun</th><th className="text-right">Jumlah</th></tr></thead>
                <tbody>
                  {data?.breakdown.filter((b) => b.type === "EXPENSE").map((item) => (
                    <tr key={item.id}>
                      <td><span className="font-mono text-xs text-slate-400">{item.code}</span> {item.name}</td>
                      <td className="text-right font-semibold text-rose-600">{fmt(item.total)}</td>
                    </tr>
                  ))}
                  {data?.breakdown.filter((b) => b.type === "EXPENSE").length === 0 && (
                    <tr><td colSpan={2} className="text-center text-slate-400 py-8">Tidak ada beban</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed lines */}
          {mode === "detailed" && data?.lines && data.lines.length > 0 && (
            <div className="card overflow-hidden animate-slide-up-4">
              <div className="section-header bg-slate-50">
                <h3>Detail Transaksi</h3>
                <span className="badge badge-slate">{data.lines.length} baris</span>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Keterangan</th>
                      <th>Akun</th>
                      <th>Tipe</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Kredit</th>
                      <th className="text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line, i) => (
                      <tr key={i}>
                        <td className="text-xs">{line.date.slice(0, 10)}</td>
                        <td>{line.description}</td>
                        <td><span className="font-mono text-xs">{line.accountCode}</span> {line.accountName}</td>
                        <td>{line.type === "REVENUE" ? "Pendapatan" : "Beban"}</td>
                        <td className="text-right text-slate-500">{line.debit > 0 ? fmt(line.debit) : "-"}</td>
                        <td className="text-right text-slate-500">{line.credit > 0 ? fmt(line.credit) : "-"}</td>
                        <td className={`text-right font-semibold ${line.type === "REVENUE" ? "text-emerald-600" : "text-rose-600"}`}>
                          {fmt(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
