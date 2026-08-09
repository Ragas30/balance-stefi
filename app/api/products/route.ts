import { NextResponse } from "next/server";
import { firestore, docsWithId } from "@/lib/firebase-admin";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
    try {
        const snap = await firestore.collection("products").get();
        const products = docsWithId(snap);
        return NextResponse.json(products);
    } catch (error: unknown) {
        console.error("API Error [Products GET]:", error);
        const message = getErrorMessage(error, "Gagal memuat daftar produk.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
