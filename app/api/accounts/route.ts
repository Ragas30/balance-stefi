import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const accountSchema = z.object({
  code: z.string().min(1, "Kode Akun diperlukan"),
  name: z.string().min(1, "Nama Akun diperlukan"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error("API Error [Accounts GET]:", error);
    let message = error.message || "Gagal mengambil data akun.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = accountSchema.parse(body);

    // Cek duplikasi kode
    const existing = await prisma.account.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Akun dengan kode ${data.code} sudah ada.` },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error("API Error [Accounts]:", error);
    if (error instanceof z.ZodError) {
      const err = error as any;
      return NextResponse.json({ error: err.errors ? err.errors.map((e: any) => e.message).join(", ") : "Validasi input gagal." }, { status: 400 });
    }
    let message = error.message || "Gagal membuat akun.";
    if (error.code === 'P2002') message = "Kode COA sudah digunakan! Harap gunakan kode akun lain.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
