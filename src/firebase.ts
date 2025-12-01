import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    "缺少 Firebase 配置，已禁用云端功能，仅保留本地存储。请在 .env.local 中补齐 VITE_FIREBASE_* 变量以启用云同步。"
  );
}

export const firebaseReady = hasFirebaseConfig;

export function requireFirestore(): Firestore {
  if (!db) {
    throw new Error(
      "云端功能尚未配置 Firebase：请先在设置中保持“云同步”关闭，或补齐 .env.local 中的 VITE_FIREBASE_* 配置。"
    );
  }
  return db;
}

export async function ensureAnonAuth(): Promise<string> {
  if (!auth) {
    return Promise.resolve("local-only");
  }
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    await signInAnonymously(auth);
  } catch (err) {
    console.error("匿名登录失败，已回退至本地模式：", err);
    return "local-only";
  }
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth!,
      (u) => {
        if (u) {
          resolve(u.uid);
          unsub();
        }
      },
      (error) => {
        console.error("监听 Firebase 登录状态失败：", error);
        reject(error);
      }
    );
  });
}
