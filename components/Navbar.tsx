"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContextProvider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-2">
              <h1 className="text-xl font-bold text-black tracking-tight">
                scribe
              </h1>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/dashboard/generate">Generate</NavLink>
              <NavLink href="/dashboard/template">Templates</NavLink>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 font-medium">
              {user?.displayName || "Guest"}
            </span>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              size="sm"
              className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-black transition-all"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  
  return (
    <Link
      href={href}
      className="text-gray-500 hover:text-black hover:bg-black/5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
    >
      {children}
    </Link>
  );
} 