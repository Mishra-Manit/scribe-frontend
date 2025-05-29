import React from 'react';

// Assuming Professor type might be useful here in the future, 
// or that acceptedProfessors could have more properties of Professor.
// For now, your provided interface is sufficient.
interface AcceptedProfessorDisplay {
  name: string;
  // Potentially add other fields from Professor if needed for display
}

interface HeaderProps {
  acceptedProfessors: AcceptedProfessorDisplay[];
}

export function Header({ acceptedProfessors }: HeaderProps) {
  return (
    <header className="bg-white shadow-md p-4 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-primary">Professor Matcher</h1>
        {acceptedProfessors.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-1 text-gray-700">Accepted Professors:</h2>
            <ul className="flex flex-wrap gap-2">
              {acceptedProfessors.map((professor, index) => (
                <li key={index} className="text-sm bg-primary/10 text-primary rounded-full px-3 py-1">
                  {professor.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
} 