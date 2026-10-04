import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Trash2, Barcode as BarcodeIcon, AlertCircle } from 'lucide-react';
import { Barcode, BarcodeType, ProductVariant } from '../../types/product';
import { getBarcodes, createBarcode, setPrimaryBarcode, deleteBarcode } from '../../api/products';
import { useLanguage } from '../../i18n';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
  productName?: string;
  onUpdated?: () => void;
}

export function BarcodeModal({ isOpen, onClose, variant, productName, onUpdated }: BarcodeModalProps) {
  const { t } = useLanguage();
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBarcode, setNewBarcode] = useState('');
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('EAN');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && variant?.id) {
      loadBarcodes();
    } else {
      setBarcodes([]);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, variant]);

  const loadBarcodes = async () => {
    if (!variant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBarcodes({ product_variant_id: variant.id });
      setBarcodes(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load barcodes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant?.id || !newBarcode.trim()) return;
    setError(null);
    setSuccessMsg(null);

    try {
      await createBarcode({
        product_variant_id: variant.id,
        barcode: newBarcode.trim(),
        barcode_type: barcodeType,
        is_primary: isPrimary || barcodes.length === 0,
      });
      setNewBarcode('');
      setIsPrimary(false);
      setSuccessMsg(t('products.barcodeAdded'));
      loadBarcodes();
      onUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register barcode. Duplicate barcodes are not allowed.');
    }
  };

  const handleSetPrimary = async (barcodeId: number) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await setPrimaryBarcode(barcodeId);
      setSuccessMsg(t('products.primaryUpdated'));
      loadBarcodes();
      onUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set primary barcode.');
    }
  };

  const handleDeleteBarcode = async (barcodeId: number) => {
    if (!confirm(t('products.confirmRemoveBarcode'))) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteBarcode(barcodeId);
      setSuccessMsg(t('products.barcodeRemoved'));
      loadBarcodes();
      onUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete barcode.');
    }
  };

  if (!isOpen || !variant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t('products.barcodeModalTitle')}</h3>
              <p className="text-xs text-slate-500">
                {productName ? `${productName} — ` : ''}{variant.variant_name} ({variant.sku})
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

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Existing Barcodes List */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t('products.registeredBarcodes')}
            </h4>
            {loading ? (
              <div className="text-center py-4 text-xs text-slate-400">{t('common.loading')}</div>
            ) : barcodes.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                {t('products.noBarcodes')}
              </div>
            ) : (
              <div className="space-y-2">
                {barcodes.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BarcodeIcon className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-800">{b.barcode}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                            {b.barcode_type}
                          </span>
                          {b.is_primary && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                              {t('products.primary')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!b.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(b.id)}
                          title="Set as Primary Barcode"
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {t('products.makePrimary')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBarcode(b.id)}
                        title="Delete Barcode"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Barcode */}
          <form onSubmit={handleAddBarcode} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('products.addBarcode')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <input
                  type="text"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  placeholder={t('products.barcodePlaceholder')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <div className="md:col-span-5">
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value as BarcodeType)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EAN">EAN (GTIN-13)</option>
                  <option value="UPC">UPC-A</option>
                  <option value="Internal">Internal POS</option>
                  <option value="Supplier">Supplier SKU</option>
                  <option value="Other">Other Format</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t('products.setAsPrimary')}</span>
              </label>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('products.addBarcode')}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
