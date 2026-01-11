// js/storage.js
import { db, auth } from './firebase-config.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const STORAGE_KEY = 'prepMasterData_v3';

// --- Local Storage (Offline Backup) ---
export function saveToStorage(data) {
    try {
        const payload = JSON.stringify({
            schema: 3.2,
            tasks: data.tasks,
            subjects: data.subjects,
            targetDate: data.targetDate,
            lastBackup: data.lastBackup
        });
        localStorage.setItem(STORAGE_KEY, payload);
        return true;
    } catch (e) {
        console.error("Save failed:", e);
        return false;
    }
}

export function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error("Data corrupted, backing up and resetting.", e);
        localStorage.setItem(STORAGE_KEY + '_corrupted', stored);
        return null;
    }
}

// --- CLOUD SYNC (Guarded) ---

export async function saveToCloud(data) {
    // FIX: Guard clause - Don't write if not logged in
    const user = auth.currentUser;
    if (!user) return; 

    try {
        const payload = {
            schema: 3.2,
            tasks: data.tasks || [],
            subjects: data.subjects || [],
            targetDate: data.targetDate || '2026-02-01',
            lastBackup: new Date().toISOString()
        };
        // Save to users/{uid}
        await setDoc(doc(db, "users", user.uid), payload);
        console.log("☁️ Saved to Cloud");
    } catch (e) {
        console.error("Cloud Save Error:", e);
    }
}

export async function loadFromCloud(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null; 
        }
    } catch (e) {
        console.error("Cloud Load Error:", e);
        return null;
    }
}

// --- Validation ---
export function validateData(data) {
    if (!data || typeof data !== 'object') return { ok: false, error: "Invalid JSON structure." };
    if (data.schema !== 3.2) return { ok: false, error: `Version mismatch. Expected 3.2, got ${data.schema}.` };
    if (!Array.isArray(data.tasks)) return { ok: false, error: "Missing tasks array." };
    if (!Array.isArray(data.subjects)) return { ok: false, error: "Missing subjects array." };
    return { ok: true };
}