"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContextProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import MobileRestriction from "@/components/MobileRestriction";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "../../config/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface EmailHistory {
  id: string;
  professor_name: string;
  professor_interest: string;
  email_message: string;
  source: string;
  created_at: any;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [emailCount, setEmailCount] = useState(0);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [hoveredEmailId, setHoveredEmailId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  // Fetch user's email history and derive count from it
  useEffect(() => {
    const fetchEmailHistory = () => {
      if (user?.uid) {
        try {
          // Reference to user's emails subcollection
          const emailsRef = collection(db, "users", user.uid, "emails");
          
          const unsubscribe = onSnapshot(emailsRef, (querySnapshot) => {
            const emails: EmailHistory[] = [];
            querySnapshot.forEach((doc) => {
              emails.push({
                id: doc.id,
                ...doc.data()
              } as EmailHistory);
            });
            
            // Sort by created_at timestamp
            emails.sort((a, b) => {
              if (a.created_at && b.created_at) {
                return b.created_at.toMillis() - a.created_at.toMillis();
              }
              return 0;
            });
            
            setEmailHistory(emails);
            // Set email count based on actual number of emails
            setEmailCount(emails.length);
          });

          return unsubscribe;
        } catch (error: unknown) {
          console.error("Error fetching email history:", error);
        }
      }
    };

    const unsubscribe = fetchEmailHistory();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return (
    <ProtectedRoute>
      <MobileRestriction enabled={false}>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            <div className="px-4 py-6 sm:px-0">
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 bg-white">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.displayName || "Guest"}!
                </h1>
                <p className="text-gray-600">
                  Ready to generate some cold emails? Let&apos;s get started.
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className="px-4 py-6 sm:px-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Emails Generated
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-4 w-4 text-muted-foreground"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Lifetime total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Account Type
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-4 w-4 text-muted-foreground"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Free</div>
                    <p className="text-xs text-muted-foreground">
                      Current plan
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Status
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-4 w-4 text-muted-foreground"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">Active</div>
                    <p className="text-xs text-muted-foreground">
                      Ready to generate
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Email History Section */}
            <div className="px-4 py-6 sm:px-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Email History</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Professor Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Interest/Field
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email Content
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {emailHistory.length > 0 ? (
                          emailHistory.map((email) => (
                            <tr 
                              key={email.id} 
                              className="hover:bg-gray-50"
                              onMouseEnter={() => setHoveredEmailId(email.id)}
                              onMouseLeave={() => setHoveredEmailId(null)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                                {email.professor_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                {email.professor_interest}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                  {email.source}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 relative">
                                <div className="max-w-2xl">
                                  <pre className="whitespace-pre-wrap font-sans">
                                    {email.email_message || "No content"}
                                  </pre>
                                  {hoveredEmailId === email.id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="absolute top-4 right-4 shadow-lg"
                                      onClick={async () => {
                                        if (email.email_message) {
                                          await navigator.clipboard.writeText(email.email_message);
                                          setCopiedEmailId(email.id);
                                          setTimeout(() => setCopiedEmailId(null), 2000);
                                        }
                                      }}
                                    >
                                      {copiedEmailId === email.id ? (
                                        <>
                                          <Check className="h-4 w-4 mr-1" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-4 w-4 mr-1" />
                                          Copy
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                              No email history found. Generate some emails to see them here!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MobileRestriction>
    </ProtectedRoute>
  );
}