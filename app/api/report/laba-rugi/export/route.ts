import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ReportMode = "summary" | "detailed";
type ExportFormat = "excel" | "pdf";

type ReportRow = {
  date: string;
  description: string;
  account: string;
  type: "Pendapatan" | "Beban";
  debit: number;
  credit: number;
  amount: number;
};

function parseDateRange(startDate?: string | null, endDate?: string | null) {
  let transactionFilter: { gte?: Date; lte?: Date } | undefined;
  if (startDate || endDate) {
    transactionFilter = {};
    if (startDate) transactionFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      transactionFilter.lte = end;
    }
  }
  return transactionFilter;
}

function getReportTitle(startDate?: string | null, endDate?: string | null) {
  if (startDate || endDate) {
    return `Laporan Laba Rugi (${startDate ?? "-"} s/d ${endDate ?? "-"})`;
  }
  return "Laporan Laba Rugi (Semua Periode)";
}

function escapeCsv(value: string | number) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: ReportRow[], title: string, summary: { revenue: number; expense: number; laba: number }) {
  const header = ["Date", "Description", "Account", "Type", "Debit", "Credit", "Amount"];
  const lines = [
    title,
    "",
    `Total Pendapatan,${summary.revenue}`,
    `Total Beban,${summary.expense}`,
    `Laba/Rugi,${summary.laba}`,
    "",
    header.join(","),
    ...rows.map((r) => [
      r.date,
      r.description,
      r.account,
      r.type,
      r.debit,
      r.credit,
      r.amount,
    ].map(escapeCsv).join(",")),
  ];

  return lines.join("\n");
}

function createSimplePdf(textLines: string[]) {
  const safeLines = textLines.map((l) => l.replace(/[()\\]/g, (m) => `\\${m}`));

  const content = ["BT", "/F1 10 Tf", "50 790 Td", ...safeLines.flatMap((line, i) => {
    if (i === 0) return [`(${line}) Tj`];
    return ["0 -14 Td", `(${line}) Tj`];
  }), "ET"].join("\n");

  const objects: string[] = [];
  const offsets: number[] = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  objects.push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  let body = "%PDF-1.4\n";
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const o of offsets) {
    body += `${String(o).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, "binary");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const mode = (searchParams.get("mode") ?? "summary") as ReportMode;
    const format = (searchParams.get("format") ?? "excel") as ExportFormat;

    if (!["summary", "detailed"].includes(mode)) {
      return NextResponse.json({ error: "Mode laporan tidak valid." }, { status: 400 });
    }

    if (!["excel", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Format export tidak valid." }, { status: 400 });
    }

    const transactionFilter = parseDateRange(startDate, endDate);

    const details = await prisma.transactionDetail.findMany({
      where: {
        transaction: transactionFilter ? { date: transactionFilter } : undefined,
        account: { type: { in: ["REVENUE", "EXPENSE"] } },
      },
      include: {
        account: true,
        transaction: true,
      },
      orderBy: [{ transaction: { date: "asc" } }, { account: { code: "asc" } }],
    });

    let revenue = 0;
    let expense = 0;

    const rows: ReportRow[] = details
      .map((d) => {
        const debit = Number(d.debit);
        const credit = Number(d.credit);
        const amount = d.account.type === "REVENUE" ? credit - debit : debit - credit;

        if (d.account.type === "REVENUE") revenue += amount;
        else expense += amount;

        return {
          date: d.transaction.date.toISOString().slice(0, 10),
          description: d.transaction.description,
          account: `${d.account.code} - ${d.account.name}`,
          type: d.account.type === "REVENUE" ? "Pendapatan" : "Beban",
          debit,
          credit,
          amount,
        };
      })
      .filter((row) => mode === "detailed" || row.amount !== 0);

    const summary = { revenue, expense, laba: revenue - expense };
    const title = getReportTitle(startDate, endDate);

    if (format === "excel") {
      const csv = toCsv(rows, title, summary);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=laporan-laba-rugi-${Date.now()}.csv`,
        },
      });
    }

    const lines = [
      title,
      "",
      `Total Pendapatan: Rp ${summary.revenue.toLocaleString("id-ID")}`,
      `Total Beban: Rp ${summary.expense.toLocaleString("id-ID")}`,
      `Laba/Rugi Bersih: Rp ${summary.laba.toLocaleString("id-ID")}`,
      "",
      "Date | Description | Account | Type | Amount",
      ...rows.slice(0, 40).map((r) => `${r.date} | ${r.description} | ${r.account} | ${r.type} | ${r.amount.toLocaleString("id-ID")}`),
    ];

    if (rows.length > 40) {
      lines.push(`... (${rows.length - 40} baris lainnya dipotong untuk 1 halaman PDF)`);
    }

    const pdf = createSimplePdf(lines);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=laporan-laba-rugi-${Date.now()}.pdf`,
      },
    });
  } catch (error: any) {
    console.error("API Error [Export Laba Rugi GET]:", error);
    return NextResponse.json({ error: error?.message || "Gagal export laporan." }, { status: 500 });
  }
}
