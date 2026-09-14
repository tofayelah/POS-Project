import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, User, CreditCard, X, Pause, Play, Printer, Banknote } from 'lucide-react';
// Assuming we have simple state management or we can just use local state for POS

export function PosTerminal() {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcode, setBarcode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount and after actions
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // API call to lookup barcode
      setBarcode('');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Area - Products & Cart */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-200">
        <div className="p-4 bg-white border-b border-slate-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products, SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 relative">
            <input 
              ref={barcodeInputRef}
              type="text" 
              placeholder="Scan Barcode..."
              className="w-full px-4 py-2 bg-slate-800 text-white border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeScan}
            />
          </div>
        </div>
        
        {/* Cart Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg">Cart is empty</p>
              <p className="text-sm">Scan a barcode or search for products</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cart Items will render here */}
            </div>
          )}
        </div>
      </div>

      {/* Right Area - Summary & Payment */}
      <div className="w-[400px] bg-white flex flex-col h-full">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-700 bg-slate-100 p-3 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
            <User className="w-5 h-5" />
            <span className="font-medium">Walk-in Customer</span>
          </div>
        </div>
        
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium">৳ 0.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Discount</span>
            <span className="font-medium text-rose-500">-৳ 0.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span className="font-medium">৳ 0.00</span>
          </div>
          <div className="flex justify-between text-2xl font-bold text-slate-900 pt-3 border-t border-slate-100">
            <span>Total</span>
            <span>৳ 0.00</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
           {/* Payment Methods */}
           <h3 className="font-medium text-slate-900 mb-3">Payment</h3>
           <div className="grid grid-cols-2 gap-2 mb-4">
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors">
                <Banknote className="w-5 h-5" />
                <span>Cash</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors">
                <CreditCard className="w-5 h-5" />
                <span>Card</span>
              </button>
           </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex gap-2">
            <button className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <Pause className="w-4 h-4" />
              Hold
            </button>
            <button className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
          <button className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" />
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
}
