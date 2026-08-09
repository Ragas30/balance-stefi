import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

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
  } catch (error: unknown) {
    console.error("API Error [Accounts GET]:", error);
    const message = getErrorMessage(error, "Gagal mengambil data akun.");
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
  } catch (error: unknown) {
    console.error("API Error [Accounts]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
    }
    let message = getErrorMessage(error, "Gagal membuat akun.");
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      message = "Kode COA sudah digunakan! Harap gunakan kode akun lain.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
