/**
 * Simple Email History Hook
 * Clean and straightforward email fetching
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { emailService } from "@/lib/email-service";
import { EmailHistory } from "@/lib/schemas";

export function useEmailHistory(limit = 100, offset = 0) {
  const { user } = useAuth();
  
  return useQuery<EmailHistory>({
    queryKey: ['emails', user?.uid, limit, offset],
    queryFn: () => emailService.getEmailHistory(limit, offset),
    enabled: !!user?.uid,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}
