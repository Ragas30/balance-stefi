import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const products = await prisma.product.findMany();
        return NextResponse.json(products);
    } catch (error: any) {
        console.error("API Error [Products GET]:", error);
        let message = error.message || "Gagal memuat daftar produk.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
