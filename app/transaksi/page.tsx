"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ArrowLeftRight, AlertCircle, CheckCircle } from "lucide-react";
import Toast from "@/components/Toast";

type Account = { id: string; code: string; name: string; type: string };
type JournalDetail = { accountId: string; debit: number; credit: number };

export default function TransaksiPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<JournalDetail[]>([
    { accountId: "", debit: 0, credit: 0 },
    { accountId: "", debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then(async (r) => {
        if (!r.ok) throw new Error("Gagal memuat data akun");
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(console.error);
  }, []);

  const handleDetailChange = (index: number, field: keyof JournalDetail, value: string | number) => {
    const nd = [...details];
    nd[index] = { ...nd[index], [field]: value };
    setDetails(nd);
  };

  const addRow = () => setDetails([...details, { accountId: "", debit: 0, credit: 0 }]);
  const removeRow = (index: number) => {
    if (details.length <= 2) return;
    setDetails(details.filter((_, i) => i !== index));
  };

  const totalDebit = details.reduce((a, c) => a + Number(c.debit), 0);
  const totalCredit = details.reduce((a, c) => a + Number(c.credit), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return setError("Jurnal tidak seimbang! Debit harus sama dengan Kredit.");

    setSaving(true);
    try {
      const formattedDetails = details
        .filter((d) => d.accountId && (d.debit > 0 || d.credit > 0))
        .map((d) => ({ accountId: d.accountId, debit: Number(d.debit), credit: Number(d.credit) }));

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description, details: formattedDetails }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        setDetails([{ accountId: "", debit: 0, credit: 0 }, { accountId: "", debit: 0, credit: 0 }]);
        setDescription("");
      } else {
        const err = await res.json();
        setError(err.error || "Gagal menyimpan jurnal");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Toast show={success} message="Jurnal berhasil disimpan!" onClose={() => setSuccess(false)} />
      <Toast show={!!error} message={error} type="error" onClose={() => setError("")} />

      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="page-title flex items-center gap-2.5">
          <ArrowLeftRight className="text-indigo-600" size={28} />
          Jurnal Transaksi
        </h1>
        <p className="page-subtitle">Entri jurnal umum double-entry accounting</p>
      </div>

      {/* Balance indicator */}
      <div
        className={`animate-slide-up-2 flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
          totalDebit === 0
            ? "bg-slate-50 border-slate-200 text-slate-500"
            : isBalanced
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}
      >
        {totalDebit === 0 ? (
          <AlertCircle size={16} className="text-slate-400" />
        ) : isBalanced ? (
          <CheckCircle size={16} className="text-emerald-500" />
        ) : (
          <AlertCircle size={16} className="text-rose-500" />
        )}
        {totalDebit === 0
          ? "Isi detail jurnal di bawah. Debit harus sama dengan Kredit."
          : isBalanced
          ? `Jurnal seimbang — ${fmt(totalDebit)}`
          : `Tidak seimbang: Debit ${fmt(totalDebit)}, Kredit ${fmt(totalCredit)} (selisih ${fmt(Math.abs(totalDebit - totalCredit))})`}
      </div>

      {/* Form */}
      <div className="card p-6 animate-slide-up-3">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Deskripsi / Keterangan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Pembayaran sewa toko"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Journal Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700 text-sm">Detail Jurnal</h3>
              <button type="button" onClick={addRow} className="btn btn-ghost text-sm py-1.5 px-3 text-indigo-600">
                <Plus size={15} /> Tambah Baris
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8 text-center">#</th>
                    <th>Akun</th>
                    <th className="w-44 text-right">Debit (Rp)</th>
                    <th className="w-44 text-right">Kredit (Rp)</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, i) => (
                    <tr key={i}>
                      <td className="text-center text-slate-400 text-xs font-mono">{i + 1}</td>
                      <td>
                        <select
                          required
                          value={row.accountId}
                          onChange={(e) => handleDetailChange(i, "accountId", e.target.value)}
                          className="form-input text-sm"
                        >
                          <option value="" disabled>Pilih Akun...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} — {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.debit || ""}
                          onChange={(e) => handleDetailChange(i, "debit", parseFloat(e.target.value) || 0)}
                          disabled={row.credit > 0}
                          className="form-input text-sm text-right disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.credit || ""}
                          onChange={(e) => handleDetailChange(i, "credit", parseFloat(e.target.value) || 0)}
                          disabled={row.debit > 0}
                          className="form-input text-sm text-right disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          disabled={details.length <= 2}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="py-3 px-4 text-right text-sm font-bold text-slate-700">
                      Total
                    </td>
                    <td className={`py-3 px-4 text-right font-bold text-sm ${!isBalanced && totalDebit > 0 ? "text-rose-600" : "text-slate-800"}`}>
                      {fmt(totalDebit)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold text-sm ${!isBalanced && totalCredit > 0 ? "text-rose-600" : "text-slate-800"}`}>
                      {fmt(totalCredit)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!isBalanced || saving}
              className={`btn ${isBalanced ? "btn-primary" : "btn-ghost"} px-8 py-3`}
            >
              {saving ? <div className="spinner" /> : <Save size={18} />}
              {saving ? "Menyimpan..." : "Simpan Jurnal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
