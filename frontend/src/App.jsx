import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, Package, Tag, Hash, Building2, List, ArrowLeft } from 'lucide-react';
import ProductHistory from './ProductHistory';

function App() {
  const [activeView, setActiveView] = useState('search'); // 'search' | 'tracked'
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Tracking State
  const [trackingId, setTrackingId] = useState(null);
  const [trackMessage, setTrackMessage] = useState('');

  // Selected product for history drill-down
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Tracked Items State
  const [trackedItems, setTrackedItems] = useState([]);
  const [loadingTracked, setLoadingTracked] = useState(false);
  const [trackedError, setTrackedError] = useState('');

  // --- Handlers ---

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    
    try {
      const response = await axios.get('https://product-price-tracker-9hse.onrender.com/items/search', {
        params: { name: searchQuery }
      });
      setResults(response.data.results);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch products. Is the backend server running?');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (productId) => {
    setTrackingId(productId);
    setTrackMessage('');
    try {
      const response = await axios.get(`https://product-price-tracker-9hse.onrender.com/items/track/${productId}`);
      setTrackMessage(`Success: ${response.data.message}`);
    } catch (err) {
      console.error(err);
      setTrackMessage(`Error tracking product ${productId}.`);
    } finally {
      setTrackingId(null);
      setTimeout(() => setTrackMessage(''), 5000);
    }
  };

  const loadTrackedItems = async () => {
    setLoadingTracked(true);
    setTrackedError('');
    try {
      const response = await axios.get('https://product-price-tracker-9hse.onrender.com/cronitems');
      setTrackedItems(response.data.results || []);
    } catch (err) {
      console.error(err);
      setTrackedError('Failed to load tracked items.');
    } finally {
      setLoadingTracked(false);
    }
  };

  const navigateTo = (view, product = null) => {
    setActiveView(view);
    if (view === 'tracked') {
      loadTrackedItems();
    }
    if (view === 'history' && product) {
      setSelectedProduct(product);
    }
  };

  // --- Render Helpers ---
  
  const renderProductCard = (product, isTrackedView = false) => (
    <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col group">
      <div className="p-6 flex-grow">
        
        <div className="flex justify-between items-start mb-4">
           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              ID: {product.productId}
           </span>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2" title={product.name}>
          {product.name}
        </h2>
        
        <div className="space-y-2 mt-4 text-sm text-gray-600">
          {product.brand && (
             <div className="flex items-center gap-2">
               <Building2 className="w-4 h-4 text-gray-400" />
               <span className="font-medium text-gray-900">Brand:</span> {product.brand}
             </div>
          )}
          {product.category && (
             <div className="flex items-center gap-2">
               <Tag className="w-4 h-4 text-gray-400" />
               <span className="font-medium text-gray-900">Category:</span> {product.category}
             </div>
          )}
          {product.sku && (
             <div className="flex items-center gap-2">
               <Hash className="w-4 h-4 text-gray-400" />
               <span className="font-medium text-gray-900">SKU:</span> {product.sku}
             </div>
          )}
        </div>

        {product.description && (
          <p className="mt-4 text-gray-500 text-sm line-clamp-3 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>
      
      {!isTrackedView && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => handleTrack(product.productId)}
              disabled={trackingId === product.productId}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {trackingId === product.productId ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Tracking...</>
              ) : 'Track Product'}
            </button>
        </div>
      )}
    </div>
  );

  // Show full-screen ProductHistory when a tracked item is clicked
  if (activeView === 'history' && selectedProduct) {
    return <ProductHistory product={selectedProduct} onBack={() => navigateTo('tracked')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-center space-y-6">
            
            <div className="w-full flex justify-between items-center">
              <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                Product Price Tracker
              </h1>
              
              {activeView === 'search' ? (
                <button 
                  onClick={() => navigateTo('tracked')}
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <List className="w-5 h-5" /> View Tracked Items
                </button>
              ) : (
                <button 
                  onClick={() => navigateTo('search')}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" /> Back to Search
                </button>
              )}
            </div>

            {/* Only show search bar in search view */}
            {activeView === 'search' && (
              <form onSubmit={handleSearch} className="w-full max-w-2xl relative">
                <div className="relative flex items-center w-full h-14 rounded-full focus-within:shadow-lg bg-white overflow-hidden border border-gray-300 transition-shadow duration-300">
                  <div className="grid place-items-center h-full w-12 text-gray-300 ml-2">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>

                  <input
                    className="peer h-full w-full outline-none text-gray-700 pr-2 pl-2 bg-transparent text-lg placeholder-gray-400"
                    type="text"
                    id="search"
                    placeholder="Search products by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  /> 
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-full px-8 font-semibold transition-colors disabled:bg-blue-400"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Search'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* ================= SEARCH VIEW ================= */}
        {activeView === 'search' && (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-blue-600 space-y-4">
                 <Loader2 className="w-12 h-12 animate-spin" />
                 <p className="text-lg font-medium text-gray-600">Searching products...</p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-2xl mx-auto">
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}

            {!loading && !error && hasSearched && results.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-1">No products found</h3>
                <p className="text-gray-500">We couldn't find anything matching "{searchQuery}".</p>
              </div>
            )}

            {!loading && !error && results.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-6 font-medium">Found {results.length} result{results.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map(product => renderProductCard(product, false))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= TRACKED VIEW ================= */}
        {activeView === 'tracked' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Tracked Products</h2>
              <p className="text-gray-500 mt-1">Products currently monitored by the Cron scraper.</p>
            </div>

            {loadingTracked && (
              <div className="flex flex-col items-center justify-center py-20 text-blue-600 space-y-4">
                 <Loader2 className="w-12 h-12 animate-spin" />
                 <p className="text-lg font-medium text-gray-600">Loading tracked products...</p>
              </div>
            )}

            {trackedError && !loadingTracked && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-2xl mx-auto">
                <p className="text-red-600 font-medium">{trackedError}</p>
              </div>
            )}

            {!loadingTracked && !trackedError && trackedItems.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <List className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-1">No tracked items yet</h3>
                <p className="text-gray-500">Go back to Search to find and track products.</p>
              </div>
            )}

            {!loadingTracked && !trackedError && trackedItems.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-6 font-medium">Tracking {trackedItems.length} product{trackedItems.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trackedItems.map(product => (
                    <div key={product.id} onClick={() => navigateTo('history', product)} className="cursor-pointer">
                      {renderProductCard(product, true)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Track Message Toast */}
        {trackMessage && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white font-medium z-50 transition-opacity ${trackMessage.startsWith('Error') ? 'bg-red-500' : 'bg-green-500'}`}>
            {trackMessage}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
