import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
      <h2 className="text-4xl font-bold text-gray-900 mb-2">404</h2>
      <p className="text-gray-500 mb-6">Page not found</p>
      <Link href="/">
        <Button variant="default">Return Home</Button>
      </Link>
    </div>
  );
}
