"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export default function COAPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ code: "", name: "", type: "ASSET" });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ code: "", name: "", type: "ASSET" });
        fetchAccounts();
      } else {
        const errorData = await res.json();
        alert(errorData.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error adding account");
    }
  };

  const typeColors: Record<string, string> = {
    ASSET: "bg-emerald-100 text-emerald-800",
    LIABILITY: "bg-rose-100 text-rose-800",
    EQUITY: "bg-indigo-100 text-indigo-800",
    REVENUE: "bg-blue-100 text-blue-800",
    EXPENSE: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">Chart of Accounts (COA)</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border rounded-xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Tambah Akun</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">Kode Akun</label>
              <input 
                type="text" 
                required
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="Ex: 1-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">Nama Akun</label>
              <input 
                type="text" 
                required
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Kas Utama"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-600">Tipe</label>
              <select 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="ASSET">Asset (Harta)</option>
                <option value="LIABILITY">Liability (Kewajiban/Hutang)</option>
                <option value="EQUITY">Equity (Modal)</option>
                <option value="REVENUE">Revenue (Pendapatan)</option>
                <option value="EXPENSE">Expense (Beban)</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2">
              <Plus size={18} /> Simpan Akun
            </button>
          </form>
        </div>

        <div className="md:col-span-2 border rounded-xl p-6 bg-white shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Daftar Akun</h2>
          {loading ? (
            <div className="text-slate-500">Memuat data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 px-4 text-slate-600 font-medium">Kode</th>
                    <th className="py-2 px-4 text-slate-600 font-medium">Nama Akun</th>
                    <th className="py-2 px-4 text-slate-600 font-medium">Tipe</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 font-medium text-slate-700">{acc.code}</td>
                      <td className="py-2 px-4 text-slate-600">{acc.name}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[acc.type]}`}>
                          {acc.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-500">Belum ada data akun</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
