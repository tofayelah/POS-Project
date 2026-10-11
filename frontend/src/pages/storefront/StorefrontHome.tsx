import React from 'react';
import { Store, ShoppingBag } from 'lucide-react';

export const StorefrontHome: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <div className="bg-indigo-600 text-white rounded-2xl p-8 text-center space-y-3">
      <h1 className="text-3xl font-extrabold">Welcome to RetailCore Online Store</h1>
      <p className="text-indigo-100 text-sm">Discover top quality products directly from our catalog</p>
    </div>
  </div>
);

export const StorefrontCatalog: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Catalog & Products</h1>
  </div>
);

export const StorefrontProductDetail: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Product Details</h1>
  </div>
);

export const StorefrontCart: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Shopping Cart</h1>
  </div>
);

export const StorefrontCheckout: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Checkout</h1>
  </div>
);

export const StorefrontAccount: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Customer Account</h1>
  </div>
);

export const StorefrontOrderTracking: React.FC = () => (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">Track Your Order</h1>
  </div>
);

export const StorefrontAuth: React.FC = () => (
  <div className="p-6 max-w-md mx-auto space-y-6">
    <h1 className="text-2xl font-bold text-center">Storefront Login / Signup</h1>
  </div>
);
