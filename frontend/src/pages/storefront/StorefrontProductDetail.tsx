import React, { useEffect, useState } from 'react';
import { ShoppingBag, ArrowLeft, Star, Check, Truck, ShieldCheck, Heart, RefreshCw } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { CatalogProduct, ProductVariantBrief } from '../../types/ecommerce';

export function StorefrontProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantBrief | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        const res = await storefrontApi.getProductDetail(slug);
        const p = res.data;
        setProduct(p);
        if (p.variants && p.variants.length > 0) {
          setSelectedVariant(p.variants[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    const variantId = selectedVariant ? selectedVariant.id : product.variants?.[0]?.id;
    if (!variantId) {
      alert('Product variant not selected');
      return;
    }
    try {
      setAdding(true);
      await storefrontApi.addToCart('MAIN', {
        product_variant_id: variantId,
        quantity,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add item to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/store/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center space-y-4">
        <div className="text-xl font-bold text-slate-800">Product not found</div>
        <Link to="/store/catalog" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariant ? selectedVariant.selling_price : product.selling_price;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store/catalog" className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>
          <Link to="/store/cart" className="p-2 rounded-full bg-emerald-50 text-emerald-700">
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
          {/* Product Media */}
          <div className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200/80 overflow-hidden">
            <div className="text-6xl font-black text-slate-300">
              {product.name.charAt(0)}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                {product.category_name || 'Authentic Product'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-slate-900">
                  ৳{Number(currentPrice).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 font-medium">VAT Inclusive</span>
              </div>

              {product.short_description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {product.short_description}
                </p>
              )}

              {/* Variants */}
              {(product.variants || []).length > 1 && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Select Variant</label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants?.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          selectedVariant?.id === v.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {v.variant_name || v.sku}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-slate-800">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  {added ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingBag className="w-4 h-4" />}
                  {added ? 'Added to Cart' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-600/20"
                >
                  Buy Now
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" /> Cash on delivery available across all 64 districts
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> 7 days hassle-free return and exchange guarantee
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
export default StorefrontProductDetail;
