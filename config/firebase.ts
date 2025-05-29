// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC3kECw6Ka7weVqz8kjzB-DlwWUxrbL3rI",
  authDomain: "coldauth-a5caf.firebaseapp.com",
  projectId: "coldauth-a5caf",
  storageBucket: "coldauth-a5caf.firebasestorage.app",
  messagingSenderId: "163937813557",
  appId: "1:163937813557:web:f6727243c2c5dead37dd7c",
  measurementId: "G-9Y8DV07EEW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);