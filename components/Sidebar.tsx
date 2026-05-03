"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ShoppingCart,
  Ticket,
  Users,
  Book,
  Menu,
  X,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const menus = [
  { href: "/dashboard",      label: "Dashboard",         icon: LayoutDashboard, color: "text-violet-400", bg: "bg-violet-500/10" },
  { href: "/dashboard/coa",  label: "Buku Besar / COA",  icon: Book,            color: "text-sky-400",    bg: "bg-sky-500/10"    },
  { href: "/transaksi",      label: "Jurnal Transaksi",  icon: ArrowLeftRight,  color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { href: "/penjualan",      label: "Penjualan",         icon: ShoppingCart,    color: "text-emerald-400",bg: "bg-emerald-500/10"},
  { href: "/voucher",        label: "Voucher",           icon: Ticket,          color: "text-rose-400",   bg: "bg-rose-500/10"   },
  { href: "/kasbon",         label: "Kasbon",            icon: Users,           color: "text-amber-400",  bg: "bg-amber-500/10"  },
];

type MenuType = typeof menus[0];

function NavItem({
  menu,
  active,
  onClick,
}: {
  menu: MenuType;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = menu.icon;
  return (
    <Link
      href={menu.href}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
        active
          ? "bg-white/12 text-white"
          : "text-slate-400 hover:text-white hover:bg-white/8"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r-full" />
      )}
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
          active
            ? menu.bg + " " + menu.color
            : "bg-white/5 text-slate-500 group-hover:text-slate-300"
        }`}
      >
        <Icon size={16} />
      </span>
      <span className="flex-1">{menu.label}</span>
      {active && <ChevronRight size={14} className="text-white/40" />}
    </Link>
  );
}

function SidebarContent({
  isActive,
  onNavClick,
}: {
  isActive: (href: string) => boolean;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 leading-none">Finance Suite</p>
          <p className="text-lg font-bold text-white leading-tight">STEFI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-0.5 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-3 font-semibold">Menu Utama</p>
        {menus.map((menu) => (
          <NavItem
            key={menu.href}
            menu={menu}
            active={isActive(menu.href)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Bottom Card */}
      <div className="mt-6 rounded-xl p-4 bg-gradient-to-br from-violet-600/20 to-indigo-800/20 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={13} className="text-violet-400" />
          <span className="text-xs font-semibold text-violet-300">Tip Akuntansi</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pastikan setiap transaksi selalu mencatat jurnal agar laporan laba rugi akurat.
        </p>
      </div>

      <p className="text-center text-[11px] text-slate-700 mt-4">v1.0.0 · STEFI Finance</p>
    </div>
  );
}

const sidebarStyle = { background: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)" };

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard");
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Topbar */}
      <div className="sticky top-0 z-30 md:hidden" style={sidebarStyle}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <TrendingUp size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 leading-none">Finance Suite</p>
              <p className="text-sm font-bold text-white leading-tight">STEFI</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setIsOpen((o) => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(15,12,41,0.65)", backdropFilter: "blur(4px)" }}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] p-4 shadow-2xl transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={sidebarStyle}
      >
        <SidebarContent isActive={isActive} onNavClick={() => setIsOpen(false)} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-[260px] min-h-screen p-4 shrink-0"
        style={sidebarStyle}
      >
        <SidebarContent isActive={isActive} />
      </aside>
    </>
  );
}
