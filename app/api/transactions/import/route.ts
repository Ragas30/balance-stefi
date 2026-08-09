import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getErrorMessage } from "@/lib/utils";

const rowSchema = z.object({
  date: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  source: z.enum(["MANUAL", "IMPORT", "KASBON"]).optional(),
  kasbonType: z.enum(["RECEIVABLE", "PAYABLE"]).optional(),
  kasbonRef: z.string().optional(),
});

type ImportResult = {
  inserted: number;
  failed: number;
  errors: Array<{ line: number; message: string }>;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File wajib diupload pada field 'file'." }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "File kosong atau tidak memiliki data." }, { status: 400 });
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = {
      date: headers.indexOf("date"),
      type: headers.indexOf("type"),
      category: headers.indexOf("category"),
      amount: headers.indexOf("amount"),
      description: headers.indexOf("description"),
      source: headers.indexOf("source"),
      kasbonType: headers.indexOf("kasbontype"),
      kasbonRef: headers.indexOf("kasbonref"),
    };

    if (idx.date < 0 || idx.type < 0 || idx.category < 0 || idx.amount < 0 || idx.description < 0) {
      return NextResponse.json({ error: "Header wajib: date,type,category,amount,description" }, { status: 400 });
    }

    const result: ImportResult = { inserted: 0, failed: 0, errors: [] };

    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      try {
        const parsed = rowSchema.parse({
          date: cells[idx.date],
          type: cells[idx.type],
          category: cells[idx.category],
          amount: Number(cells[idx.amount]),
          description: cells[idx.description],
          source: idx.source >= 0 ? cells[idx.source] : "IMPORT",
          kasbonType: idx.kasbonType >= 0 ? cells[idx.kasbonType] : undefined,
          kasbonRef: idx.kasbonRef >= 0 ? cells[idx.kasbonRef] : undefined,
        });

        await prisma.cashTransaction.create({
          data: {
            date: new Date(parsed.date),
            type: parsed.type,
            category: parsed.category,
            amount: parsed.amount,
            description: parsed.description,
            source: parsed.source ?? "IMPORT",
            kasbonType: parsed.kasbonType,
            kasbonRef: parsed.kasbonRef,
          },
        });

        result.inserted += 1;
      } catch (error: unknown) {
        result.failed += 1;
        result.errors.push({
          line: i + 1,
          message: getErrorMessage(error, "Data tidak valid"),
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("API Error [Transactions Import POST]:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Gagal import transaksi.") }, { status: 500 });
  }
}
