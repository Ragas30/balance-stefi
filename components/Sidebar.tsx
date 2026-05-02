import Link from "next/link";
import { Book, LayoutDashboard, Receipt, UserRound, ArrowLeftRight } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 min-h-screen text-slate-300 p-4">
      <div className="mb-8 font-bold text-white text-xl">SMK FinSystem</div>
      <nav className="space-y-2">
        <Link href="/dashboard" className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 hover:text-white pb-2 pt-2">
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link href="/dashboard/coa" className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 hover:text-white pb-2 pt-2">
          <Book size={20} />
          Buku Besar / COA
        </Link>
        <Link href="/transaksi" className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 hover:text-white pb-2 pt-2">
          <ArrowLeftRight size={20} />
          Jurnal Transaksi
        </Link>
        <Link href="/penjualan" className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 hover:text-white pb-2 pt-2">
          <Receipt size={20} />
          Penjualan
        </Link>
        <Link href="/voucher" className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 hover:text-white pb-2 pt-2">
          <Receipt size={20} />
          Voucher
        </Link>
        <Link href="/kasbon" className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 hover:text-white pb-2 pt-2">
          <UserRound size={20} />
          Kasbon (Piutang/Utang)
        </Link>
      </nav>
    </aside>
  );
}
