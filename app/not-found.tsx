import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h2 className="text-4xl font-bold text-foreground mb-2">404</h2>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link href="/">
        <Button variant="default">Return Home</Button>
      </Link>
    </div>
  );
}
