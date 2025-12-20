import { initializeApp } from 'firebase/app';
// Fixing Firebase Auth and Firestore exports for modular SDK by using direct submodule paths
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB4AVx4xPWqBtRs2GXFShiqHQNfYtaXWkU",
  authDomain: "dr-foodie-bc477.firebaseapp.com",
  projectId: "dr-foodie-bc477",
  storageBucket: "dr-foodie-bc477.firebasestorage.app",
  messagingSenderId: "162055987584",
  appId: "1:162055987584:web:f70b64c6b39b0fd14f6165",
  measurementId: "G-2X4R1G8R7H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);