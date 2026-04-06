import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCLgovaXfshvbwyGM-v970AkDiE73Vo0a4",
  authDomain: "espacioscdu.firebaseapp.com",
  projectId: "espacioscdu",
  storageBucket: "espacioscdu.firebasestorage.app",
  messagingSenderId: "547238322401",
  appId: "1:547238322401:web:75e6bb9d40cfba6efb97a0",
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export { db }
