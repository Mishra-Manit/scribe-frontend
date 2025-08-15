"use client";

import Navbar from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MentorshipPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Card className="mb-8 shadow-xl border-2 border-dashed border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-gray-900 text-center">
              Science Research Mentorship
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-4">
                Unlock your research potential with personalized mentorship from experienced scientists and researchers. Whether you're a high school or college student, our mentorship program is designed to guide you through the process of conducting impactful science research, from idea to publication.
              </p>
              <ul className="text-left text-gray-600 mb-6 mx-auto max-w-md list-disc list-inside">
                <li>1-on-1 mentorship with published researchers</li>
                <li>Guidance on research design, data analysis, and writing</li>
                <li>Support for science fair and publication submissions</li>
                <li>Flexible remote sessions tailored to your schedule</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link href="mailto:contact@scribe.com?subject=Mentorship Inquiry" passHref legacyBehavior>
                  <Button asChild className="px-8 py-3 text-lg font-semibold">
                    <a>Contact Us</a>
                  </Button>
                </Link>
                <Link href="/" passHref legacyBehavior>
                  <Button variant="outline" asChild className="px-8 py-3 text-lg font-semibold">
                    <a>Back to Home</a>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="text-center text-gray-400 text-sm mt-8">
          &copy; {new Date().getFullYear()} scribe.com — Empowering the next generation of researchers
        </div>
      </div>
    </div>
  );
}
