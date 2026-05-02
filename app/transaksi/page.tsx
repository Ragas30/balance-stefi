"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react";

type Account = { id: string; code: string; name: string };
type JournalDetail = { accountId: string; debit: number; credit: number };

export default function TransaksiPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<JournalDetail[]>([
    { accountId: "", debit: 0, credit: 0 },
    { accountId: "", debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      setAccounts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleDetailChange = (index: number, field: keyof JournalDetail, value: any) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setDetails(newDetails);
  };

  const addRow = () => setDetails([...details, { accountId: "", debit: 0, credit: 0 }]);
  const removeRow = (index: number) => setDetails(details.filter((_, i) => i !== index));

  const totalDebit = details.reduce((acc, curr) => acc + Number(curr.debit), 0);
  const totalCredit = details.reduce((acc, curr) => acc + Number(curr.credit), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return alert("Jurnal tidak seimbang!");

    try {
      const formattedDetails = details
        .filter(d => d.accountId && (d.debit > 0 || d.credit > 0))
        .map(d => ({ accountId: d.accountId, debit: Number(d.debit), credit: Number(d.credit) }));

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, description, details: formattedDetails }),
      });

      if (res.ok) {
        alert("Jurnal tersimpan!");
        setDetails([{ accountId: "", debit: 0, credit: 0 }, { accountId: "", debit: 0, credit: 0 }]);
        setDescription("");
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan jurnal");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">Jurnal Transaksi</h1>
      
      <div className="border rounded-xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Entri Jurnal Umum</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">Tanggal Transaksi</label>
              <input 
                type="date" required 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={date} onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">Deskripsi / Keterangan</label>
              <input 
                type="text" required placeholder="Ex: Pembayaran sewa toko bulan ini"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={description} onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 px-2 text-slate-600 font-medium">Akun</th>
                  <th className="py-2 px-2 text-slate-600 font-medium w-48">Debit (Rp)</th>
                  <th className="py-2 px-2 text-slate-600 font-medium w-48">Kredit (Rp)</th>
                  <th className="py-2 px-2 text-slate-600 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-2">
                      <select required
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        value={row.accountId}
                        onChange={e => handleDetailChange(i, "accountId", e.target.value)}
                      >
                        <option value="" disabled>Pilih Akun...</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input type="number" min="0" step="0.01"
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        value={row.debit || ""}
                        onChange={e => handleDetailChange(i, "debit", parseFloat(e.target.value) || 0)}
                        readOnly={row.credit > 0} 
                        disabled={row.credit > 0}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input type="number" min="0" step="0.01"
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        value={row.credit || ""}
                        onChange={e => handleDetailChange(i, "credit", parseFloat(e.target.value) || 0)}
                        readOnly={row.debit > 0}
                        disabled={row.debit > 0}
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button type="button" onClick={() => removeRow(i)} className="text-rose-500 hover:text-rose-700 p-2 rounded hover:bg-rose-50 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="py-3 px-2 text-right text-slate-700">Total:</td>
                  <td className={`py-3 px-2 ${totalDebit === totalCredit ? "text-slate-800" : "text-rose-600"}`}>
                    Rp {totalDebit.toLocaleString("id-ID")}
                  </td>
                  <td className={`py-3 px-2 ${totalDebit === totalCredit ? "text-slate-800" : "text-rose-600"}`}>
                    Rp {totalCredit.toLocaleString("id-ID")}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <button type="button" onClick={addRow} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors font-medium">
              <Plus size={18} /> Tambah Baris
            </button>
            
            <button type="submit" disabled={!isBalanced} className={`flex items-center gap-2 p-2 px-6 rounded-lg font-medium transition-colors ${isBalanced ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              <Save size={18} /> Simpan Jurnal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
