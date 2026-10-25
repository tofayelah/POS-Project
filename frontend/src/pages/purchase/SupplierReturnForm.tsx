import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Save, Plus, Trash2, FileText, CheckCircle, AlertCircle, 
  Search, Barcode, RefreshCw, Printer, X, Eye, ShieldCheck, 
  Building2, DollarSign, Calculator, Layers, Sparkles, Database,
  DownloadCloud, HelpCircle, Check, ArrowDownLeft, RotateCcw, ArrowUpRight
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router';
import { getSuppliers } from '../../api/suppliers';
import { getProducts } from '../../api/products';
import { getPurchases, getPurchase } from '../../api/purchases';
import { 
  getSupplierReturns, 
  getSupplierReturn, 
  createSupplierReturn, 
  updateSupplierReturn, 
  generateNextSupplierReturnNumber 
} from '../../api/supplierReturns';
import { Supplier } from '../../types/supplier';
import { Product } from '../../types/product';
import { PurchaseInvoice, SupplierReturn, SupplierReturnItem } from '../../types/purchase';
import { useCompany } from '../../contexts/CompanyContext';
import { SupplierReturnPrintModal } from '../../components/purchase/SupplierReturnPrintModal';

export const SupplierReturnForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const linkedInvoiceParam = searchParams.get('invoice_id');
  const { company: activeCompany } = useCompany();

  // Master Data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  // Return Form State
  const [returnNumber, setReturnNumber] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [returnStatus, setReturnStatus] = useState<'DRAFT' | 'POSTED'>('POSTED');
  const [warehouseName, setWarehouseName] = useState<string>('Central Warehouse (WH-01)');
  const [notes, setNotes] = useState<string>('');

  // Supplier Context
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Purchase Reference Mode
  const [returnSourceMode, setReturnSourceMode] = useState<'INVOICE' | 'DIRECT'>('INVOICE');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [isLoadingInvoiceItems, setIsLoadingInvoiceItems] = useState(false);
  const [invoiceLoadMessage, setInvoiceLoadMessage] = useState<string | null>(null);

  // Line Items
  const [lineItems, setLineItems] = useState<SupplierReturnItem[]>([]);
  const [generalReason, setGeneralReason] = useState<string>('DEFECTIVE');

  // Settlement Mode
  const [settlementType, setSettlementType] = useState<
    'PAYABLE_ADJUSTMENT' | 'CASH_REFUND' | 'BANK_REFUND' | 'STORE_CREDIT'
  >('PAYABLE_ADJUSTMENT');
  const [taxAmount, setTaxAmount] = useState<number>(0);

  // Product Catalog Search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activePrintRecord, setActivePrintRecord] = useState<SupplierReturn | null>(null);

  // Feedback & Validation
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function extractSupplierList(raw: any): Supplier[] {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  }

  function getProductCost(prod: any): number {
    if (prod?.cost_price !== undefined) return Number(prod.cost_price);
    if (prod?.variants && prod.variants[0]?.cost_price !== undefined) return Number(prod.variants[0].cost_price);
    if (prod?.price !== undefined) return Number(prod.price);
    return 0;
  }

  function getProductBarcode(prod: any): string {
    if (prod?.barcode) return String(prod.barcode);
    if (prod?.variants && prod.variants[0]?.barcode) return String(prod.variants[0].barcode);
    return '';
  }

  // Load Master Data
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingMasterData(true);
      try {
        const [supRes, prodRes, invRes] = await Promise.all([
          getSuppliers({ per_page: 100 }),
          getProducts({ per_page: 200 }),
          getPurchases({ per_page: 100 }),
        ]);

        const loadedSuppliers = extractSupplierList(supRes.data);
        setSuppliers(loadedSuppliers);
        setProducts(prodRes.data || []);
        setPurchaseInvoices(invRes.data || []);

        if (id) {
          // Editing existing return
          const existingRes = await getSupplierReturn(id);
          const ext = existingRes.data;
          setReturnNumber(ext.return_number || '');
          setReturnDate(ext.return_date || new Date().toISOString().split('T')[0]);
          setReturnStatus(ext.status === 'POSTED' ? 'POSTED' : 'DRAFT');
          const rawSupId = ext.supplier_id != null && !Number.isNaN(Number(ext.supplier_id)) ? Number(ext.supplier_id) : '';
          setSelectedSupplierId(rawSupId);
          if (rawSupId !== '') {
            const matchSup = loadedSuppliers.find((s) => Number(s.id) === Number(rawSupId));
            if (matchSup) setSelectedSupplier(matchSup);
          }
          setSelectedInvoiceId(ext.purchase_invoice_id ? String(ext.purchase_invoice_id) : '');
          setSelectedInvoiceNumber(ext.purchase_invoice_number || '');
          setSupplierInvoiceNumber(ext.supplier_invoice_number || '');
          setWarehouseName(ext.warehouse_name || 'Central Warehouse (WH-01)');
          setSettlementType(ext.settlement_type || 'PAYABLE_ADJUSTMENT');
          setNotes(ext.notes || '');
          setGeneralReason(ext.return_reason_general || 'DEFECTIVE');
          setTaxAmount(ext.tax_amount != null && !Number.isNaN(Number(ext.tax_amount)) ? Number(ext.tax_amount) : 0);
          setLineItems(
            Array.isArray(ext.items)
              ? ext.items.map((it: any, i: number) => ({
                  ...it,
                  id: it.id || `ret-item-${i}`,
                  return_rate: it.return_rate != null && !Number.isNaN(Number(it.return_rate)) ? Number(it.return_rate) : 0,
                  return_qty: it.return_qty != null && !Number.isNaN(Number(it.return_qty)) ? Number(it.return_qty) : 1,
                  line_total: it.line_total != null && !Number.isNaN(Number(it.line_total)) ? Number(it.line_total) : 0,
                  reason_detail: it.reason_detail || '',
                }))
              : []
          );
          if (ext.purchase_invoice_id) {
            setReturnSourceMode('INVOICE');
          } else {
            setReturnSourceMode('DIRECT');
          }
        } else {
          // New Return Voucher
          setReturnNumber(generateNextSupplierReturnNumber());
          // Check if invoice_id was passed via query parameter
          if (linkedInvoiceParam) {
            setSelectedInvoiceId(linkedInvoiceParam);
            await importInvoiceItemsById(linkedInvoiceParam, loadedSuppliers);
          }
        }
      } catch (err: any) {
        console.error('Error loading master data:', err);
        setErrorMessage('Failed to load suppliers or products list.');
      } finally {
        setIsLoadingMasterData(false);
      }
    }

    loadInitialData();
  }, [id, linkedInvoiceParam]);

  // Update selected supplier object when ID changes
  const handleSupplierChange = (supId: number | '') => {
    setSelectedSupplierId(supId);
    if (!supId) {
      setSelectedSupplier(null);
      return;
    }
    const match = suppliers.find((s) => Number(s.id) === Number(supId));
    setSelectedSupplier(match || null);
  };

  // Filtered invoices for the selected supplier
  const availableInvoices = useMemo(() => {
    if (!selectedSupplierId) return purchaseInvoices;
    return purchaseInvoices.filter((inv) => Number(inv.supplier_id) === Number(selectedSupplierId));
  }, [purchaseInvoices, selectedSupplierId]);

  // Import items from a purchase invoice
  const importInvoiceItemsById = async (invoiceId: string, currentSuppliersList = suppliers) => {
    if (!invoiceId) return;
    setIsLoadingInvoiceItems(true);
    setInvoiceLoadMessage(null);
    setErrorMessage(null);

    try {
      const invData = await getPurchase(invoiceId);
      const inv = invData.data;

      // Match supplier
      if (inv.supplier_id) {
        setSelectedSupplierId(Number(inv.supplier_id));
        const matchSup = currentSuppliersList.find((s) => Number(s.id) === Number(inv.supplier_id));
        if (matchSup) setSelectedSupplier(matchSup);
      }

      setSelectedInvoiceNumber(inv.invoice_number);
      if (inv.supplier_invoice_number) {
        setSupplierInvoiceNumber(inv.supplier_invoice_number);
      }

      // Check if invoice has line items
      let loadedItems: SupplierReturnItem[] = [];
      const anyInv = inv as any;
      if (Array.isArray(anyInv.items) && anyInv.items.length > 0) {
        loadedItems = anyInv.items.map((it: any, idx: number) => {
          const rawCost = Number(it.unit_cost !== undefined ? it.unit_cost : (it.price !== undefined ? it.price : 0));
          const unitCost = Number.isNaN(rawCost) ? 0 : Math.max(0, rawCost);
          const rawQty = Number(it.quantity !== undefined ? it.quantity : 1);
          const qty = Number.isNaN(rawQty) ? 1 : Math.max(1, rawQty);
          return {
            id: `ret-item-${Date.now()}-${idx}`,
            product_id: Number(it.product_id || 1),
            product_variant_id: it.product_variant_id ? Number(it.product_variant_id) : undefined,
            product_name: it.product_name || (it.product && it.product.name) || 'Product Item',
            sku: it.sku || (it.product && it.product.sku) || `SKU-${idx + 1}`,
            barcode: it.barcode || (it.product && it.product.barcode) || '',
            unit_name: it.unit_name || it.purchase_unit || 'Pcs',
            original_quantity: qty,
            original_unit_cost: unitCost,
            return_rate: unitCost,
            return_qty: qty, // Default to returning all; user can decrease
            reason: (generalReason as any) || 'DEFECTIVE',
            reason_detail: `Returned from invoice ${inv.invoice_number}`,
            line_total: Number((unitCost * qty).toFixed(2)),
          };
        });
      } else {
        // Invoice without embedded items, use default seed product for demo
        const defaultProd = products[0] || {
          id: 1,
          name: 'Napa Extra 500mg/65mg Paracetamol + Caffeine Tablet',
          sku: 'MED-NAP-EXT-01',
          barcode: '890123456001',
          unit: 'Box (100 Tabs)',
          cost_price: 225.0,
        };
        const rawDefaultCost = getProductCost(defaultProd) || 225;
        const defaultCost = Number.isNaN(rawDefaultCost) ? 225 : Math.max(0, rawDefaultCost);
        const estQty = Math.max(1, Math.round(Number(inv.grand_total || 1000) / (defaultCost || 1)));
        loadedItems = [
          {
            id: `ret-item-${Date.now()}-0`,
            product_id: Number(defaultProd.id),
            product_name: defaultProd.name,
            sku: defaultProd.sku || 'SKU-001',
            barcode: getProductBarcode(defaultProd),
            unit_name: (defaultProd as any).unit || 'Pcs',
            original_quantity: estQty,
            original_unit_cost: defaultCost,
            return_rate: defaultCost,
            return_qty: 1,
            reason: (generalReason as any) || 'DEFECTIVE',
            reason_detail: `Imported from ${inv.invoice_number}`,
            line_total: defaultCost * 1,
          },
        ];
      }

      setLineItems(loadedItems);
      setInvoiceLoadMessage(
        `Successfully loaded ${loadedItems.length} product(s) from ${inv.invoice_number}. You can adjust return quantities, modify return rates, or delete unwanted lines.`
      );
    } catch (err: any) {
      console.warn('Failed to load purchase invoice items:', err);
      setErrorMessage(`Failed to load items from invoice #${invoiceId}: ${err?.message || ''}`);
    } finally {
      setIsLoadingInvoiceItems(false);
    }
  };

  // Add Product from Catalog
  const handleAddCatalogProduct = (prod: Product) => {
    const existingIndex = lineItems.findIndex((it) => Number(it.product_id) === Number(prod.id));
    if (existingIndex >= 0) {
      // Increase qty by 1
      const updated = [...lineItems];
      const item = updated[existingIndex];
      const newQty = item.return_qty + 1;
      updated[existingIndex] = {
        ...item,
        return_qty: newQty,
        line_total: Number((newQty * item.return_rate).toFixed(2)),
      };
      setLineItems(updated);
    } else {
      const unitCost = getProductCost(prod);
      const newItem: SupplierReturnItem = {
        id: `ret-custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: Number(prod.id),
        product_name: prod.name,
        sku: prod.sku || '',
        barcode: getProductBarcode(prod),
        unit_name: (prod as any).unit || 'Pcs',
        original_quantity: 1,
        original_unit_cost: unitCost,
        return_rate: unitCost,
        return_qty: 1,
        reason: (generalReason as any) || 'DEFECTIVE',
        reason_detail: '',
        line_total: unitCost,
      };
      setLineItems((prev) => [...prev, newItem]);
    }
    setCatalogSearch('');
    setIsCatalogOpen(false);
  };

  // Barcode quick add
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const match = products.find(
      (p) =>
        getProductBarcode(p).toLowerCase() === barcodeInput.trim().toLowerCase() ||
        p.sku?.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (match) {
      handleAddCatalogProduct(match);
      setBarcodeInput('');
    } else {
      alert(`No product found matching barcode/SKU "${barcodeInput}"`);
    }
  };

  // Modify item fields
  const handleItemQtyChange = (index: number, newQty: number) => {
    const num = Number.isNaN(newQty) ? 0 : newQty;
    const safeQty = Math.max(0, num);
    setLineItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const currentRate = Number.isNaN(Number(it.return_rate)) ? 0 : Number(it.return_rate || 0);
        return {
          ...it,
          return_qty: safeQty,
          line_total: Number((safeQty * currentRate).toFixed(2)),
        };
      })
    );
  };

  const handleItemRateChange = (index: number, newRate: number) => {
    const num = Number.isNaN(newRate) ? 0 : newRate;
    const safeRate = Math.max(0, num);
    setLineItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const currentQty = Number.isNaN(Number(it.return_qty)) ? 0 : Number(it.return_qty || 0);
        return {
          ...it,
          return_rate: safeRate,
          line_total: Number((currentQty * safeRate).toFixed(2)),
        };
      })
    );
  };

  const handleItemReasonChange = (index: number, reason: any) => {
    setLineItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return { ...it, reason };
      })
    );
  };

  const handleItemDetailChange = (index: number, reason_detail: string) => {
    setLineItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return { ...it, reason_detail };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Totals calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, it) => acc + (it.line_total || 0), 0);
  }, [lineItems]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + Number(taxAmount || 0));
  }, [subtotal, taxAmount]);

  // Save handler
  const handleSave = async (submitStatus: 'DRAFT' | 'POSTED') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedSupplierId) {
      setErrorMessage('Please select a Supplier before saving the return voucher.');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one product item to return.');
      return;
    }

    // Filter items with 0 return qty
    const activeReturnItems = lineItems.filter((it) => it.return_qty > 0);
    if (activeReturnItems.length === 0) {
      setErrorMessage('All items have a return quantity of 0. Please specify at least 1 unit to return.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        supplier_id: Number(selectedSupplierId),
        return_date: returnDate,
        purchase_invoice_id: selectedInvoiceId ? Number(selectedInvoiceId) : null,
        purchase_invoice_number: selectedInvoiceNumber || null,
        supplier_invoice_number: supplierInvoiceNumber || null,
        warehouse_id: 1,
        warehouse_name: warehouseName,
        settlement_type: settlementType,
        status: submitStatus,
        return_reason_general: generalReason,
        notes: notes,
        subtotal: subtotal,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        items: activeReturnItems,
      };

      let resultRecord: SupplierReturn;
      if (id) {
        const res = await updateSupplierReturn(id, payload);
        resultRecord = res.data;
      } else {
        const res = await createSupplierReturn(payload);
        resultRecord = res.data;
      }

      if (submitStatus === 'POSTED' && settlementType === 'PAYABLE_ADJUSTMENT' && selectedSupplier) {
        const newBal = Number(selectedSupplier.current_balance || 0) - grandTotal;
        const updatedSup: Supplier = {
          ...selectedSupplier,
          current_balance: newBal,
        };
        setSelectedSupplier(updatedSup);
        setSuppliers((prev) => prev.map((s) => (s.id === selectedSupplier.id ? updatedSup : s)));
      }

      setSuccessMessage(
        submitStatus === 'POSTED'
          ? `Supplier Return #${resultRecord.return_number} posted successfully! ৳${grandTotal.toFixed(2)} deducted from Supplier Ledger (Debit Note recorded).`
          : `Supplier Return #${resultRecord.return_number} saved as draft.`
      );

      // Offer printing or navigation
      setActivePrintRecord(resultRecord);

      setTimeout(() => {
        navigate('/purchases/returns');
      }, 1500);
    } catch (err: any) {
      console.error('Error saving supplier return:', err);
      setErrorMessage(err?.message || 'Failed to save supplier return. Please check your inputs.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter catalog for search dropdown
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return [];
    const term = catalogSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          getProductBarcode(p).toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [catalogSearch, products]);

  // Construct print voucher data
  const currentPreviewData: SupplierReturn = useMemo(() => {
    return {
      id: id || 'preview',
      return_number: returnNumber || 'PRET-2026-PREVIEW',
      return_date: returnDate,
      supplier_id: selectedSupplierId || 0,
      supplier_name: selectedSupplier?.name || 'Selected Supplier',
      supplier: selectedSupplier || undefined,
      purchase_invoice_id: selectedInvoiceId ? Number(selectedInvoiceId) : null,
      purchase_invoice_number: selectedInvoiceNumber || null,
      supplier_invoice_number: supplierInvoiceNumber || null,
      warehouse_name: warehouseName,
      status: returnStatus,
      settlement_type: settlementType,
      return_reason_general: generalReason,
      subtotal: subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      notes: notes,
      items: lineItems.filter((i) => i.return_qty > 0),
    };
  }, [
    id, returnNumber, returnDate, selectedSupplierId, selectedSupplier,
    selectedInvoiceId, selectedInvoiceNumber, supplierInvoiceNumber,
    warehouseName, returnStatus, settlementType, generalReason,
    subtotal, taxAmount, grandTotal, notes, lineItems
  ]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/purchases/returns')}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Back to Supplier Returns List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                Purchase Return / Debit Note
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {returnNumber || 'PRET-AUTO'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {id ? 'Edit Supplier Return' : 'New Supplier Return (Debit Note)'}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Return purchased products back to supplier and adjust payables or claim refund
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActivePrintRecord(currentPreviewData);
              setShowPrintModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print A4 Debit Note
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('DRAFT')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-sm font-bold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-700" />
            Save Draft
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('POSTED')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors shadow-xs cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            {isSaving ? 'Processing...' : 'Post & Finalize Return'}
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-medium flex items-center gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-medium flex items-center gap-3 shadow-2xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Context & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Supplier & Source Purchase Invoice */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-rose-600" />
                1. Supplier & Purchase Document Source
              </h2>
              <span className="text-xs text-slate-500 font-medium">Step 1 of 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  value={
                    selectedSupplierId !== '' &&
                    selectedSupplierId !== undefined &&
                    !Number.isNaN(Number(selectedSupplierId))
                      ? selectedSupplierId
                      : ''
                  }
                  onChange={(e) => handleSupplierChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="">-- Choose a Supplier --</option>
                  {suppliers.map((sup, idx) => (
                    <option key={`sup-opt-${sup.id ?? idx}-${idx}`} value={sup.id}>
                      {sup.name} ({sup.supplier_code || `ID-${sup.id}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Return Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Return Voucher Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={returnDate || ''}
                  onChange={(e) => setReturnDate(e.target.value || '')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Supplier Quick Balance Card */}
            {selectedSupplier && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedSupplier.name}</p>
                  <p className="text-slate-500 font-mono mt-0.5">
                    Code: {selectedSupplier.supplier_code} | Contact: {selectedSupplier.mobile || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Current Accounts Payable
                  </span>
                  <span className="text-base font-black font-mono text-rose-700">
                    ৳{Number(selectedSupplier.current_balance || 0).toFixed(2)} Due
                  </span>
                </div>
              </div>
            )}

            {/* Return Source Mode: Against Invoice vs Direct */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                How are you returning the products?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReturnSourceMode('INVOICE')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    returnSourceMode === 'INVOICE'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500 text-rose-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      returnSourceMode === 'INVOICE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">From Existing Purchase Bill</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Auto-import products, rates & quantities from a recorded purchase invoice
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnSourceMode('DIRECT')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    returnSourceMode === 'DIRECT'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500 text-rose-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      returnSourceMode === 'DIRECT' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Direct / Ad-hoc Product Return</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search any product from master inventory to return without linking a past bill
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* In Invoice Mode: Select Invoice & Load Items Button */}
            {returnSourceMode === 'INVOICE' && (
              <div className="p-4 bg-rose-50/30 rounded-xl border border-rose-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    Select Purchase Invoice to Return From:
                  </label>
                  {selectedInvoiceNumber && (
                    <span className="text-xs font-mono font-bold text-rose-700">
                      Loaded Ref: {selectedInvoiceNumber}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedInvoiceId || ''}
                    onChange={(e) => setSelectedInvoiceId(e.target.value || '')}
                    className="flex-1 p-2.5 bg-white border border-rose-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">-- Select a Purchase Invoice (Bill) --</option>
                    {availableInvoices.map((inv, idx) => (
                      <option key={`inv-opt-${inv.id ?? idx}-${idx}`} value={inv.id}>
                        {inv.invoice_number} | {inv.supplier_name || 'Supplier'} | ৳{Number(inv.grand_total || inv.total_amount || 0).toFixed(2)} (Date: {inv.invoice_date || 'N/A'})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedInvoiceId || isLoadingInvoiceItems}
                    onClick={() => importInvoiceItemsById(selectedInvoiceId)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    {isLoadingInvoiceItems ? 'Importing...' : 'Load Invoice Products'}
                  </button>
                </div>

                {invoiceLoadMessage && (
                  <p className="text-xs text-emerald-800 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    {invoiceLoadMessage}
                  </p>
                )}
              </div>
            )}

            {/* Warehouse & Reference Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Dispatching Warehouse
                </label>
                <input
                  type="text"
                  value={warehouseName || ''}
                  onChange={(e) => setWarehouseName(e.target.value || '')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900"
                  placeholder="e.g. Central Warehouse"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Supplier Challan / External Ref #
                </label>
                <input
                  type="text"
                  value={supplierInvoiceNumber || ''}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value || '')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900"
                  placeholder="e.g. SCH-9921 or Delivery Note #"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Settlement & Financial Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                2. Settlement & Debit Terms
              </h2>
            </div>

            {/* Settlement Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Refund / Settlement Method <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="settlementType"
                    checked={settlementType === 'PAYABLE_ADJUSTMENT'}
                    onChange={() => setSettlementType('PAYABLE_ADJUSTMENT')}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Debit Note (Adjust Payable)</p>
                    <p className="text-xs text-slate-500">Reduces outstanding debt owed to this supplier</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="settlementType"
                    checked={settlementType === 'CASH_REFUND'}
                    onChange={() => setSettlementType('CASH_REFUND')}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Cash Refund Received</p>
                    <p className="text-xs text-slate-500">Supplier returns cash directly to cashier</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="settlementType"
                    checked={settlementType === 'BANK_REFUND'}
                    onChange={() => setSettlementType('BANK_REFUND')}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">Bank Transfer Refund</p>
                    <p className="text-xs text-slate-500">Deposit credited directly into company bank account</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Supplier Ledger Impact / লেজার থেকে ফেরত মূল্য বাদ */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  Supplier Ledger Settlement (দেনা লেজার সমন্বয়)
                </span>
                {selectedSupplier && (
                  <Link
                    to={`/purchases/suppliers/${selectedSupplier.id}/ledger`}
                    target="_blank"
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline inline-flex items-center gap-1"
                  >
                    View Ledger <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {selectedSupplier ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-medium">1. Supplier Ledger Balance (বর্তমান দেনা):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ৳{Number(selectedSupplier.current_balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-rose-700 font-semibold bg-rose-100/60 px-2.5 py-1.5 rounded-lg border border-rose-200/70">
                    <span>2. Less: Supplier Return Amount (ফেরত মূল্য বাদ):</span>
                    <span className="font-mono font-black text-rose-700">
                      - ৳{grandTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="border-t border-rose-300 pt-2 flex justify-between items-center">
                    <span className="font-bold text-slate-900">
                      3. Adjusted Ledger Balance (সমন্বয়ের পর জের):
                    </span>
                    <span
                      className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                        Number(selectedSupplier.current_balance || 0) - grandTotal >= 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      ৳{(Number(selectedSupplier.current_balance || 0) - grandTotal).toFixed(2)}{' '}
                      <span className="text-[10px] font-bold">
                        {Number(selectedSupplier.current_balance || 0) - grandTotal < 0
                          ? '(Advance Cr)'
                          : '(Due Dr)'}
                      </span>
                    </span>
                  </div>

                  {settlementType === 'PAYABLE_ADJUSTMENT' ? (
                    <p className="text-[11px] text-rose-800 bg-white/80 p-2.5 rounded-lg border border-rose-200 leading-relaxed font-medium">
                      ✓ <strong>লেজার থেকে বাদ যাবে:</strong> এই রিটার্ন ভাউচার পোস্ট করার সাথে সাথে সাপ্লায়ারের মোট দেনা (Accounts Payable) থেকে ৳{grandTotal.toFixed(2)} স্বয়ংক্রিয়ভাবে বাদ (Debit Note) দেওয়া হবে।
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-800 bg-white/80 p-2.5 rounded-lg border border-amber-200 leading-relaxed font-medium">
                      ℹ <strong>ক্যাশ/ব্যাংক রিফান্ড:</strong> এই ফেরত মূল্য সাপ্লায়ার থেকে নগদ/ব্যাংকে গ্রহণ করা হচ্ছে, সাপ্লায়ার লেজার অপরিবর্তিত থাকবে।
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  অনুগ্রহ করে সাপ্লায়ার সিলেক্ট করুন — সাপ্লায়ারের বর্তমান লেজার ব্যালেন্স এবং ফেরত মূল্য কর্তন এখানে প্রদর্শিত হবে।
                </p>
              )}
            </div>

            {/* General Reason */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Primary Return Reason
              </label>
              <select
                value={generalReason || 'DEFECTIVE'}
                onChange={(e) => setGeneralReason(e.target.value || 'DEFECTIVE')}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
              >
                <option value="DEFECTIVE">Defective / Manufacturing Flaw</option>
                <option value="DAMAGED">Damaged in Transit / Handling</option>
                <option value="EXPIRED">Near Expiry / Expired Goods</option>
                <option value="WRONG_ITEM">Wrong Item / SKU Mismatch</option>
                <option value="OVER_DELIVERY">Excess Quantity Supplied</option>
                <option value="QUALITY_MISMATCH">Quality Below Agreed Sample</option>
                <option value="OTHER">Other / Commercial Agreement</option>
              </select>
            </div>

            {/* Tax / VAT Adjustment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                VAT / Tax Adjustment (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={taxAmount !== undefined && !Number.isNaN(taxAmount) ? taxAmount : 0}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setTaxAmount(Number.isNaN(val) ? 0 : val);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
                placeholder="0.00"
              />
            </div>

            {/* Financial Summary Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-white">৳{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Tax / VAT Credit:</span>
                <span className="font-mono font-bold text-white">৳{Number(taxAmount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-bold uppercase tracking-wider text-rose-400">
                  Total Debit Note Amount:
                </span>
                <span className="text-2xl font-black font-mono text-white">
                  ৳{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Internal Remarks & Audit Notes
              </label>
              <textarea
                rows={2}
                value={notes || ''}
                onChange={(e) => setNotes(e.target.value || '')}
                placeholder="Details of return agreement with supplier..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

          </div>
        </div>

      </div>

      {/* Section 3: Line Items Table & Catalog Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              3. Products to Return to Supplier ({lineItems.length} lines)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and adjust quantities or return rates. Delete any items not being returned.
            </p>
          </div>

          {/* Quick Search & Barcode controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Barcode Form */}
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1 sm:w-56">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={barcodeInput || ''}
                onChange={(e) => setBarcodeInput(e.target.value || '')}
                placeholder="Scan Barcode / SKU..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:bg-white"
              />
            </form>

            {/* Catalog Search Autocomplete */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={catalogSearch || ''}
                onChange={(e) => {
                  setCatalogSearch(e.target.value || '');
                  setIsCatalogOpen(true);
                }}
                onFocus={() => setIsCatalogOpen(true)}
                placeholder="+ Add product from catalog..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
              />

              {/* Dropdown Results */}
              {isCatalogOpen && filteredCatalog.length > 0 && (
                <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredCatalog.map((p, pIdx) => (
                    <button
                      key={`cat-${p.id ?? pIdx}-${pIdx}`}
                      type="button"
                      onClick={() => handleAddCatalogProduct(p)}
                      className="w-full text-left p-3 hover:bg-rose-50/50 flex justify-between items-center transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          SKU: {p.sku} | Cost: ৳{getProductCost(p).toFixed(2)}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-rose-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Product Details</th>
                <th className="py-3 px-3 text-center">UOM</th>
                <th className="py-3 px-3 text-right">Orig. Rate</th>
                <th className="py-3 px-3 text-right min-w-[120px]">Return Rate (৳)</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Return Qty</th>
                <th className="py-3 px-3 min-w-[150px]">Return Reason</th>
                <th className="py-3 px-3 text-right min-w-[110px]">Total (৳)</th>
                <th className="py-3 px-2 w-10 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No items added to return yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose "From Existing Purchase Bill" above to import products, or search the catalog to add items.
                    </p>
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => {
                  const itemKey = `ret-row-${item.id ?? idx}-${idx}`;
                  const rateVal = item.return_rate !== undefined && !Number.isNaN(Number(item.return_rate)) ? item.return_rate : 0;
                  const qtyVal = item.return_qty !== undefined && !Number.isNaN(Number(item.return_qty)) ? item.return_qty : 0;
                  return (
                    <tr key={itemKey} className="hover:bg-slate-50/80 transition-colors">
                      {/* Index */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{item.product_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          SKU: {item.sku} {item.barcode ? `| Barcode: ${item.barcode}` : ''}
                        </p>
                      </td>

                      {/* UOM */}
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {item.unit_name || 'Pcs'}
                      </td>

                      {/* Original Rate */}
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        ৳{Number(item.original_unit_cost || item.return_rate || 0).toFixed(2)}
                      </td>

                      {/* Return Rate (Editable) */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={rateVal}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleItemRateChange(idx, Number.isNaN(val) ? 0 : val);
                          }}
                          className="w-24 p-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-rose-500 text-xs"
                        />
                      </td>

                      {/* Return Qty (Editable) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(idx, (item.return_qty || 0) - 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qtyVal}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleItemQtyChange(idx, Number.isNaN(val) ? 0 : val);
                            }}
                            className="w-16 p-1.5 text-center font-mono font-bold text-rose-700 bg-rose-50/50 border border-rose-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-rose-500 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(idx, (item.return_qty || 0) + 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        {item.original_quantity !== undefined && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Purchased: {item.original_quantity}
                          </p>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-3">
                        <select
                          value={item.reason || 'DEFECTIVE'}
                          onChange={(e) => handleItemReasonChange(idx, e.target.value || 'DEFECTIVE')}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          <option value="DEFECTIVE">Defective</option>
                          <option value="DAMAGED">Damaged</option>
                          <option value="EXPIRED">Expired</option>
                          <option value="WRONG_ITEM">Wrong Item</option>
                          <option value="OVER_DELIVERY">Excess</option>
                          <option value="QUALITY_MISMATCH">Quality Issue</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Detail note..."
                          value={item.reason_detail || ''}
                          onChange={(e) => handleItemDetailChange(idx, e.target.value || '')}
                          className="w-full mt-1 p-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600"
                        />
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        ৳{Number(item.line_total || 0).toFixed(2)}
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Remove product from return list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Posting this voucher creates an official Debit Note and adjusts inventory stock at{' '}
              <strong className="text-slate-900">{warehouseName}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-slate-500">Active Return Items: {lineItems.filter(i => i.return_qty > 0).length}</span>
            <span className="text-slate-900 text-sm">
              Total Debit: <strong className="font-mono text-rose-700 text-base">৳{grandTotal.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Printable A4 Debit Note Voucher Modal */}
      {showPrintModal && activePrintRecord && (
        <SupplierReturnPrintModal
          returnData={activePrintRecord}
          company={{
            name: activeCompany?.name,
            address: activeCompany?.address,
            phone: activeCompany?.phone,
            email: activeCompany?.email,
            tax_number: activeCompany?.tax_number,
          }}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
