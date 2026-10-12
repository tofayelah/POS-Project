import React, { useState, useEffect } from 'react';
import { Info, ArrowLeft, Barcode as BarcodeIcon, Layers, Tag, Scale, AlertCircle, Edit, CheckCircle, XCircle, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { getProduct } from '../../api/products';
import api from '../../api/axios';
import { Product } from '../../types/product';

export const ItemInformation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('id');

  const [product, setProduct] = useState<Product | null>(null);
  const [inventoryStock, setInventoryStock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      loadDetails(Number(productId));
    } else {
      setError('No product ID provided.');
      setIsLoading(false);
    }
  }, [productId]);

  const loadDetails = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getProduct(id);
      if (res.success && res.data) {
        setProduct(res.data);
      }

      // Load total stock across warehouses
      try {
        const invRes = await api.get('/inventory', { params: { product_id: id } });
        if (invRes.data?.data) {
          const items = invRes.data.data;
          const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.quantity_on_hand || item.available_quantity || 0), 0);
          setInventoryStock(totalQty);
        }
      } catch (invErr) {
        console.warn('Inventory stock retrieval fallback', invErr);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        Loading product master details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error || 'Product record not found.'}</span>
        </div>
      </div>
    );
  }

  const variants = product.variants || [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Info className="w-6 h-6 text-indigo-600" />
              Item Master Details
            </h1>
            <p className="text-sm text-slate-500">Comprehensive overview of SKU, barcodes, tax rates, reorder thresholds, and stock</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/products/${product.id}/edit`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
        >
          <Edit className="w-4 h-4" /> Edit Master
        </button>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Product Identity Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="w-full h-36 bg-slate-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-4xl">
            {product.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-xs text-slate-500 font-mono mt-1">Code: {product.product_code || 'N/A'}</p>
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-900">{product.category?.name || 'General'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Brand:</span>
              <span className="font-semibold text-slate-900">{product.brand?.name || 'Generic'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unit of Measure:</span>
              <span className="font-semibold text-slate-900">{product.unit?.name || 'Piece'} ({product.unit?.short_code || 'pcs'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Structure:</span>
              <span className="font-semibold uppercase text-indigo-700 text-xs">{product.product_type} ({variants.length} SKUs)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Default VAT / Tax Rate:</span>
              <span className="font-semibold text-slate-900">{product.tax_rate}% ({product.tax_type})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                product.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {product.status}
              </span>
            </div>
          </div>
        </div>

        {/* Right Columns: Stock Summary & Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Stock Metrics Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Inventory & Reorder Status
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Total Current Stock</span>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {inventoryStock} <span className="text-sm font-normal text-indigo-700">{product.unit?.short_code || 'pcs'}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Reorder Threshold</span>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {product.reorder_level || 0} <span className="text-sm font-normal text-amber-700">{product.unit?.short_code || 'pcs'}</span>
                </p>
              </div>
            </div>

            {product.description && (
              <div className="pt-2 text-xs text-slate-600">
                <span className="font-bold text-slate-700">Description: </span>
                {product.description}
              </div>
            )}
          </div>

          {/* Variant Master Table */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Sellable Variants Matrix ({variants.length} SKUs)
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                    <th className="py-2.5 px-3 font-semibold">SKU Code</th>
                    <th className="py-2.5 px-3 font-semibold">Variant Name</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Cost (৳)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Selling (৳)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Wholesale (৳)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">MRP (৳)</th>
                    <th className="py-2.5 px-3 font-semibold">Barcodes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {variants.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono font-semibold text-indigo-700">{v.sku}</td>
                      <td className="p-2.5 text-slate-800 font-medium">{v.variant_name || 'Default'}</td>
                      <td className="p-2.5 text-right font-mono">৳{Number(v.cost_price || 0).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">৳{Number(v.selling_price || 0).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">৳{Number(v.wholesale_price || v.selling_price || 0).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">৳{Number(v.mrp || v.selling_price || 0).toFixed(2)}</td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {v.barcodes && v.barcodes.length > 0 ? (
                          v.barcodes.map((b: any) => (
                            <span key={b.id || b.barcode} className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[11px] mr-1">
                              {b.barcode}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
