"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { CheckCircle2, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";

export function WelcomeScreen({ isOpen }: { isOpen: boolean }) {
  const queryClient = useQueryClient();

  const { mutate: completeOnboarding, isPending } = useMutation({
    mutationFn: () => api.user.completeOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Scribe!</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Automate your academic research outreach with AI-powered personalized emails.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <FadeIn delay={0.1}>
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3 text-foreground font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>What You'll Need</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Professor names (full names) for email personalization
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      A cold email template (create one using our{" "}
                      <Link
                        href="/dashboard/template"
                        className="text-foreground hover:text-primary font-medium hover:underline"
                      >
                        Template Tool
                      </Link>
                      )
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3 text-foreground font-semibold">
                  <Info className="h-4 w-4" />
                  <span>Free Usage</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Usage of the tool is free, however there is a limit to the number of emails that can be generated at a time.
                </p>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3 text-foreground font-semibold">
                  <Sparkles className="h-4 w-4" />
                  <span>Pro Tip</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate your emails using the service, export them as an Excel sheet, and then use a spreadsheet emailer like{" "}
                  <Link href="https://www.yamm.com/" target="_blank" className="text-primary underline font-medium hover:text-primary/80 hover:underline">YAMM (Yet Another Mail Merge)</Link> to manage your email campaigns when sending to professors.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <DialogFooter>
          <Button
            onClick={() => completeOnboarding()}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? "Setting up..." : "Get Started"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
