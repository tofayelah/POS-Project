import React, { useEffect, useState } from 'react';
import { ShoppingBag, ArrowRight, Star, ShieldCheck, Truck, Headphones, Search, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { storefrontApi } from '../../api/storefront';
import { CatalogProduct, EcommerceStore } from '../../types/ecommerce';

export function StorefrontHome() {
  const navigate = useNavigate();
  const [store, setStore] = useState<EcommerceStore | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<CatalogProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [storeRes, featRes, newRes] = await Promise.all([
          storefrontApi.getStoreInfo(),
          storefrontApi.getProducts('MAIN', { featured: true, per_page: 8 }),
          storefrontApi.getProducts('MAIN', { new_arrival: true, per_page: 8 }),
        ]);
        setStore(storeRes.data);
        setFeaturedProducts(featRes.data.data);
        setNewArrivals(newRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/store/catalog?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Storefront Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/store" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              R
            </div>
            <span className="font-extrabold text-xl text-slate-800 tracking-tight">
              {store?.name || 'RetailCore Store'}
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:flex">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products across Bangladesh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-full text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </form>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/store/catalog" className="text-slate-600 hover:text-emerald-600 transition-colors">
              Catalog
            </Link>
            <Link to="/store/track" className="text-slate-600 hover:text-emerald-600 transition-colors hidden sm:block">
              Track Order
            </Link>
            <Link to="/store/cart" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
            </Link>
            <Link to="/store/account" className="text-slate-600 hover:text-emerald-600 transition-colors">
              Account
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Nationwide Express Delivery • Cash On Delivery
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {store?.settings?.hero_title || 'Authentic Products, Express Delivery'}
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base">
            {store?.settings?.hero_subtitle || 'Shop high quality items across Bangladesh with cash on delivery, bKash, and instant return guarantee.'}
          </p>
          <div className="pt-2">
            <Link
              to="/store/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-slate-900 font-bold hover:bg-emerald-400 transition-all shadow-lg hover:shadow-emerald-500/25"
            >
              Browse Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-b border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Truck className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-xs text-slate-800">Nationwide Delivery</div>
              <div className="text-[11px] text-slate-400">All 64 districts in BD</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-xs text-slate-800">100% Authentic</div>
              <div className="text-[11px] text-slate-400">Direct from warehouse</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-xs text-slate-800">Cash On Delivery</div>
              <div className="text-[11px] text-slate-400">Pay when receiving</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Headphones className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <div className="font-bold text-xs text-slate-800">Dedicated Support</div>
              <div className="text-[11px] text-slate-400">{store?.settings?.support_phone || 'Call hotline'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Featured Collections</h2>
              <p className="text-xs text-slate-400">Hand-picked top quality products</p>
            </div>
            <Link to="/store/catalog" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                to={`/store/products/${p.slug}`}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  <div className="text-3xl font-extrabold text-slate-300">
                    {p.name.charAt(0)}
                  </div>
                  {p.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">{p.category_name || 'Item'}</span>
                    <h3 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-600 transition-colors">
                      {p.name}
                    </h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-extrabold text-base text-slate-900">
                      ৳{Number(p.selling_price).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 group-hover:underline">
                      Buy Now
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-semibold text-slate-300">
            {store?.name || 'RetailCore Store'} — Seamless Omnichannel Commerce
          </p>
          <p>© 2026 RetailCore POS_ERP. Built with Bangladesh VAT & Tax Compliance.</p>
        </div>
      </footer>
    </div>
  );
}
export default StorefrontHome;
