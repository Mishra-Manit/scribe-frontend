"use client";
import { useRouter } from "next/navigation"
import React from "react"
import { db } from "../config/firebase"
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { useAuth } from "../context/AuthContextProvider"

export default function LandingPage() {
  const provider = new GoogleAuthProvider();
  const auth = getAuth();
  const router = useRouter();

  useAuth(); // Call useAuth if it has side effects, otherwise this line can be removed if not needed.

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      const user = auth.currentUser;
      console.log(user);
      
      if(user){
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        if (!userDocSnapshot.exists()) {
          await setDoc(userDocRef, {
            userId: user.uid,
            email: user.email,
            name: user.displayName,
            emailCount: 0,
          });
        }
      }

      router.replace("/dashboard");

    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black bg-grid-pattern">
      <div className="text-center px-4 max-w-3xl">
        <div className="inline-block mb-12">
          <h1 className="text-white text-5xl md:text-6xl font-bold">
            <span className="bg-white text-black px-2">scribe</span>.com
          </h1>
        </div>

        <p className="text-white/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
          One stop shop for anything cold email related
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={loginWithGoogle}
            className="inline-flex items-center justify-between px-6 py-3 border border-white text-white hover:bg-white/10 transition-colors"
          >
            Sign in
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>

          <button
            className="inline-flex items-center justify-between px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
          >
            Sign Up
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
