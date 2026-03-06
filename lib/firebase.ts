import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyD7Uh9NfNLELcOZOzXGmGJYC5Wp7cphzOE",
  authDomain: "gymcdu.firebaseapp.com",
  projectId: "gymcdu",
  storageBucket: "gymcdu.firebasestorage.app",
  messagingSenderId: "620263926048",
  appId: "1:620263926048:web:f6bb920d6f16f839b64f45",
  measurementId: "G-ZCGMR1M970"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export { db }
