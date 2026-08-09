"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type ReportMode = "summary" | "detailed";

type BreakdownItem = {
  category: string;
  type: "INCOME" | "EXPENSE";
  total: number;
};

type LineItem = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  source: "MANUAL" | "IMPORT" | "KASBON";
  kasbonType: string | null;
  kasbonRef: string | null;
};

type ReportResponse = {
  summary: { income: number; expense: number; laba: number };
  breakdown: BreakdownItem[];
  mode: ReportMode;
  lines: LineItem[];
};

export default function DashboardPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mode, setMode] = useState<ReportMode>("summary");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportResponse>({
    summary: { income: 0, expense: 0, laba: 0 },
    breakdown: [],
    mode: "summary",
    lines: [],
  });

  const fmt = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("mode", mode);

      const res = await fetch(`/api/report/simple?${params.toString()}`);
      const data = (await res.json()) as ReportResponse | { error: string };
      if (!res.ok || "error" in data) throw new Error("error" in data ? data.error : "Gagal memuat laporan");
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportReport = (format: "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("mode", mode);
    params.append("format", format);
    window.open(`/api/report/simple/export?${params.toString()}`, "_blank");
  };

  const incomeBreakdown = report.breakdown.filter((item) => item.type === "INCOME");
  const expenseBreakdown = report.breakdown.filter((item) => item.type === "EXPENSE");
  const isProfit = report.summary.laba >= 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <BarChart3 className="text-violet-600" size={28} />
            Dashboard Keuangan
          </h1>
          <p className="page-subtitle">Ringkasan pemasukan, pengeluaran, dan laba/rugi</p>
        </div>
      </div>

      <div className="card p-5 animate-slide-up-2">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={13} className="text-violet-500" />
              Dari Tanggal
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input w-44" />
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={13} className="text-violet-500" />
              Sampai Tanggal
            </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input w-44" />
          </div>
          <button onClick={fetchReport} className="btn btn-primary">
            <Search size={16} /> Terapkan Filter
          </button>
          <div>
            <label className="form-label">Mode Laporan</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as ReportMode)} className="form-input w-44">
              <option value="summary">Ringkas</option>
              <option value="detailed">Detail + Keterangan</option>
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
        <div className="card p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm">Memuat data laporan...</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-5 animate-slide-up-3">
            <div className="stat-emerald rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Pemasukan</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">{fmt(report.summary.income)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs"><ArrowUpRight size={14} /><span>Semua transaksi masuk</span></div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl"><TrendingUp size={22} /></div>
              </div>
            </div>

            <div className="stat-rose rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-rose-100 text-sm font-medium">Total Pengeluaran</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">{fmt(report.summary.expense)}</h3>
                  <div className="flex items-center gap-1 mt-2 text-rose-100 text-xs"><ArrowDownRight size={14} /><span>Semua transaksi keluar</span></div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl"><TrendingDown size={22} /></div>
              </div>
            </div>

            <div className={`rounded-2xl p-6 text-white ${isProfit ? "stat-violet" : "stat-amber"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium">{isProfit ? "Laba Bersih" : "Rugi Bersih"}</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">{fmt(report.summary.laba)}</h3>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl"><DollarSign size={22} /></div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 animate-slide-up-4">
            <div className="card overflow-hidden">
              <div className="section-header bg-emerald-50/60"><h3 className="text-emerald-800">Rincian Pemasukan per Kategori</h3></div>
              <table className="data-table">
                <thead><tr><th>Kategori</th><th className="text-right">Jumlah</th></tr></thead>
                <tbody>
                  {incomeBreakdown.length === 0 ? (
                    <tr><td colSpan={2} className="text-center text-slate-400 py-8">Belum ada pemasukan</td></tr>
                  ) : (
                    incomeBreakdown.map((item) => (
                      <tr key={`i-${item.category}`}><td>{item.category}</td><td className="text-right font-semibold text-emerald-600">{fmt(item.total)}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden">
              <div className="section-header bg-rose-50/60"><h3 className="text-rose-800">Rincian Pengeluaran per Kategori</h3></div>
              <table className="data-table">
                <thead><tr><th>Kategori</th><th className="text-right">Jumlah</th></tr></thead>
                <tbody>
                  {expenseBreakdown.length === 0 ? (
                    <tr><td colSpan={2} className="text-center text-slate-400 py-8">Belum ada pengeluaran</td></tr>
                  ) : (
                    expenseBreakdown.map((item) => (
                      <tr key={`e-${item.category}`}><td>{item.category}</td><td className="text-right font-semibold text-rose-600">{fmt(item.total)}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {mode === "detailed" && (
            <div className="card overflow-hidden animate-slide-up-4">
              <div className="section-header bg-slate-50">
                <h3>Detail Transaksi (dengan keterangan)</h3>
                <span className="badge badge-slate">{report.lines.length} baris</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Tipe</th><th>Sumber</th><th>Kasbon Ref</th><th className="text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.date.slice(0, 10)}</td>
                      <td>{line.description}</td>
                      <td>{line.category}</td>
                      <td>{line.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}</td>
                      <td>{line.source}</td>
                      <td>{line.kasbonRef ?? "-"}</td>
                      <td className={`text-right font-semibold ${line.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>{fmt(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
