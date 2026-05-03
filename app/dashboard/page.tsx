"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from "lucide-react";

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
  const [mode, setMode] = useState<"summary" | "detailed">("summary");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{
    summary: { revenue: number; expense: number; laba: number };
    breakdown: BreakdownItem[];
    mode: "summary" | "detailed";
    lines: Array<{
      date: string;
      description: string;
      accountCode: string;
      accountName: string;
      type: "REVENUE" | "EXPENSE";
      debit: number;
      credit: number;
      amount: number;
    }>;
  }>({ summary: { revenue: 0, expense: 0, laba: 0 }, breakdown: [], mode: "summary", lines: [] });

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
      params.append("mode", mode);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("mode", mode);
    params.append("format", format);

    const url = `/api/report/laba-rugi/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  const fmt = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const revenues = report.breakdown.filter((i) => i.type === "REVENUE");
  const expenses = report.breakdown.filter((i) => i.type === "EXPENSE");
  const isProfit = report.summary.laba >= 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <BarChart3 className="text-violet-600" size={28} />
            Dashboard Keuangan
          </h1>
          <p className="page-subtitle">Ringkasan laporan laba rugi minimarket STEFI</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-5 animate-slide-up-2">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={13} className="text-violet-500" />
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input w-44"
            />
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar size={13} className="text-violet-500" />
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input w-44"
            />
          </div>
          <button onClick={fetchReport} className="btn btn-primary">
            <Search size={16} />
            Terapkan Filter
          </button>
          <div>
            <label className="form-label">Mode Laporan</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "summary" | "detailed")}
              className="form-input w-40"
            >
              <option value="summary">Ringkas</option>
              <option value="detailed">Detail + Keterangan</option>
            </select>
          </div>
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="btn btn-ghost"
          >
            <RefreshCw size={16} />
            Reset
          </button>
          <button onClick={() => exportReport("excel")} className="btn btn-ghost">
            <Download size={16} />
            Export Excel
          </button>
          <button onClick={() => exportReport("pdf")} className="btn btn-ghost">
            <Download size={16} />
            Export PDF
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
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-5 animate-slide-up-3">
            {/* Revenue */}
            <div className="stat-emerald rounded-2xl p-6 text-white hover:-translate-y-1 transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Pendapatan</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">
                    {fmt(report.summary.revenue)}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-emerald-100 text-xs">
                    <ArrowUpRight size={14} />
                    <span>Semua akun pendapatan</span>
                  </div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>

            {/* Expense */}
            <div className="stat-rose rounded-2xl p-6 text-white hover:-translate-y-1 transition-transform duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-rose-100 text-sm font-medium">Total Beban</p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">
                    {fmt(report.summary.expense)}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-rose-100 text-xs">
                    <ArrowDownRight size={14} />
                    <span>Semua akun beban</span>
                  </div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <TrendingDown size={22} />
                </div>
              </div>
            </div>

            {/* Laba/Rugi */}
            <div
              className={`rounded-2xl p-6 text-white hover:-translate-y-1 transition-transform duration-200 ${
                isProfit ? "stat-violet" : "stat-amber"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-sm font-medium">
                    {isProfit ? "Laba Bersih" : "Rugi Bersih"}
                  </p>
                  <h3 className="text-2xl font-bold mt-1.5 tracking-tight">
                    {fmt(report.summary.laba)}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-white/70 text-xs">
                    {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{isProfit ? "Pendapatan > Beban" : "Beban > Pendapatan"}</span>
                  </div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <DollarSign size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Margin Bar */}
          {report.summary.revenue > 0 && (
            <div className="card p-5 animate-slide-up-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-700">Margin Laba</span>
                <span
                  className={`text-sm font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {((report.summary.laba / report.summary.revenue) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${isProfit ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-rose-400 to-rose-600"}`}
                  style={{
                    width: `${Math.min(Math.abs((report.summary.laba / report.summary.revenue) * 100), 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Breakdown Tables */}
          <div className="grid md:grid-cols-2 gap-5 animate-slide-up-4">
            {/* Pendapatan */}
            <div className="card overflow-hidden">
              <div className="section-header bg-emerald-50/60">
                <h3 className="flex items-center gap-2 text-emerald-800">
                  <TrendingUp size={16} className="text-emerald-500" />
                  Rincian Pendapatan
                </h3>
                <span className="badge badge-emerald">{revenues.length} akun</span>
              </div>
              {revenues.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Akun</th>
                      <th className="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenues.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="badge badge-emerald mr-2">{r.code}</span>
                          {r.name}
                        </td>
                        <td className="text-right font-semibold text-emerald-600">{fmt(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="font-bold text-slate-700 border-t border-slate-200 pt-3">Total</td>
                      <td className="text-right font-bold text-emerald-700 border-t border-slate-200 pt-3">
                        {fmt(report.summary.revenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="empty-state">
                  <TrendingUp size={36} />
                  <p>Belum ada data pendapatan</p>
                </div>
              )}
            </div>

            {/* Beban */}
            <div className="card overflow-hidden">
              <div className="section-header bg-rose-50/60">
                <h3 className="flex items-center gap-2 text-rose-800">
                  <TrendingDown size={16} className="text-rose-500" />
                  Rincian Beban
                </h3>
                <span className="badge badge-rose">{expenses.length} akun</span>
              </div>
              {expenses.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Akun</th>
                      <th className="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <span className="badge badge-rose mr-2">{e.code}</span>
                          {e.name}
                        </td>
                        <td className="text-right font-semibold text-rose-600">{fmt(e.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="font-bold text-slate-700 border-t border-slate-200 pt-3">Total</td>
                      <td className="text-right font-bold text-rose-700 border-t border-slate-200 pt-3">
                        {fmt(report.summary.expense)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="empty-state">
                  <TrendingDown size={36} />
                  <p>Belum ada data beban</p>
                </div>
              )}
            </div>
          </div>

          {mode === "detailed" && (
            <div className="card overflow-hidden animate-slide-up-4">
              <div className="section-header bg-slate-50">
                <h3>Detail Transaksi Laba/Rugi (dengan keterangan)</h3>
                <span className="badge badge-slate">{report.lines.length} baris</span>
              </div>
              {report.lines.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Keterangan</th>
                      <th>Akun</th>
                      <th>Tipe</th>
                      <th className="text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((line, i) => (
                      <tr key={`${line.date}-${line.accountCode}-${i}`}>
                        <td>{line.date.slice(0, 10)}</td>
                        <td>{line.description}</td>
                        <td>{line.accountCode} - {line.accountName}</td>
                        <td>{line.type === "REVENUE" ? "Pendapatan" : "Beban"}</td>
                        <td className={`text-right font-semibold ${line.type === "REVENUE" ? "text-emerald-600" : "text-rose-600"}`}>
                          {fmt(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>Tidak ada detail transaksi pada periode ini.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
