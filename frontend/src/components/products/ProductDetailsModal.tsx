import { useState, useEffect } from 'react';
import {
  X,
  Package,
  Layers,
  Barcode as BarcodeIcon,
  Tag,
  Calendar,
  AlertCircle,
  Edit2,
  CheckCircle,
  Percent,
} from 'lucide-react';
import { Product } from '../../types/product';
import { getProduct } from '../../api/products';
import { StatusBadge } from '../common/StatusBadge';
import { LoadingState } from '../common/LoadingState';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useLanguage } from '../../i18n';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number | null;
  onEdit?: (id: number) => void;
}

export function ProductDetailsModal({
  isOpen,
  onClose,
  productId,
  onEdit,
}: ProductDetailsModalProps) {
  const { t } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      loadProductDetails(productId);
    } else {
      setProduct(null);
      setError(null);
    }
  }, [isOpen, productId]);

  const loadProductDetails = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProduct(id);
      setProduct(res.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {product?.name || t('products.productDetails')}
                </h3>
                {product && <StatusBadge status={product.status} />}
                {product && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      product.product_type === 'variable'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {product.product_type === 'variable'
                      ? t('products.typeVariable')
                      : t('products.typeSimple')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {product?.product_code ? `Code: ${product.product_code}` : 'No Product Code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {loading ? (
            <LoadingState message={t('common.loading')} />
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : !product ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {t('common.noData')}
            </div>
          ) : (
            <>
              {/* Classification & Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('products.category')}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                    {product.category?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('products.brand')}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                    {product.brand?.name || t('products.unbranded')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('products.unit')}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-semibold text-slate-800">
                      {product.unit?.name || '—'} ({product.unit?.short_code})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {product.unit?.decimal_allowed
                      ? t('products.decimalAllowedNotice')
                      : t('products.decimalNotAllowedNotice')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t('products.reorderLevel')}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                    {product.reorder_level}
                  </span>
                </div>
              </div>

              {/* Pricing, Tax, and Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t('products.pricingAndTax')}</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t('products.taxRate')}</span>
                      <span className="font-semibold text-slate-800">{product.tax_rate}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t('products.taxType')}</span>
                      <span className="font-semibold text-slate-800 capitalize">{product.tax_type}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Audit Timestamps</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Created</span>
                      <span className="font-medium text-slate-700 text-[11px]">
                        {formatDateTime(product.created_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Last Updated</span>
                      <span className="font-medium text-slate-700 text-[11px]">
                        {formatDateTime(product.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="p-4 border border-slate-200 rounded-xl space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('products.description')}
                  </h4>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              {/* Variants and SKUs Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{t('products.variantsAndSkus')}</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {product.variants?.length || 0}
                    </span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {product.variants?.map((v) => (
                    <div key={v.id || v.sku} className="p-4 bg-white hover:bg-slate-50/50 transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{v.variant_name}</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                              SKU: {v.sku}
                            </span>
                            <StatusBadge status={v.status} />
                          </div>
                          {v.attribute_values && v.attribute_values.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {v.attribute_values.map((av) => (
                                <span
                                  key={av.id}
                                  className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium"
                                >
                                  {av.attribute_name ? `${av.attribute_name}: ` : ''}
                                  {av.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pricing details in Bangladeshi Taka (৳) */}
                        <div className="flex items-center gap-3 text-xs flex-wrap sm:justify-end">
                          <div>
                            <span className="text-[10px] text-slate-400 block">{t('products.costPrice')}</span>
                            <span className="font-mono font-medium text-slate-600">
                              {formatCurrency(v.cost_price)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">{t('products.sellingPrice')}</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {formatCurrency(v.selling_price)}
                            </span>
                          </div>
                          {v.wholesale_price !== undefined && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">{t('products.wholesalePrice')}</span>
                              <span className="font-mono font-medium text-slate-600">
                                {formatCurrency(v.wholesale_price)}
                              </span>
                            </div>
                          )}
                          {v.mrp !== undefined && (
                            <div>
                              <span className="text-[10px] text-slate-400 block">{t('products.mrp')}</span>
                              <span className="font-mono font-medium text-slate-600">
                                {formatCurrency(v.mrp)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Barcodes */}
                      {v.barcodes && v.barcodes.length > 0 ? (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <BarcodeIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] text-slate-400 font-medium">Barcodes:</span>
                          {v.barcodes.map((b) => (
                            <div
                              key={b.id || b.barcode}
                              className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
                                b.is_primary
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              <span>{b.barcode}</span>
                              <span className="text-[9px] uppercase opacity-75">({b.barcode_type})</span>
                              {b.is_primary && (
                                <span className="text-[9px] bg-blue-600 text-white px-1 rounded uppercase tracking-wider">
                                  {t('products.primary')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic pt-1">
                          {t('products.noBarcodes')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {t('common.close')}
          </button>
          {product && onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(product.id);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t('products.editProduct')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
