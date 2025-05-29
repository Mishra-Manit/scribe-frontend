"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface MobileRestrictionProps {
  children: React.ReactNode;
  enabled?: boolean; // Optional prop to enable/disable restriction
}

export default function MobileRestriction({ children, enabled = true }: MobileRestrictionProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkDevice = () => {
      // Check if screen width is less than 768px (typical mobile breakpoint)
      const mobileCheck = window.innerWidth < 768;
      setIsMobile(mobileCheck);
      setIsLoaded(true);
    };

    // Initial check
    checkDevice();

    // Listen for window resize
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  // Don't render anything until we've checked the device
  if (!isLoaded) {
    return null;
  }

  // If restriction is disabled, always show the content
  if (!enabled) {
    return <>{children}</>;
  }

  // Show mobile restriction message
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Monitor className="h-16 w-16 text-gray-400" />
            </div>
            <CardTitle className="text-2xl">Desktop Only Feature</CardTitle>
            <CardDescription className="text-base mt-2">
              This feature is optimized for desktop use only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-6">
              The email generation and professor swiping features require a larger screen 
              for the best experience. Please access from a computer to use these tools.
            </p>
            <Button 
              onClick={handleBackToDashboard}
              className="w-full"
              variant="default"
            >
              Go Back to Dashboard
            </Button>
            <p className="text-sm text-gray-500 text-center mt-3">
              Click this button to go back to the dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the protected content on desktop
  return <>{children}</>;
} 