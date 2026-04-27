import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import './index.css';

// Tách hàm Debounce để tránh query elasticsearch liên tục khi gõ
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

function App() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // Đợi 300ms xem user có gõ tiếp ko
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;
  const searchContainerRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Type-ahead suggestions
  useEffect(() => {
    if (debouncedQuery.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    
    // YÊU CẦU: no-cache để test đúng hiệu năng từ Elasticsearch
    fetch(`http://localhost:3000/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`, {
      cache: 'no-store', // Không dùng cache
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        setSuggestions(data);
      })
      .catch(err => console.error(err));
  }, [debouncedQuery]);

  // Execute Full Text Search
  const handleSearch = (searchStr, targetPage = 1) => {
    const q = searchStr ?? query;
    if (!q.trim()) return;
    
    setShowSuggestions(false);
    setLoading(true);
    setPage(targetPage);
    
    fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}&page=${targetPage}&limit=${limit}`, {
      cache: 'no-store', // Không dùng cache
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(query, 1);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.name);
    handleSearch(suggestion.name, 1);
  };

  const renderPagination = () => {
    if (!results || results.total <= limit) return null;
    const totalPages = Math.ceil(results.total / limit);

    return (
      <div className="pagination">
        <button 
          disabled={page === 1} 
          onClick={() => handleSearch(query, page - 1)}
          className="page-btn"
        >
          Previous
        </button>
        <span className="page-info">Page {page} of {totalPages}</span>
        <button 
          disabled={page === totalPages} 
          onClick={() => handleSearch(query, page + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="container">
      <header>
        <h1>ElasticSearch Hub</h1>
        <p>Premium Full-Text Search Experience</p>
      </header>

      {/* Search Container */}
      <div className="search-container" ref={searchContainerRef}>
        <div className="search-input-wrapper">
          <Search className="search-icon" size={24} />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search phones, laptops, brands..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setShowSuggestions(true)}
          />
          <button className="search-btn" onClick={() => handleSearch(query, 1)}>
            Search
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((item) => (
              <div 
                key={item.id} 
                className="suggestion-item"
                onClick={() => handleSuggestionClick(item)}
              >
                <span className="suggestion-name">{item.name}</span>
                <span className="suggestion-brand">{item.brand}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Text Search Results */}
      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        results && (
          <div className="results-container">
            <div className="results-meta">
              Found {results.total} results in {results.timeTook}ms
            </div>
            
            {results.results.map((item) => (
              <div className="result-card" key={item.id}>
                <div className="result-header">
                  {/* Sử dụng dangerouslySetInnerHTML để render thẻ <mark> highlight từ Elasticsearch */}
                  <div 
                    className="result-title" 
                    dangerouslySetInnerHTML={{ __html: item.highlights?.name ? item.highlights.name[0] : item.name }}
                  />
                  <div className="result-price">${item.price}</div>
                </div>
                
                <div className="result-badges">
                  <span className="badge">{item.brand}</span>
                  <span className="badge">{item.category}</span>
                </div>
                
                <div 
                  className="result-desc"
                  dangerouslySetInnerHTML={{ __html: item.highlights?.description ? item.highlights.description[0] : item.description }}
                />
              </div>
            ))}
            
            {results.results.length === 0 && (
              <div style={{textAlign: 'center', color: 'var(--text-secondary)'}}>
                No results found. Try a different query.
              </div>
            )}
            
            {renderPagination()}
          </div>
        )
      )}
    </div>
  );
}

export default App;
