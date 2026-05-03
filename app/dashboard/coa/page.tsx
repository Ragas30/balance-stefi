"use client";

import { useState, useEffect } from "react";
import { Plus, Book, CheckCircle, Search } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  ASSET:     { label: "Aset (Harta)",         badge: "badge-emerald" },
  LIABILITY: { label: "Kewajiban (Hutang)",   badge: "badge-rose" },
  EQUITY:    { label: "Modal (Ekuitas)",      badge: "badge-violet" },
  REVENUE:   { label: "Pendapatan",           badge: "badge-slate" },
  EXPENSE:   { label: "Beban",                badge: "badge-amber" },
};

export default function COAPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ code: "", name: "", type: "ASSET" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      setAccounts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ code: "", name: "", type: "ASSET" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchAccounts();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-up">
          <CheckCircle size={18} />
          <span className="font-semibold">Akun berhasil ditambahkan!</span>
        </div>
      )}

      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="page-title flex items-center gap-2.5">
          <Book className="text-sky-600" size={28} />
          Chart of Accounts (COA)
        </h1>
        <p className="page-subtitle">Kelola daftar akun untuk pencatatan jurnal akuntansi</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="animate-slide-up-2">
          <div className="card p-6 sticky top-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-5">
              <Plus size={18} className="text-sky-500" />
              Tambah Akun Baru
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Kode Akun</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: 1-100"
                  className="form-input font-mono"
                />
              </div>
              <div>
                <label className="form-label">Nama Akun</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Kas Utama"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Tipe Akun</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="form-input"
                >
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              {/* Preview badge */}
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
                <span className="text-xs text-slate-400">Preview:</span>
                <span className="font-mono text-sm font-semibold text-slate-700">
                  {formData.code || "—"}
                </span>
                <span className="text-sm text-slate-600 flex-1 truncate">
                  {formData.name || "—"}
                </span>
                <span className={`badge ${TYPE_CONFIG[formData.type]?.badge}`}>
                  {formData.type}
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary w-full justify-center py-3"
              >
                {saving ? <div className="spinner" /> : <Plus size={17} />}
                {saving ? "Menyimpan..." : "Tambah Akun"}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 animate-slide-up-3">
          <div className="card overflow-hidden">
            <div className="section-header">
              <h3 className="flex items-center gap-2">
                Daftar Akun
                <span className="badge badge-slate">{accounts.length}</span>
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Cari akun..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-9 w-52 text-sm py-2"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                <span className="text-sm">Memuat data...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-28">Kode</th>
                      <th>Nama Akun</th>
                      <th className="w-36 text-center">Tipe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((acc) => (
                      <tr key={acc.id}>
                        <td>
                          <span className="font-mono font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md text-xs">
                            {acc.code}
                          </span>
                        </td>
                        <td className="font-medium text-slate-800">{acc.name}</td>
                        <td className="text-center">
                          <span className={`badge ${TYPE_CONFIG[acc.type]?.badge ?? "badge-slate"}`}>
                            {acc.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <div className="empty-state">
                            <Book size={36} />
                            <p>{search ? "Akun tidak ditemukan" : "Belum ada akun. Tambahkan di form kiri."}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
