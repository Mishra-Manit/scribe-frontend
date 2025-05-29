// hooks/useProfessors.ts
import { useEffect, useState } from 'react';
import { useFirebaseProfessors, Professor } from './useFirebaseProfessors';
import { useAuth } from '../context/AuthContextProvider'; // Corrected path to Auth context
import { db } from '../config/firebase'; // Path to your Firebase config
import { doc, updateDoc, getDoc,arrayUnion, arrayRemove, FieldValue } from 'firebase/firestore';
import { usePersistedAcceptedProfessors } from './usePersistedAcceptedProfessors'; // Import the new hook

interface ProfessorQueueItem {
  professorId: string;
  status: 'pending' | 'swiped' | 'accepted' | 'rejected'; // Expanding status possibilities
}

export function useProfessors() {
  const { user } = useAuth(); // Get the current user
  const { 
    professors: firebaseProfessors, 
    loading: firebaseLoading, 
    error: firebaseError 
  } = useFirebaseProfessors();
  
  // Get the persisted accepted professors list
  const { 
    acceptedProfessorsList: persistedAcceptedProfessors, 
    loadingAccepted: loadingPersistedAccepted, 
    errorAccepted: errorPersistedAccepted 
  } = usePersistedAcceptedProfessors();

  const [queue, setQueue] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Combined loading state: true if either the main queue or accepted list is loading.
    setLoading(firebaseLoading || loadingPersistedAccepted);
  }, [firebaseLoading, loadingPersistedAccepted]);

  useEffect(() => {
    // Prioritize error from main queue fetching, or use error from accepted list fetching.
    if (firebaseError) {
      setError(firebaseError);
    } else if (errorPersistedAccepted) {
      setError(errorPersistedAccepted);
    } else {
      setError(null);
    }
  }, [firebaseError, errorPersistedAccepted]);

  useEffect(() => {
    // Only set queue from firebaseProfessors if not loading and no error from firebase hook
    if (!firebaseLoading && !firebaseError) {
        setQueue(firebaseProfessors);
    }
  }, [firebaseProfessors, firebaseLoading, firebaseError]);

  const handleSwipe = async (direction: string, professorSwiped: Professor) => {
    // Optimistic update for the main queue
    const originalQueue = [...queue];
    setQueue((prevQueue) => prevQueue.filter((prof) => prof.id !== professorSwiped.id));

    // Note: We are not optimistically updating `persistedAcceptedProfessors` here because
    // that list is now managed by `usePersistedAcceptedProfessors` which listens to Firebase.
    // The `Header` will update once Firebase confirms the change and `usePersistedAcceptedProfessors` updates.

    if (!user) {
      console.error("User not available for swipe operation update.");
      setError("Could not save swipe: User not logged in.");
      setQueue(originalQueue); // Revert queue
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.error("User document not found in Firebase.");
        setError("Could not save swipe: User data missing.");
        setQueue(originalQueue);
        return;
      }

      const userData = userDocSnap.data();
      const currentProfessorQueue = (userData.professorSwipeQueue || []) as ProfessorQueueItem[];
      const professorIndexInQueue = currentProfessorQueue.findIndex(
        (item) => item.professorId === professorSwiped.id
      );

      if (professorIndexInQueue === -1) {
        console.warn("Swiped professor not found in user's Firebase queue for status update.");
        return; 
      }

      const newStatus = direction === 'right' ? 'accepted' : 'rejected';
      const updatedProfessorQueue = currentProfessorQueue.map((item, index) => {
        if (index === professorIndexInQueue) {
          return { ...item, status: newStatus }; 
        }
        return item;
      });

      await updateDoc(userDocRef, {
        professorSwipeQueue: updatedProfessorQueue,
      });
      
      console.log(`Professor ${professorSwiped.name} status updated to '${newStatus}' in Firebase.`);

    } catch (e) {
      console.error("Error updating professor status in Firebase:", e);
      setError("Failed to save swipe action. Please try again.");
      setQueue(originalQueue); // Revert queue on error
    }
  };

  return { 
    professors: queue, 
    acceptedProfessors: persistedAcceptedProfessors, // Use the persisted list
    handleSwipe, 
    loading, 
    error 
  };
} 