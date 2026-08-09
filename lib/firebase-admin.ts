import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

export const firestore = getFirestore(adminApp);
export default adminApp;
