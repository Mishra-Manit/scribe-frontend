import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContextProvider';
import { Professor } from './useFirebaseProfessors'; // Assuming Professor interface is here

interface ProfessorQueueItem {
  professorId: string;
  status: 'pending' | 'swiped' | 'accepted' | 'rejected';
}

export function usePersistedAcceptedProfessors() {
  const { user } = useAuth();
  const [acceptedProfessorsList, setAcceptedProfessorsList] = useState<Professor[]>([]);
  const [loadingAccepted, setLoadingAccepted] = useState(true);
  const [errorAccepted, setErrorAccepted] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoadingAccepted(false);
      setAcceptedProfessorsList([]); // No user, no accepted professors
      return;
    }

    setLoadingAccepted(true);
    setErrorAccepted(null);

    const userDocRef = doc(db, 'users', user.uid);

    // Use onSnapshot to listen for real-time updates to the user's document
    const unsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const professorQueue = (userData.professorSwipeQueue || []) as ProfessorQueueItem[];
        
        const acceptedProfessorIds = professorQueue
          .filter(item => item.status === 'accepted')
          .map(item => item.professorId);

        if (acceptedProfessorIds.length === 0) {
          setAcceptedProfessorsList([]);
          setLoadingAccepted(false);
          return;
        }

        try {
          const fetchedProfessors: Professor[] = [];
          for (const profId of acceptedProfessorIds) {
            const profDocRef = doc(db, 'professors', profId);
            const profDocSnap = await getDoc(profDocRef);
            if (profDocSnap.exists()) {
              const profData = profDocSnap.data() as DocumentData;
              fetchedProfessors.push({
                id: profDocSnap.id,
                name: profData.name,
                university: profData.university,
                interests: profData.interests || [],
                image: profData.image,
                // map other fields if necessary
              });
            } else {
              console.warn(`Accepted professor with ID ${profId} not found in 'professors' collection.`);
            }
          }
          setAcceptedProfessorsList(fetchedProfessors);
        } catch (err: any) {
          console.error("Error fetching details for accepted professors:", err);
          setErrorAccepted(err.message || "Failed to load accepted professors list.");
          setAcceptedProfessorsList([]); // Clear list on error
        }
      } else {
        setErrorAccepted("User data not found for accepted list.");
        setAcceptedProfessorsList([]);
      }
      setLoadingAccepted(false);
    }, (error) => {
      console.error("Error listening to user document for accepted professors:", error);
      setErrorAccepted(error.message || "Failed to listen for updates.");
      setLoadingAccepted(false);
      setAcceptedProfessorsList([]);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

  return { acceptedProfessorsList, loadingAccepted, errorAccepted };
} 