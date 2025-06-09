import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card'; // Assuming this path is correct for your Card component
import { Professor } from '../hooks/useFirebaseProfessors';

interface ProfessorCardProps {
  professor: Professor;
  onSwipe: (direction: 'left' | 'right') => void;
  isActive: boolean; // To control which card is on top and interactive
}

export function ProfessorCard({ professor, onSwipe, isActive }: ProfessorCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-25, 25]); // Reduced rotation for a subtler effect
  
  // Opacity of the card itself during drag
  const cardOpacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  
  // Opacity for confirm/deny overlays
  const confirmOverlayOpacity = useTransform(x, [0, 100], [0, 1]); // Show when dragging right (accept)
  const denyOverlayOpacity = useTransform(x, [-100, 0], [1, 0]);    // Show when dragging left (reject)

  // Stores the direction determined by a drag gesture on this card
  const [dragInducedSwipeDirection, setDragInducedSwipeDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    // Reset drag-induced direction when the card becomes inactive or professor changes,
    // to prevent stale drag direction from affecting a new card or a manual swipe.
    if (!isActive) {
      setDragInducedSwipeDirection(null);
      x.set(0); // Reset card position too if it became inactive mid-drag
    }
  }, [isActive, professor.id, x]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isActive) return;

    let direction: 'left' | 'right' | null = null;
    if (info.offset.x < -80) {
      direction = 'left';  // Swipe left = reject
    } else if (info.offset.x > 80) {
      direction = 'right'; // Swipe right = accept
    }

    if (direction) {
      setDragInducedSwipeDirection(direction); // Set for this card's own state
      onSwipe(direction); // Inform parent (SwipePage)
    } else {
      // No swipe, ensure direction is reset if it was somehow set
      setDragInducedSwipeDirection(null);
      // x.set(0) will be handled by dragConstraints if not dragged beyond threshold.
    }
  };

  // Define animation for card exit
  const variants = {
    initial: { opacity: 0, y: 30, scale: 0.9 }, // Slightly adjusted initial animation
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
    exit: (exitParams: { direction: 'left' | 'right' } | null) => {
      // Default to 'right' swipe if exitParams or its direction is somehow null/undefined
      const dir = exitParams?.direction || 'right'; 
      return {
        x: dir === 'left' ? -350 : 350,  // 'left' (reject) moves card to the left, 'right' (accept) moves card to the right
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.25 }
      };
    },
  };

  // Determine the final exit direction for the custom prop for THIS card.
  // This is crucial: it must be determined based on the props/state *at the moment of exit*.
  let exitAnimationParams: { direction: 'left' | 'right' } | null = null;
  if (dragInducedSwipeDirection) { // Fallback to drag-induced if no manual override for this card
    exitAnimationParams = { direction: dragInducedSwipeDirection };
  } else {
    // If neither manual nor drag-induced, means it's exiting for other reasons or without a swipe.
    // We can let it default in the variant, or specify a default here.
    // To ensure animation, let's ensure it has a direction. Default to right.
    // This case ideally shouldn't be hit if AnimatePresence only removes due to swipe.
    // exitAnimationParams = { direction: 'right' }; 
  }

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab"
      style={{
        x: isActive ? x : undefined, // Only apply motion value to active card for dragging
        rotate: isActive ? rotate : undefined,
        opacity: isActive ? cardOpacity : 1, // Non-active cards are fully visible but below
        zIndex: isActive ? 10 : (professor.id === 'behind' ? 5 : 0), // Example for stacking visual, needs more logic if used
      }}
      drag={isActive ? "x" : false} // Enable drag only for the active card
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Keep card centered while dragging
      onDragEnd={handleDragEnd}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit" // Use the "exit" variant key
      custom={exitAnimationParams} // Pass the object or null
      // layoutId={professor.id} // Add if you want layout animations between cards, ensure Professor has unique id
    >
      <Card className="w-full h-full flex flex-col justify-between relative overflow-hidden shadow-xl rounded-2xl select-none">
        {/* Image */}
        <div className="w-full h-3/5 relative p-4">
          <div className="relative w-full h-full">
            <Image 
              src={professor.image || "/placeholder.svg"} 
              alt={professor.name} 
              fill={true}
              style={{ objectFit: "contain" }} // Ensures the entire image fits within the frame
              className="pointer-events-none" // Keep existing className if it has other styles
              priority={isActive} // Optionally prioritize loading for active card
            />
          </div>
          {/* Confirm/Deny overlays */}
          {isActive && (
            <>
              <motion.div 
                className="absolute inset-0 bg-green-500 bg-opacity-70 flex items-center justify-center pointer-events-none rounded-t-2xl"
                style={{ opacity: confirmOverlayOpacity, zIndex: 20 }} // Higher zIndex for overlay
              >
                <span className="text-white text-4xl sm:text-5xl font-bold border-2 sm:border-4 border-white rounded-lg p-2 sm:p-4">ACCEPT</span>
              </motion.div>
              <motion.div 
                className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center pointer-events-none rounded-t-2xl"
                style={{ opacity: denyOverlayOpacity, zIndex: 20 }} // Higher zIndex for overlay
              >
                <span className="text-white text-4xl sm:text-5xl font-bold border-2 sm:border-4 border-white rounded-lg p-2 sm:p-4">REJECT</span>
              </motion.div>
            </>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-3 sm:p-4 flex-grow flex flex-col justify-center bg-white rounded-b-2xl">
          <h2 className="text-xl sm:text-2xl font-bold mb-1 text-gray-800 text-center">{professor.name}</h2>
          <p className="text-sm sm:text-md text-purple-600 font-semibold mb-2 sm:mb-3 text-center">{professor.university}</p>
          
          {professor.interests && professor.interests.length > 0 && (
            <div className="mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm text-gray-500 mb-1 font-medium text-center">Interests:</p>
              <ul className="list-none p-0 m-0 flex flex-wrap gap-1 sm:gap-2 justify-center">
                {professor.interests.slice(0, 4).map((interest, index) => ( // Show limited interests
                  <li key={index} className="text-[10px] sm:text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-1 font-medium">
                    {interest}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
} 