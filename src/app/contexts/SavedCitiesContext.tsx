
'use client'
import React, { createContext, useContext, ReactNode, useState } from 'react';

interface SavedCitiesContextType {
  savedCities: string[];
  toggleCitySaved: (city: string) => void;
}

export const SavedCitiesContext = createContext<SavedCitiesContextType | undefined>(undefined);

export const useSavedCities = () => {
  const context = useContext(SavedCitiesContext);
  if (context === undefined) {
    throw new Error('useSavedCities must be used within a SavedCitiesProvider');
  }
  return context;
};

interface SavedCitiesProviderProps {
  children: ReactNode;
}

export const SavedCitiesProvider: React.FC<SavedCitiesProviderProps> = ({ children }) => {
  const [savedCities, setSavedCities] = useState<string[]>([]);

  const toggleCitySaved = (city: string) => {
    setSavedCities(current =>
      current.includes(city) ? current.filter(c => c !== city) : [...current, city]
    );
  };

  return (
    <SavedCitiesContext.Provider value={{ savedCities, toggleCitySaved }}>
      {children}
    </SavedCitiesContext.Provider>
  );
};
