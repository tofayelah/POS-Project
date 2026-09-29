import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Check, AlertCircle } from 'lucide-react';
import { posApi, PosProductVariant } from '../../api/pos';

interface PosProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: PosProductVariant) => void;
}

export const PosProductSearchModal: React.FC<PosProductSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<PosProductVariant[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setProducts([]);
      setSelectedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
        loadInitialProducts();
      }, 50);
    }
  }, [isOpen]);

  const loadInitialProducts = async () => {
    try {
      setLoading(true);
      const res = await posApi.searchProducts('');
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    try {
      setLoading(true);
      const res = await posApi.searchProducts(searchTerm);
      if (res.success && res.data) {
        setProducts(res.data);
        setSelectedIndex(0);
      }
    } catch (err) {
      console.error('Failed to search products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (products.length > 0 && products[selectedIndex]) {
        onSelectProduct(products[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[85vh] border border-slate-300"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-sm tracking-wide">Product Search & Catalog [F3]</h2>
            <span className="text-xs text-slate-400 font-mono">Use ↑ / ↓ to navigate, Enter to select, Esc to close</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by Product Name, SKU, Barcode, or Category..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-md font-medium text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
            />
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              Searching catalog...
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No matching products found</p>
              <p className="text-xs mt-1">Try another search keyword or verify the SKU / Barcode</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-200/80 sticky top-0 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {products.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const primaryBarcode = item.barcodes?.find((b) => b.is_primary)?.barcode || item.barcodes?.[0]?.barcode || '-';
                  const stock = item.available_stock ?? 0;
                  const price = Number(item.selling_price || item.mrp || 0);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        onSelectProduct(item);
                        onClose();
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-100 font-semibold ring-1 ring-blue-500 text-blue-900'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-900">{item.sku}</td>
                      <td className="py-2 px-3 text-slate-600">{primaryBarcode}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className="font-semibold">{item.product?.name || item.variant_name}</span>
                        {item.variant_name && item.variant_name !== item.sku && (
                          <span className="text-[11px] text-slate-500 ml-1.5">({item.variant_name})</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-600">
                        {item.product?.category?.name || 'General'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            stock > 10
                              ? 'bg-emerald-100 text-emerald-800'
                              : stock > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {stock.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ৳ {price.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-sans font-bold text-[11px] transition-colors shadow-xs"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-300 flex justify-between items-center text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{products.length}</span> items
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded transition-colors"
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
