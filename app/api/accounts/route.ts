import { NextResponse } from "next/server";
import { firestore, docsWithId } from "@/lib/firebase-admin";
import { z } from "zod";
import { getErrorMessage, getZodIssueMessage } from "@/lib/utils";

const accountSchema = z.object({
  code: z.string().min(1, "Kode Akun diperlukan"),
  name: z.string().min(1, "Nama Akun diperlukan"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
});

export async function GET() {
  try {
    const snap = await firestore.collection("accounts").orderBy("code").get();
    const accounts = docsWithId(snap);
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

    const dup = await firestore
      .collection("accounts")
      .where("code", "==", data.code)
      .limit(1)
      .get();

    if (!dup.empty) {
      return NextResponse.json(
        { error: `Akun dengan kode ${data.code} sudah ada.` },
        { status: 400 }
      );
    }

    const ref = await firestore.collection("accounts").add({
      code: data.code,
      name: data.name,
      type: data.type,
      createdAt: new Date(),
    });

    const account = {
      id: ref.id,
      code: data.code,
      name: data.name,
      type: data.type,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(account, { status: 201 });
  } catch (error: unknown) {
    console.error("API Error [Accounts]:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodIssueMessage(error) }, { status: 400 });
    }
    return NextResponse.json({ error: getErrorMessage(error, "Gagal membuat akun.") }, { status: 500 });
  }
}
