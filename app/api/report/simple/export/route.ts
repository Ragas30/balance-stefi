import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/utils";

type ExportFormat = "excel" | "pdf";
type ReportMode = "summary" | "detailed";

type Row = {
  date: string;
  description: string;
  category: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  source: "MANUAL" | "IMPORT" | "KASBON";
  kasbonRef: string;
};

function escapeCsv(value: string | number) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function createSimplePdf(textLines: string[]) {
  const safeLines = textLines.map((l) => l.replace(/[()\\]/g, (m) => `\\${m}`));
  const content = ["BT", "/F1 10 Tf", "50 790 Td", ...safeLines.flatMap((line, i) => (i === 0 ? [`(${line}) Tj`] : ["0 -14 Td", `(${line}) Tj`])), "ET"].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
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

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const list = await prisma.cashTransaction.findMany({
      where: Object.keys(dateFilter).length ? { date: dateFilter } : undefined,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    let income = 0;
    let expense = 0;

    const rows: Row[] = list.map((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === "INCOME") income += amount;
      if (tx.type === "EXPENSE") expense += amount;

      return {
        date: tx.date.toISOString().slice(0, 10),
        description: tx.description,
        category: tx.category,
        type: tx.type,
        amount,
        source: tx.source,
        kasbonRef: tx.kasbonRef ?? "",
      };
    });

    if (format === "excel") {
      const lines = [
        "Laporan Pemasukan/Pengeluaran",
        `Total Pemasukan,${income}`,
        `Total Pengeluaran,${expense}`,
        `Laba/Rugi,${income - expense}`,
        "",
        "Date,Description,Category,Type,Amount,Source,KasbonRef",
        ...((mode === "detailed" ? rows : []).map((row) =>
          [row.date, row.description, row.category, row.type, row.amount, row.source, row.kasbonRef].map(escapeCsv).join(",")
        )),
      ];

      return new NextResponse("\uFEFF" + lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=laporan-simple-${Date.now()}.csv`,
        },
      });
    }

    const textLines = [
      "Laporan Pemasukan/Pengeluaran",
      `Total Pemasukan: Rp ${income.toLocaleString("id-ID")}`,
      `Total Pengeluaran: Rp ${expense.toLocaleString("id-ID")}`,
      `Laba/Rugi: Rp ${(income - expense).toLocaleString("id-ID")}`,
      "",
      ...(mode === "detailed"
        ? rows.slice(0, 40).map((row) => `${row.date} | ${row.description} | ${row.category} | ${row.type} | ${row.amount.toLocaleString("id-ID")}`)
        : []),
    ];

    return new NextResponse(createSimplePdf(textLines), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=laporan-simple-${Date.now()}.pdf`,
      },
    });
  } catch (error: unknown) {
    console.error("API Error [Simple Report Export GET]:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Gagal export laporan simple.") }, { status: 500 });
  }
}
