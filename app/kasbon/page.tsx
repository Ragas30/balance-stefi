"use client";

import { useState, useEffect } from "react";
import {
  UserRound,
  Store,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Banknote,
  AlertTriangle,
} from "lucide-react";

type Kasbon = {
  id: string;
  name?: string;
  customer?: string;
  total: number;
  paid: number;
  status: "LUNAS" | "BELUM_LUNAS";
};

export default function KasbonPage() {
  const [activeTab, setActiveTab] = useState<"PIUTANG" | "UTANG">("PIUTANG");
  const [piutangData, setPiutangData] = useState<Kasbon[]>([]);
  const [utangData, setUtangData] = useState<Kasbon[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetchKasbon(); }, []);

  const fetchKasbon = async () => {
    try {
      const res = await fetch("/api/kasbon");
      const data = await res.json();
      if (res.ok) {
        setPiutangData(data.piutang.map((i: any) => ({ ...i, name: i.customer })));
        setUtangData(data.utang);
      }
    } catch (e) { console.error(e); }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(formTotal);
    if (!total || total <= 0 || !formName) return;

    setLoading(true);
    try {
      const res = await fetch("/api/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, name: formName, total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
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

  const currentData = (activeTab === "PIUTANG" ? piutangData : utangData).filter((d) =>
    (d.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPiutang = piutangData.reduce((a, c) => a + (Number(c.total) - Number(c.paid)), 0);
  const totalUtang = utangData.reduce((a, c) => a + (Number(c.total) - Number(c.paid)), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-up">
          <CheckCircle2 size={18} />
          <span className="font-semibold">Kasbon berhasil dicatat!</span>
        </div>
      )}

      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <UserRound className="text-amber-500" size={28} />
            Manajemen Kasbon
          </h1>
          <p className="page-subtitle">Kelola piutang pelanggan dan utang supplier</p>
        </div>
        <button
          onClick={() => setIsGenerating(true)}
          className={`btn shrink-0 ${activeTab === "PIUTANG" ? "btn-primary" : "btn-rose"}`}
        >
          <Plus size={17} />
          {activeTab === "PIUTANG" ? "Catat Piutang" : "Catat Utang"}
        </button>
      </div>

      {/* Modal */}
      {isGenerating && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {activeTab === "PIUTANG" ? (
                  <UserRound size={20} className="text-indigo-500" />
                ) : (
                  <Store size={20} className="text-amber-500" />
                )}
                Catat {activeTab === "PIUTANG" ? "Piutang Baru" : "Utang Baru"}
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
                <label className="form-label">
                  {activeTab === "PIUTANG" ? "Nama Pelanggan / Karyawan" : "Nama Supplier / Toko"}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Jumlah (Rp)</label>
                <input
                  type="number"
                  min="1"
                  value={formTotal}
                  onChange={(e) => setFormTotal(e.target.value)}
                  placeholder="Contoh: 500000"
                  className="form-input text-lg"
                  required
                />
              </div>

              <div
                className={`text-sm p-4 rounded-xl flex items-start gap-3 ${
                  activeTab === "PIUTANG"
                    ? "bg-indigo-50 border border-indigo-100 text-indigo-700"
                    : "bg-amber-50 border border-amber-100 text-amber-700"
                }`}
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                  {activeTab === "PIUTANG"
                    ? "Sistem akan mencatat Piutang (Debit) dan Pendapatan (Kredit) di jurnal."
                    : "Sistem akan mencatat Persediaan (Debit) dan Hutang (Kredit) di jurnal."}
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIsGenerating(false)} className="btn btn-ghost flex-1 justify-center">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!formName || !formTotal || loading}
                  className={`btn flex-1 justify-center ${activeTab === "PIUTANG" ? "btn-primary" : "btn-rose"}`}
                >
                  {loading ? <Loader2 className="animate-spin" size={17} /> : <Banknote size={17} />}
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Cards */}
      <div className="grid sm:grid-cols-2 gap-4 animate-slide-up-2">
        {/* Piutang */}
        <div
          onClick={() => setActiveTab("PIUTANG")}
          className={`card p-6 cursor-pointer transition-all duration-200 ${
            activeTab === "PIUTANG"
              ? "ring-2 ring-indigo-500 border-indigo-200"
              : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                activeTab === "PIUTANG" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              <UserRound size={28} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Piutang Pelanggan
              </p>
              <h3 className="text-xl font-bold text-slate-800">{fmt(totalPiutang)}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {piutangData.filter((d) => d.status === "BELUM_LUNAS").length} tagihan belum lunas
              </p>
            </div>
            {activeTab === "PIUTANG" && (
              <div className="w-2 h-10 bg-indigo-500 rounded-full" />
            )}
          </div>
        </div>

        {/* Utang */}
        <div
          onClick={() => setActiveTab("UTANG")}
          className={`card p-6 cursor-pointer transition-all duration-200 ${
            activeTab === "UTANG"
              ? "ring-2 ring-amber-400 border-amber-200"
              : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                activeTab === "UTANG" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              <Store size={28} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Utang Supplier
              </p>
              <h3 className="text-xl font-bold text-slate-800">{fmt(totalUtang)}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {utangData.filter((d) => d.status === "BELUM_LUNAS").length} kewajiban belum lunas
              </p>
            </div>
            {activeTab === "UTANG" && (
              <div className="w-2 h-10 bg-amber-400 rounded-full" />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-slide-up-3">
        <div className="section-header">
          <h3>
            {activeTab === "PIUTANG" ? "Daftar Piutang" : "Daftar Utang"}
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari nama..."
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
                <th>{activeTab === "PIUTANG" ? "Nama Pelanggan" : "Nama Supplier"}</th>
                <th className="text-right">Total Tagihan</th>
                <th className="text-right">Sudah Dibayar</th>
                <th className="text-right">Sisa</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item) => {
                const sisa = Number(item.total) - Number(item.paid);
                return (
                  <tr key={item.id}>
                    <td className="font-medium text-slate-800">{item.name}</td>
                    <td className="text-right text-slate-600">{fmt(Number(item.total))}</td>
                    <td className="text-right text-emerald-600 font-medium">{fmt(Number(item.paid))}</td>
                    <td className="text-right">
                      <span className={`font-bold ${sisa > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {fmt(sisa)}
                      </span>
                    </td>
                    <td className="text-center">
                      {item.status === "LUNAS" ? (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> Lunas
                        </span>
                      ) : (
                        <span className="badge badge-amber">
                          <Clock size={12} /> Belum Lunas
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {currentData.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <UserRound size={36} />
                      <p>{search ? "Data tidak ditemukan" : "Belum ada data kasbon"}</p>
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
