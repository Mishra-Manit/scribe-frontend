import { useEffect, useState } from 'react';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase'; // Adjusted path to Firebase config
import { useAuth } from '../context/AuthContextProvider'; // Adjusted path to Auth context

export interface Professor {
  id: string;
  name: string;
  university: string;
  interests: string[];
  image?: string;
  // Add other fields from your 'professors' collection as needed
}

export function useFirebaseProfessors() {
  const { user } = useAuth();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfessorData = async () => {
      if (!user) {
        setLoading(false);
        // Optionally, you could set an error here or return early if user is required.
        // For now, if no user, no professors will be fetched.
        setProfessors([]); 
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const professorQueue = userData.professorSwipeQueue || [];
          
          if (professorQueue.length === 0) {
            setProfessors([]);
            setLoading(false);
            return;
          }

          const fetchedProfessors: Professor[] = [];
          for (const queueItem of professorQueue) {
            // Assuming you only want to fetch professors with 'pending' status for the swipe queue
            if (queueItem.status === 'pending') {
              const profDocRef = doc(db, 'professors', queueItem.professorId);
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
                console.warn(`Professor with ID ${queueItem.professorId} not found.`);
              }
            }
          }
          setProfessors(fetchedProfessors);
        } else {
          setError("User data not found.");
          setProfessors([]);
        }
      } catch (err: any) {
        console.error("Error fetching professor data in useFirebaseProfessors:", err);
        setError(err.message || "Failed to load professor data.");
        setProfessors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessorData();
  }, [user]);

  return { professors, loading, error };
} 