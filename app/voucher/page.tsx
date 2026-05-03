"use client";

import { useState, useEffect } from "react";
import {
  Ticket,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Wallet,
} from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    try {
      const res = await fetch("/api/voucher");
      const data = await res.json();
      if (res.ok) setVouchers(data);
    } catch (e) { console.error(e); }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

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
        body: JSON.stringify({ code, value: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setNewVoucherValue("");
      setIsGenerating(false);
      fetchVouchers();
    } catch (error: any) {
      alert(error.message || "Gagal menerbitkan voucher");
    } finally {
      setLoading(false);
    }
  };

  const filtered = vouchers.filter((v) =>
    v.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeVouchers = vouchers.filter((v) => v.status === "ACTIVE");
  const totalBalance = vouchers.reduce((a, v) => a + Number(v.balance), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-up">
          <CheckCircle2 size={18} />
          <span className="font-semibold">Voucher berhasil diterbitkan!</span>
        </div>
      )}

      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <Ticket className="text-rose-500" size={28} />
            Manajemen Voucher
          </h1>
          <p className="page-subtitle">Kelola penerbitan dan pemantauan voucher belanja</p>
        </div>
        <button onClick={() => setIsGenerating(true)} className="btn btn-rose shrink-0">
          <Plus size={17} /> Terbitkan Voucher
        </button>
      </div>

      {/* Modal */}
      {isGenerating && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles size={20} className="text-rose-500" />
                Terbitkan Voucher Baru
              </h2>
              <button
                onClick={() => setIsGenerating(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="form-label">Nominal Voucher (Rp)</label>
                <input
                  type="number"
                  min="1"
                  value={newVoucherValue}
                  onChange={(e) => setNewVoucherValue(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="form-input text-lg"
                  required
                />
              </div>

              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm p-4 rounded-xl flex items-start gap-3">
                <Ticket size={17} className="shrink-0 mt-0.5 text-rose-400" />
                <p>Kode voucher unik akan dibuat otomatis. Sistem akan mencatat utang voucher ke jurnal akuntansi.</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsGenerating(false)}
                  className="btn btn-ghost flex-1 justify-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newVoucherValue || loading}
                  className="btn btn-rose flex-1 justify-center"
                >
                  {loading ? <Loader2 className="animate-spin" size={17} /> : <Ticket size={17} />}
                  {loading ? "Memproses..." : "Terbitkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 animate-slide-up-2">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Ticket size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Voucher</p>
            <p className="text-2xl font-bold text-slate-800">{vouchers.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Voucher Aktif</p>
            <p className="text-2xl font-bold text-emerald-700">{activeVouchers.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Saldo</p>
            <p className="text-lg font-bold text-rose-600">{fmt(totalBalance)}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-slide-up-3">
        <div className="section-header">
          <h3>Daftar Voucher</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 w-52 text-sm py-2"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode Voucher</th>
                <th className="text-right">Nominal Asli</th>
                <th className="text-right">Sisa Saldo</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                      <Ticket size={14} className="text-rose-400" />
                      {v.code}
                    </span>
                  </td>
                  <td className="text-right text-slate-600">{fmt(Number(v.value))}</td>
                  <td className="text-right font-semibold text-slate-800">{fmt(Number(v.balance))}</td>
                  <td className="text-center">
                    {v.status === "ACTIVE" ? (
                      <span className="badge badge-emerald">
                        <CheckCircle2 size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="badge badge-slate">
                        <XCircle size={12} /> Terpakai
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <Ticket size={36} />
                      <p>{search ? "Voucher tidak ditemukan" : "Belum ada data voucher"}</p>
                    </div>
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
