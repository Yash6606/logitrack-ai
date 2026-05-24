import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCK5pwUS_puhAkMyU0J-_JimQjkUf18Z8w",
  authDomain: "logitrack-ai-9a835.firebaseapp.com",
  projectId: "logitrack-ai-9a835",
  storageBucket: "logitrack-ai-9a835.firebasestorage.app",
  messagingSenderId: "437752530993",
  appId: "1:437752530993:web:7008ba9d0054d3db5cad10",
  measurementId: "G-KXLZBR0W90",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
