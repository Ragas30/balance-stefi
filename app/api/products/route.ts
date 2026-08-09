import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/utils";

export async function GET() {
    try {
        const products = await prisma.product.findMany();
        return NextResponse.json(products);
    } catch (error: unknown) {
        console.error("API Error [Products GET]:", error);
        const message = getErrorMessage(error, "Gagal memuat daftar produk.");
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
