// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZI5JchUqJVlS7M50aE2lYa5FANxuLPKk",
  authDomain: "brics-workshop.firebaseapp.com",
  projectId: "brics-workshop",
  storageBucket: "brics-workshop.firebasestorage.app",
  messagingSenderId: "66960908651",
  appId: "1:66960908651:web:fa5f947d2d76c419886c2e",
  measurementId: "G-1FTJRDFXJR",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
};
