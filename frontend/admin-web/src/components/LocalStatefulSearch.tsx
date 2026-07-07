import { useState } from "react";

interface LocalStatefulSearchProps<T> {
  dataset: T[];
  searchKeys: (keyof T)[];
  onFilteredResults: (filtered: T[]) => void;
  placeholderText?: string;
}

export function LocalStatefulSearch<T>({ dataset, searchKeys, onFilteredResults, placeholderText }: LocalStatefulSearchProps<T>) {
  const [query, setQuery] = useState("");

  const executeLocalQuery = () => {
    if (!query.trim()) {
      onFilteredResults(dataset);
      return;
    }

    const filtered = dataset.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        return value && String(value).toLowerCase().includes(query.toLowerCase());
      })
    );
    onFilteredResults(filtered);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeLocalQuery();
    }
  };

  return (
    <div className="local-search-wrapper">
      <input
        type="text"
        className="local-search-input"
        placeholder={placeholderText || "Search local data... (Enter to search)"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="button" className="local-search-button" onClick={executeLocalQuery}>
        Search
      </button>
    </div>
  );
}