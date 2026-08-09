import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Firestore, DocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";

function parsePrivateKey(value: string | undefined) {
    if (!value) return undefined;
    return value.replace(/\\n/g, "\n");
}

function initFirebaseAdmin() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin SDK membutuhkan env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
        );
    }

    return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
    });
}

const adminApp = getApps().length > 0 ? getApps()[0] : initFirebaseAdmin();

export const firestore: Firestore = getFirestore(adminApp);
export default adminApp;

export function toDate(value: unknown): Date {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === "string") return new Date(value);
    return new Date();
}

export function toIso(value: unknown): string {
    return toDate(value).toISOString();
}

export function toNumber(value: unknown): number {
    if (typeof value === "number") return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function toPlain(value: unknown): unknown {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(toPlain);
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
        return out;
    }
    return value;
}

export function docWithId(doc: DocumentSnapshot): Record<string, unknown> {
    const data = doc.data();
    return data ? { id: doc.id, ...(toPlain(data) as Record<string, unknown>) } : { id: doc.id };
}

export function docsWithId(snapshot: QuerySnapshot): Record<string, unknown>[] {
    return snapshot.docs.map(docWithId);
}

export async function getDocs(collection: string): Promise<Record<string, unknown>[]> {
    const snap = await firestore.collection(collection).get();
    return docsWithId(snap);
}
