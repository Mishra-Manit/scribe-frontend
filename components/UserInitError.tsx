'use client';

import { useAuth } from '@/context/AuthContextProvider';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function UserInitError() {
  const { userInitError, retryUserInit } = useAuth();

  if (!userInitError) return null;

  return (
    <Alert variant="destructive" className="m-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Account Setup Issue</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{userInitError}</p>
        <Button
          onClick={retryUserInit}
          variant="outline"
          size="sm"
          className="mr-2"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Setup
        </Button>
        <span className="text-sm text-muted-foreground">
          If the issue persists, please try logging out and back in.
        </span>
      </AlertDescription>
    </Alert>
  );
}
