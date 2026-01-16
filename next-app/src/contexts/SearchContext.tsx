'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface SearchContextType {
  pendingQuery: string | null;
  setPendingQuery: (query: string | null) => void;
  consumePendingQuery: () => string | null;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // Consume and clear the pending query (used by search page)
  const consumePendingQuery = useCallback(() => {
    const query = pendingQuery;
    setPendingQuery(null);
    return query;
  }, [pendingQuery]);

  return (
    <SearchContext.Provider
      value={{
        pendingQuery,
        setPendingQuery,
        consumePendingQuery,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

