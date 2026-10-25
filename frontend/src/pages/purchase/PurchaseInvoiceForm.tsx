import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Save, Plus, Trash2, FileText, CheckCircle, AlertCircle, 
  Search, Barcode, ShoppingCart, RefreshCw, Printer, X, Eye, ShieldCheck, 
  CreditCard, Wallet, Building2, Smartphone, DollarSign, Calculator, Layers, Sparkles, Database,
  DownloadCloud, FileCheck, Check
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { getSuppliers } from '../../api/suppliers';
import { getProducts, getCategories, getBrands } from '../../api/products';
import { 
  createPurchase, 
  postPurchaseInvoice, 
  generateNextPurchaseVoucher 
} from '../../api/purchases';
import { getPurchaseOrders, getPurchaseOrder } from '../../api/purchaseOrders';
import { getGoodsReceipts } from '../../api/goodsReceipts';
import { Supplier } from '../../types/supplier';
import { Product, Category, Brand } from '../../types/product';
import { PurchaseOrder, GoodsReceipt } from '../../types/purchase';
import { useCompany } from '../../contexts/CompanyContext';
import { PurchaseVoucherPrintModal, PurchaseVoucherData } from '../../components/purchase/PurchaseVoucherPrintModal';

interface PurchaseLineItem {
  id: string;
  product_id: number;
  product_variant_id: number;
  product_name: string;
  sku: string;
  barcode: string;
  unit_name: string;
  current_stock: number;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

export const PurchaseInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const { company: activeCompany } = useCompany();

  // Master Data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);

  // Form Header & Metadata
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [purchaseStatus, setPurchaseStatus] = useState<'DRAFT' | 'POSTED' | 'CANCELLED'>('DRAFT');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [supplierChallanNo, setSupplierChallanNo] = useState<string>('');
  const [selectedPoId, setSelectedPoId] = useState<number | ''>('');
  const [selectedGrnId, setSelectedGrnId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Purchase Type: Direct Purchase (Default) vs Against Purchase Order (PO Order Purchase)
  const [purchaseType, setPurchaseType] = useState<'DIRECT' | 'AGAINST_PO'>('DIRECT');
  const [poSearchInput, setPoSearchInput] = useState<string>('');
  const [isLoadingPo, setIsLoadingPo] = useState<boolean>(false);
  const [loadedPoNumber, setLoadedPoNumber] = useState<string | null>(null);

  // Selected Supplier Context
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Line Items & Catalog Search
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [barcodeScanInput, setBarcodeScanInput] = useState('');

  // Financial & Shipping
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);

  // Payment Breakdown
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'MFS' | 'CREDIT'>('CREDIT');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNo, setBankAccountNo] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [cardLast4, setCardLast4] = useState<string>('');
  const [mfsAmount, setMfsAmount] = useState<number>(0);
  const [mfsProvider, setMfsProvider] = useState<string>('Bkash');
  const [mfsTrxId, setMfsTrxId] = useState<string>('');

  // UI & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [savedPurchaseData, setSavedPurchaseData] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMasterData();
    setVoucherNo(generateNextPurchaseVoucher());

    // Auto-detect PO parameter from URL: e.g. /purchases/invoices/create?po=PO-2026-5934 or ?po_id=103
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const poParam = params.get('po') || params.get('po_id') || params.get('po_number');
        if (poParam) {
          setPurchaseType('AGAINST_PO');
          setPoSearchInput(poParam);
          setTimeout(() => {
            handleLoadPurchaseOrder(poParam);
          }, 350);
        }
      }
    } catch (_e) {}
  }, []);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const [supRes, prodRes, catRes, brandRes, poRes, grRes] = await Promise.all([
        getSuppliers({ per_page: 100 }).catch(() => ({ data: [] })),
        getProducts({ per_page: 100 }).catch(() => ({ data: [] })),
        getCategories({ all: true }).catch(() => ({ data: [] })),
        getBrands({ all: true }).catch(() => ({ data: [] })),
        getPurchaseOrders().catch(() => ({ data: [] })),
        getGoodsReceipts().catch(() => ({ data: [] })),
      ]);

      const supList = Array.isArray(supRes.data) ? supRes.data : (supRes as any).data?.data || [];
      const prodList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes as any).data?.data || [];
      const catList = Array.isArray(catRes.data) ? catRes.data : [];
      const brandList = Array.isArray(brandRes.data) ? brandRes.data : [];
      const poList = Array.isArray(poRes.data) ? poRes.data : [];
      const grList = Array.isArray(grRes.data) ? grRes.data : [];

      setSuppliers(supList);
      setProducts(prodList);
      setCategories(catList);
      setBrands(brandList);
      setPurchaseOrders(poList);
      setGoodsReceipts(grList);

      if (supList.length > 0) {
        handleSupplierSelect(Number(supList[0].id), supList);
      }
    } catch (err) {
      console.warn('Master data load fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupplierSelect = (id: number, supplierList = suppliers) => {
    setSelectedSupplierId(id);
    const found = supplierList.find((s) => Number(s.id) === Number(id)) || null;
    setSelectedSupplier(found);
    setIsDirty(true);
  };

  // Load PO details and insert items into purchase form
  const handleLoadPurchaseOrder = async (poIdentifier: string | number) => {
    if (!poIdentifier) return;
    setIsLoadingPo(true);
    setErrorMessage(null);
    try {
      const res = await getPurchaseOrder(poIdentifier);
      const po = res.data;
      if (po && (po.id || po.po_number)) {
        const poIdNum = Number(po.id) || 0;
        setSelectedPoId(poIdNum > 0 ? poIdNum : '');
        const targetPoNum = po.po_number || String(poIdentifier);
        setPoSearchInput(targetPoNum);
        setLoadedPoNumber(targetPoNum);

        // Auto-populate supplier
        const targetSupId = Number(po.supplier_id || po.supplier?.id);
        if (targetSupId) {
          handleSupplierSelect(targetSupId);
        }

        // Auto-populate warehouse
        if (po.warehouse_id) {
          setWarehouseId(Number(po.warehouse_id));
        }

        // Auto-populate notes
        if (po.notes) {
          setNotes((prev) => prev ? `${prev} | PO Ref: ${targetPoNum}` : `PO Ref: ${targetPoNum}. ${po.notes}`);
        }

        // Insert items from PO into line items matrix
        if (Array.isArray(po.items) && po.items.length > 0) {
          const imported: PurchaseLineItem[] = po.items.map((it: any, idx: number) => {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const unitCost = Number(it.unit_cost) || 0;
            const discount = Number(it.discount) || 0;
            const tax = Number(it.tax) || Number(((qty * unitCost) * ((Number(it.tax_percent) || 0) / 100)).toFixed(2));
            const sellingPrice = Number(it.unit_selling_price) || (unitCost > 0 ? unitCost * 1.25 : 0);
            const lineTotal = Number(it.line_total) || (qty * unitCost - discount + tax);
            const variantId = Number(it.product_variant_id || it.product_id || (idx + 1000));

            return {
              id: `po_item_${po.id || 'order'}_${variantId}_${idx}_${Date.now()}`,
              product_id: Number(it.product_id || 1),
              product_variant_id: variantId,
              product_name: it.product_name || it.product?.name || `Item ${idx + 1}`,
              sku: it.sku || it.product?.sku || `SKU-${it.product_id || idx + 1}`,
              barcode: it.barcode || it.product?.barcode || it.sku || `BC-${it.product_id || idx + 1}`,
              unit_name: it.purchase_unit || it.product?.unit?.short_code || 'pcs',
              current_stock: Number(it.product?.available_quantity ?? 25),
              quantity: qty,
              unit_cost: unitCost,
              selling_price: sellingPrice,
              discount: discount,
              tax: tax,
              line_total: lineTotal,
            };
          });

          setLineItems(imported);
          setIsDirty(true);
          setSuccessMessage(
            `Purchase Order ${targetPoNum} loaded! Supplier, warehouse, and ${imported.length} item(s) inserted into form. You can adjust quantities, purchase rates, or delete rows as needed.`
          );
          setTimeout(() => setSuccessMessage(null), 6000);
        } else {
          setSuccessMessage(`Purchase Order ${targetPoNum} loaded (No line items found in order).`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      } else {
        setErrorMessage(`Purchase Order '${poIdentifier}' could not be located.`);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Error loading PO:', err);
      setErrorMessage(`Failed to load Purchase Order: ${err.message || 'Not found'}`);
    } finally {
      setIsLoadingPo(false);
    }
  };

  // Barcode Scanner & Search Adding
  // Enter Key Column/Field Navigation Helper
  const handleFieldKeyDown = (e: React.KeyboardEvent, nextElementId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = document.getElementById(nextElementId);
      if (target) {
        target.focus();
        if ('select' in target && typeof (target as any).select === 'function') {
          (target as any).select();
        }
      }
    }
  };

  const handleAddProductToLines = (product: Product) => {
    setIsDirty(true);
    const variant = product.variants?.[0];
    const variantId = variant ? Number(variant.id) : Number(product.id);
    const sku = variant?.sku || product.product_code || `SKU-${product.id}`;
    const barcode = variant?.barcodes?.[0]?.barcode || product.sku || sku;
    const unitName = product.unit?.short_code || product.unit?.name || 'pcs';
    const costPrice = variant ? Number(variant.cost_price || 0) : 0;
    const sellingPrice = variant ? Number(variant.selling_price || 0) : costPrice * 1.25;
    const stock = Number(variant?.available_quantity ?? product.reorder_level ?? 25);
    const newItemId = String(variantId);

    // Check if item already exists in line items
    const existingIdx = lineItems.findIndex((item) => item.product_variant_id === variantId);
    if (existingIdx !== -1) {
      setLineItems((prev) =>
        prev.map((item, idx) => {
          if (idx === existingIdx) {
            const newQty = item.quantity + 1;
            const newTotal = newQty * item.unit_cost - item.discount + item.tax;
            return { ...item, quantity: newQty, line_total: newTotal };
          }
          return item;
        })
      );
    } else {
      const newItem: PurchaseLineItem = {
        id: newItemId,
        product_id: Number(product.id),
        product_variant_id: variantId,
        product_name: product.name,
        sku,
        barcode,
        unit_name: unitName,
        current_stock: stock,
        quantity: 1,
        unit_cost: costPrice,
        selling_price: sellingPrice,
        discount: 0,
        tax: 0,
        line_total: costPrice,
      };
      setLineItems((prev) => [newItem, ...prev]);
    }

    // Auto-focus quantity field for ultra-fast keyboard entry
    setTimeout(() => {
      const qtyInput = document.getElementById(`qty_input_${newItemId}`);
      if (qtyInput) {
        qtyInput.focus();
        if ('select' in qtyInput && typeof (qtyInput as any).select === 'function') {
          (qtyInput as any).select();
        }
      }
    }, 80);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeScanInput.trim()) return;

    const term = barcodeScanInput.trim().toLowerCase();
    const matched = products.find((p) => {
      const codeMatch = p.product_code?.toLowerCase() === term || p.sku?.toLowerCase() === term;
      const variantBarcode = p.variants?.some((v: any) =>
        v.barcodes?.some((b: any) => b.barcode?.toLowerCase() === term) || v.sku?.toLowerCase() === term
      );
      return codeMatch || variantBarcode || p.name.toLowerCase().includes(term);
    });

    if (matched) {
      handleAddProductToLines(matched);
      setBarcodeScanInput('');
      setErrorMessage(null);
    } else {
      setErrorMessage(`No product found matching barcode/SKU '${barcodeScanInput}'`);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Line Item Modifications
  const handleItemFieldChange = (
    id: string,
    field: 'quantity' | 'unit_cost' | 'discount' | 'tax' | 'selling_price',
    value: number
  ) => {
    setIsDirty(true);
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          const qty = Math.max(0, updated.quantity);
          const cost = Math.max(0, updated.unit_cost);
          const disc = Math.max(0, updated.discount);
          const tax = Math.max(0, updated.tax);
          updated.line_total = qty * cost - disc + tax;
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveLineItem = (id: string) => {
    setIsDirty(true);
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const calculateTotalQuantity = () => {
    return lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  };

  const calculateGrossSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);
  };

  const calculateTotalDiscount = () => {
    return lineItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  };

  const calculateTotalTax = () => {
    return lineItems.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  };

  const calculateGrandTotal = () => {
    const gross = calculateGrossSubtotal();
    const disc = calculateTotalDiscount();
    const tax = calculateTotalTax();
    const ship = Number(shippingCost) || 0;
    const oth = Number(otherCost) || 0;
    return Math.max(0, gross - disc + tax + ship + oth);
  };

  const calculateOutstandingPayable = () => {
    return Math.max(0, calculateGrandTotal() - (Number(amountPaid) || 0));
  };

  // Payment Breakdown Auto Sync
  const handleAmountPaidChange = (val: number) => {
    setIsDirty(true);
    const paid = Math.max(0, val);
    setAmountPaid(paid);
    if (paymentMethod === 'CASH') setCashAmount(paid);
    if (paymentMethod === 'BANK') setBankAmount(paid);
    if (paymentMethod === 'CARD') setCardAmount(paid);
    if (paymentMethod === 'MFS') setMfsAmount(paid);
  };

  // Save / Post Submission
  const handleSavePurchase = async (postImmediately = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedSupplierId) {
      setErrorMessage('Please select a valid supplier.');
      return;
    }

    if (!supplierChallanNo.trim()) {
      setErrorMessage('Supplier Challan / Invoice number is required.');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one product item to the purchase invoice.');
      return;
    }

    const invalidQtyItem = lineItems.find((i) => Number(i.quantity) <= 0);
    if (invalidQtyItem) {
      setErrorMessage(`Item '${invalidQtyItem.product_name}' must have a purchase quantity > 0.`);
      return;
    }

    setIsSaving(true);
    try {
      const grandTotal = calculateGrandTotal();
      const payload = {
        supplier_id: Number(selectedSupplierId),
        supplier_invoice_number: supplierChallanNo.trim(),
        invoice_date: purchaseDate,
        due_date: dueDate || undefined,
        warehouse_id: warehouseId,
        purchase_order_id: selectedPoId ? Number(selectedPoId) : undefined,
        goods_receipt_id: selectedGrnId ? Number(selectedGrnId) : undefined,
        shipping_cost: Number(shippingCost) || 0,
        other_cost: Number(otherCost) || 0,
        notes: notes.trim() || undefined,
        post_immediately: postImmediately,
        amount_paid: Number(amountPaid) || 0,
        payment_method: paymentMethod,
        items: lineItems.map((item) => ({
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
          discount: Number(item.discount) || 0,
          tax: Number(item.tax) || 0,
          selling_price: Number(item.selling_price) || 0,
          line_total: Number(item.line_total),
        })),
      };

      const res = await createPurchase(payload);

      if (postImmediately && res.data?.id) {
        await postPurchaseInvoice(res.data.id).catch(() => {});
      }

      const finalStatus = postImmediately ? 'POSTED' : 'DRAFT';
      setPurchaseStatus(finalStatus);

      const savedSummary = {
        voucher_no: voucherNo,
        supplier_name: selectedSupplier?.name || 'Supplier #' + selectedSupplierId,
        supplier_code: selectedSupplier?.supplier_code || 'SUP',
        challan_no: supplierChallanNo,
        invoice_date: purchaseDate,
        due_date: dueDate,
        items: lineItems,
        subtotal: calculateGrossSubtotal(),
        discount: calculateTotalDiscount(),
        tax: calculateTotalTax(),
        shipping: Number(shippingCost) || 0,
        grand_total: grandTotal,
        amount_paid: Number(amountPaid) || 0,
        due_payable: calculateOutstandingPayable(),
        payment_method: paymentMethod,
        status: finalStatus,
      };

      setSavedPurchaseData(savedSummary);
      setIsDirty(false);
      setSuccessMessage(`Purchase Entry ${finalStatus === 'POSTED' ? 'posted' : 'draft saved'} successfully!`);

      setTimeout(() => {
        setIsPrintModalOpen(true);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save purchase entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedSupplierId) {
      setErrorMessage('Please select a valid supplier.');
      return;
    }

    if (!supplierChallanNo.trim()) {
      setErrorMessage('Supplier Challan / Invoice number is required.');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one product item to the purchase invoice.');
      return;
    }

    const invalidQtyItem = lineItems.find((i) => Number(i.quantity) <= 0);
    if (invalidQtyItem) {
      setErrorMessage(`Item '${invalidQtyItem.product_name}' must have a purchase quantity > 0.`);
      return;
    }

    setIsSaving(true);
    try {
      const grandTotal = calculateGrandTotal();
      const payload = {
        supplier_id: Number(selectedSupplierId),
        supplier_invoice_number: supplierChallanNo.trim(),
        invoice_date: purchaseDate,
        due_date: dueDate || undefined,
        warehouse_id: warehouseId,
        purchase_order_id: selectedPoId ? Number(selectedPoId) : undefined,
        goods_receipt_id: selectedGrnId ? Number(selectedGrnId) : undefined,
        shipping_cost: Number(shippingCost) || 0,
        other_cost: Number(otherCost) || 0,
        notes: notes.trim() || undefined,
        post_immediately: false,
        amount_paid: Number(amountPaid) || 0,
        payment_method: paymentMethod,
        items: lineItems.map((item) => ({
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
          discount: Number(item.discount) || 0,
          tax: Number(item.tax) || 0,
          selling_price: Number(item.selling_price) || 0,
          line_total: Number(item.line_total),
        })),
      };

      const res = await createPurchase(payload);

      const savedSummary = {
        id: res.data?.id || Date.now(),
        voucher_no: (res.data as any)?.voucher_no || res.data?.invoice_number || voucherNo,
        supplier_name: selectedSupplier?.name || 'Selected Supplier',
        supplier_code: selectedSupplier?.supplier_code || 'SUP-0001',
        challan_no: supplierChallanNo.trim(),
        invoice_date: purchaseDate,
        items: lineItems,
        subtotal: calculateGrossSubtotal(),
        discount: calculateTotalDiscount(),
        tax: calculateTotalTax(),
        shipping: Number(shippingCost) || 0,
        grand_total: grandTotal,
        amount_paid: Number(amountPaid) || 0,
        due_payable: calculateOutstandingPayable(),
        payment_method: paymentMethod,
        status: 'DIRECT_SAVED',
      };

      setSavedPurchaseData(savedSummary);
      setIsDirty(false);
      setSuccessMessage(`Direct Save: Purchase invoice '${savedSummary.voucher_no}' saved directly to database!`);

      setTimeout(() => {
        setIsPrintModalOpen(true);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save purchase entry directly.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewPurchase = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Start a new purchase entry?')) {
        return;
      }
    }
    setVoucherNo(generateNextPurchaseVoucher());
    setPurchaseStatus('DRAFT');
    setSupplierChallanNo('');
    setLineItems([]);
    setNotes('');
    setAmountPaid(0);
    setShippingCost(0);
    setOtherCost(0);
    setIsDirty(false);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to exit?')) {
        return;
      }
    }
    navigate('/purchases/invoices');
  };

  const effectivePrintVoucher: PurchaseVoucherData = useMemo(() => {
    if (savedPurchaseData) {
      return {
        ...savedPurchaseData,
        supplier_phone: selectedSupplier?.mobile || selectedSupplier?.contact_phone,
        supplier_address: selectedSupplier?.address,
        supplier_bin: selectedSupplier?.tax_number,
        warehouse_name: 'Main Central Warehouse',
        po_reference: loadedPoNumber || (selectedPoId ? `PO-${selectedPoId}` : 'Direct Purchase'),
      };
    }
    return {
      voucher_no: voucherNo || 'PV-2026-0001',
      supplier_name: selectedSupplier?.name || 'Selected Supplier',
      supplier_code: selectedSupplier?.supplier_code || 'SUP-0001',
      supplier_phone: selectedSupplier?.mobile || selectedSupplier?.contact_phone || '',
      supplier_email: selectedSupplier?.email || '',
      supplier_address: selectedSupplier?.address || '',
      supplier_bin: selectedSupplier?.tax_number || '',
      challan_no: supplierChallanNo || 'CHALLAN-901',
      invoice_date: purchaseDate,
      due_date: dueDate,
      po_reference: loadedPoNumber || (selectedPoId ? `PO-${selectedPoId}` : 'Direct Purchase'),
      warehouse_name: 'Main Central Warehouse',
      items: lineItems,
      subtotal: calculateGrossSubtotal(),
      discount: calculateTotalDiscount(),
      tax: calculateTotalTax(),
      shipping: Number(shippingCost) || 0,
      other_cost: Number(otherCost) || 0,
      grand_total: calculateGrandTotal(),
      amount_paid: Number(amountPaid) || 0,
      due_payable: calculateOutstandingPayable(),
      payment_method: paymentMethod,
      status: purchaseStatus,
      notes: notes,
    };
  }, [
    savedPurchaseData,
    voucherNo,
    selectedSupplier,
    supplierChallanNo,
    purchaseDate,
    dueDate,
    loadedPoNumber,
    selectedPoId,
    lineItems,
    shippingCost,
    otherCost,
    amountPaid,
    paymentMethod,
    purchaseStatus,
    notes,
  ]);

  // Filtered Products Catalog
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !productSearchTerm ||
      p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      (p.product_code && p.product_code.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()));

    const matchesCategory = !selectedCategoryId || String(p.category_id) === String(selectedCategoryId);
    const matchesBrand = !selectedBrandId || String(p.brand_id) === String(selectedBrandId);

    return matchesSearch && matchesCategory && matchesBrand;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto bg-slate-50 min-h-full">
      {/* A. Page Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          {/* Breadcrumb (Procurement -> Purchase) */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/purchases')}>
              Purchase
            </span>
            <span>/</span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate('/purchases/invoices')}>
              Purchases
            </span>
            <span>/</span>
            <span className="text-indigo-700 font-bold">New Purchase</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Purchase Entry</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                purchaseStatus === 'POSTED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {purchaseStatus}
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              Voucher: {voucherNo}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSavePurchase(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSavePurchase(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSaving ? 'Posting Purchase...' : 'Post Purchase'}
          </button>

          <button
            type="button"
            onClick={handleNewPurchase}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-700" />
            New
          </button>

          <button
            type="button"
            onClick={() => navigate('/purchases/invoices')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            Browse
          </button>

          <button
            type="button"
            id="btn_header_print_voucher"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Open Modern A4 Print Preview with your installed printer"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            Print Voucher (A4)
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Purchase Entry Mode Switch (Direct Purchase [Default] vs Against Purchase Order) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Purchase Type
            </span>
            <span className="text-xs font-bold text-slate-700">
              {purchaseType === 'DIRECT' ? 'Direct Purchase (Default)' : 'Against Purchase Order (PO)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {purchaseType === 'DIRECT'
              ? 'By default, Direct Purchase is active. Scan or search items to enter purchase lines directly.'
              : 'Enter or select a PO number (e.g. PO-2026-5934) to auto-fill supplier, warehouse, and import all line items.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            id="btn_type_direct_purchase"
            onClick={() => {
              setPurchaseType('DIRECT');
              setIsDirty(true);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              purchaseType === 'DIRECT'
                ? 'bg-white text-indigo-700 shadow-2xs font-black border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Direct Purchase (Default)
          </button>
          <button
            type="button"
            id="btn_type_against_po"
            onClick={() => {
              setPurchaseType('AGAINST_PO');
              setIsDirty(true);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              purchaseType === 'AGAINST_PO'
                ? 'bg-indigo-600 text-white shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Against Purchase Order (PO)
          </button>
        </div>
      </div>

      {/* PO Quick Loader Panel when Against Purchase Order is active */}
      {purchaseType === 'AGAINST_PO' && (
        <div className="bg-indigo-50/80 rounded-xl border border-indigo-200 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-700 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Import Purchase Order Details & Line Items
                </h3>
                <p className="text-[11px] text-indigo-800">
                  Enter PO Number (like <span className="font-mono font-bold">PO-2026-5934</span>) or click a quick order below. All items, quantities, and rates will be inserted into the form.
                </p>
              </div>
            </div>
            {loadedPoNumber && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                <Check className="w-3.5 h-3.5" /> {loadedPoNumber} Loaded
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                id="po_number_quick_input"
                type="text"
                value={poSearchInput}
                onChange={(e) => setPoSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLoadPurchaseOrder(poSearchInput);
                  }
                }}
                placeholder="Enter PO Number (e.g. PO-2026-5934, PO-2026-5933)..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:font-sans placeholder:text-slate-400"
              />
              <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5" />
            </div>

            <button
              type="button"
              id="btn_load_po_data"
              disabled={isLoadingPo || !poSearchInput.trim()}
              onClick={() => handleLoadPurchaseOrder(poSearchInput)}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
            >
              {isLoadingPo ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Loading PO...
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  Load PO Data & Insert Items
                </>
              )}
            </button>
          </div>

          {/* Quick PO Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-indigo-900 font-semibold">Available Approved POs:</span>
            {purchaseOrders.length === 0 ? (
              <span className="text-slate-500 italic">No POs cached yet</span>
            ) : (
              purchaseOrders.slice(0, 6).map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => {
                    setPoSearchInput(po.po_number);
                    handleLoadPurchaseOrder(po.po_number || po.id);
                  }}
                  className={`px-2.5 py-1 rounded-md font-mono font-bold text-[11px] border transition-colors cursor-pointer ${
                    loadedPoNumber === po.po_number || String(selectedPoId) === String(po.id)
                      ? 'bg-indigo-700 text-white border-indigo-800 shadow-2xs'
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {po.po_number}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* B. Supplier & Purchase Information (Responsive Two-Column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Supplier Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-700" />
              Supplier Profile & Outstanding Balance
            </h2>
            <button
              type="button"
              onClick={() => navigate('/purchases/suppliers/new')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
            >
              + Quick Add Supplier
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Select Supplier *
              </label>
              <select
                id="supplier_select_input"
                required
                value={selectedSupplierId}
                onChange={(e) => handleSupplierSelect(Number(e.target.value))}
                onKeyDown={(e) => handleFieldKeyDown(e, 'supplier_challan_input')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="" className="text-slate-900">Choose Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    {s.name} ({s.supplier_code || s.short_name || 'SUP'})
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplier ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Supplier Code / Ref:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedSupplier.supplier_code || 'SUP-0001'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Short Name:</span>
                  <span className="font-bold text-slate-900">{selectedSupplier.short_name || 'TMI'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Contact Phone:</span>
                  <span className="font-semibold text-slate-800">{selectedSupplier.mobile || selectedSupplier.contact_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Authoritative Outstanding Balance:</span>
                  <span className="text-sm font-bold font-mono text-rose-700">
                    ৳{Number(selectedSupplier.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                Please select a supplier record from the dropdown to load authoritative balance.
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Purchase Document Context */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-700" />
              Document Reference & Organization Scope
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Voucher No (Read-Only)
              </label>
              <input
                type="text"
                readOnly
                value={voucherNo}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-mono font-bold text-indigo-800 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Purchase Date *
              </label>
              <input
                id="purchase_date_input"
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  setIsDirty(true);
                }}
                onKeyDown={(e) => handleFieldKeyDown(e, 'due_date_input')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Supplier Challan / Invoice No *
              </label>
              <input
                id="supplier_challan_input"
                type="text"
                required
                value={supplierChallanNo}
                onChange={(e) => {
                  setSupplierChallanNo(e.target.value);
                  setIsDirty(true);
                }}
                onKeyDown={(e) => handleFieldKeyDown(e, 'purchase_date_input')}
                placeholder="e.g. SINV-8821 or CHALLAN-901"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Purchase Order Ref (PO)
              </label>
              <select
                id="po_ref_select_input"
                value={selectedPoId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPoId(val ? Number(val) : '');
                  setIsDirty(true);
                  if (val) {
                    handleLoadPurchaseOrder(Number(val));
                  }
                }}
                onKeyDown={(e) => handleFieldKeyDown(e, 'grn_ref_select_input')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="" className="text-slate-900">None (Direct Invoice)</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id} className="text-slate-900">
                    {po.po_number} - ৳{Number(po.total_amount || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Goods Receipt Ref (GRN)
              </label>
              <select
                id="grn_ref_select_input"
                value={selectedGrnId}
                onChange={(e) => {
                  setSelectedGrnId(e.target.value ? Number(e.target.value) : '');
                  setIsDirty(true);
                }}
                onKeyDown={(e) => handleFieldKeyDown(e, 'barcode_scan_input')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="" className="text-slate-900">None (Unbilled GRN)</option>
                {goodsReceipts.map((gr) => (
                  <option key={gr.id} value={gr.id} className="text-slate-900">
                    {gr.grn_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* C. Product Search & Barcode Scanner Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Barcode className="w-4 h-4 text-indigo-700" />
            Fast Product Search & Hardware Barcode Scanner Input
          </h2>

          {/* Barcode Scanner Form */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative w-full">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600" />
              <input
                id="barcode_scan_input"
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode + Enter..."
                value={barcodeScanInput}
                onChange={(e) => setBarcodeScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !barcodeScanInput.trim()) {
                    e.preventDefault();
                    const nextId = lineItems.length > 0 ? `qty_input_${lineItems[0].id}` : 'product_search_input';
                    handleFieldKeyDown(e, nextId);
                  }
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-indigo-50/50 border border-indigo-300 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-indigo-400"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              Scan
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="product_search_input"
              type="text"
              placeholder="Filter by product name or SKU..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, 'category_filter_select')}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <select
            id="category_filter_select"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            onKeyDown={(e) => handleFieldKeyDown(e, 'brand_filter_select')}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="" className="text-slate-900">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
            ))}
          </select>

          <select
            id="brand_filter_select"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            onKeyDown={(e) =>
              handleFieldKeyDown(e, lineItems.length > 0 ? `qty_input_${lineItems[0].id}` : 'shipping_cost_input')
            }
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="" className="text-slate-900">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>
            ))}
          </select>
        </div>

        {/* Catalog Selection Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-48">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 uppercase font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2">Barcode / SKU</th>
                <th className="px-3 py-2">Product Name</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 text-right">Current Stock (H-Stock)</th>
                <th className="px-3 py-2 text-right">Purchase Cost (৳)</th>
                <th className="px-3 py-2 text-right">Selling Price (৳)</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredProducts.slice(0, 8).map((p) => {
                const variant = p.variants?.[0];
                const sku = variant?.sku || p.product_code || `SKU-${p.id}`;
                const barcode = variant?.barcodes?.[0]?.barcode || p.sku || sku;
                const cost = variant ? Number(variant.cost_price || 0) : 0;
                const selling = variant ? Number(variant.selling_price || 0) : cost * 1.25;
                const stock = Number(variant?.available_quantity ?? p.reorder_level ?? 25);

                return (
                  <tr key={p.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="px-3 py-2 font-mono font-bold text-indigo-700">{barcode}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{p.name}</td>
                    <td className="px-3 py-2 text-slate-600 font-medium">{p.unit?.short_code || 'pcs'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{stock}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">৳{cost.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">৳{selling.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleAddProductToLines(p)}
                        className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        + Add Item
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* D & E. Purchase Items Grid & Line Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-700" />
            Purchase Lines Item Matrix ({lineItems.length} Items Selected)
          </h2>
          <span className="text-xs font-bold font-mono text-slate-600">
            Total Qty: <span className="text-indigo-700 font-bold">{calculateTotalQuantity()}</span>
          </span>
        </div>

        {loadedPoNumber && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-800">
                <strong>Items loaded from PO ({loadedPoNumber}):</strong> You can manually delete any unwanted items using the delete button (
                <Trash2 className="w-3.5 h-3.5 inline text-rose-500 mx-0.5" />
                ), or freely modify <strong>Quantity</strong> and <strong>Purchase Rate (Unit Cost)</strong>.
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-700 shrink-0">
              {lineItems.length} items loaded
            </span>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-32">Barcode / SKU</th>
                <th className="px-3 py-3">Product Name</th>
                <th className="px-3 py-3 w-24 text-center">Qty</th>
                <th className="px-3 py-3 w-16">Unit</th>
                <th className="px-3 py-3 w-28 text-right">Unit Cost (৳)</th>
                <th className="px-3 py-3 w-24 text-right">Discount (৳)</th>
                <th className="px-3 py-3 w-24 text-right">Tax (৳)</th>
                <th className="px-3 py-3 w-32 text-right">Line Total (৳)</th>
                <th className="px-3 py-3 w-28 text-right">Selling Price (৳)</th>
                <th className="px-3 py-3 w-20 text-center">GP %</th>
                <th className="px-3 py-3 w-14 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    No purchase items added yet. Search or scan barcode above to populate purchase lines.
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => {
                  const markupGp =
                    item.unit_cost > 0
                      ? (((item.selling_price - item.unit_cost) / item.unit_cost) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-indigo-700">{item.barcode}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{item.product_name}</td>
                      <td className="px-3 py-2.5">
                        <input
                          id={`qty_input_${item.id}`}
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemFieldChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleFieldKeyDown(e, `cost_input_${item.id}`)}
                          className="w-full px-2 py-1 text-center bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-600">{item.unit_name}</td>
                      <td className="px-3 py-2.5">
                        <input
                          id={`cost_input_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unit_cost}
                          onChange={(e) =>
                            handleItemFieldChange(item.id, 'unit_cost', parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleFieldKeyDown(e, `discount_input_${item.id}`)}
                          className="w-full px-2 py-1 text-right bg-white border border-slate-300 rounded font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          id={`discount_input_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) =>
                            handleItemFieldChange(item.id, 'discount', parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleFieldKeyDown(e, `tax_input_${item.id}`)}
                          className="w-full px-2 py-1 text-right bg-white border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          id={`tax_input_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.tax}
                          onChange={(e) =>
                            handleItemFieldChange(item.id, 'tax', parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => handleFieldKeyDown(e, `selling_price_input_${item.id}`)}
                          className="w-full px-2 py-1 text-right bg-white border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ৳{item.line_total.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          id={`selling_price_input_${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.selling_price}
                          onChange={(e) =>
                            handleItemFieldChange(item.id, 'selling_price', parseFloat(e.target.value) || 0)
                          }
                          onKeyDown={(e) => {
                            const nextId =
                              idx < lineItems.length - 1 ? `qty_input_${lineItems[idx + 1].id}` : 'shipping_cost_input';
                            handleFieldKeyDown(e, nextId);
                          }}
                          className="w-full px-2 py-1 text-right bg-white border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-emerald-700">
                        {markupGp}%
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove item"
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
      </div>

      {/* 4. Purchase Totals & Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel: Financial Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-700" />
            Financial Calculation Breakdown
          </h2>

          <div className="space-y-2 text-xs font-medium text-slate-700">
            <div className="flex justify-between items-center">
              <span>Gross Purchase Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">৳{calculateGrossSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Item Discounts:</span>
              <span className="font-mono text-emerald-700 font-bold">- ৳{calculateTotalDiscount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Tax / VAT:</span>
              <span className="font-mono text-slate-900">+ ৳{calculateTotalTax().toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-800 font-bold">Shipping & Freight Charges:</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono">৳</span>
                <input
                  id="shipping_cost_input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost !== undefined && !Number.isNaN(shippingCost) ? shippingCost : 0}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setShippingCost(Number.isNaN(val) ? 0 : val);
                    setIsDirty(true);
                  }}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'other_cost_input')}
                  className="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-800 font-bold">Other Handling Fees:</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono">৳</span>
                <input
                  id="other_cost_input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherCost !== undefined && !Number.isNaN(otherCost) ? otherCost : 0}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setOtherCost(Number.isNaN(val) ? 0 : val);
                    setIsDirty(true);
                  }}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'amount_paid_input')}
                  className="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300 text-sm font-bold text-slate-900">
              <span>Net Grand Total Payable:</span>
              <span className="font-mono text-xl text-indigo-700">৳{calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Payment & Payment Method Allocation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-700" />
              Payment Allocation & Method Selection
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                amountPaid >= calculateGrandTotal() && calculateGrandTotal() > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : amountPaid > 0
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {amountPaid >= calculateGrandTotal() && calculateGrandTotal() > 0
                ? 'PAID'
                : amountPaid > 0
                ? 'PARTIAL'
                : 'UNPAID / CREDIT'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Amount Paid Now (৳)
              </label>
              <input
                id="amount_paid_input"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid !== undefined && !Number.isNaN(amountPaid) ? amountPaid : 0}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  handleAmountPaidChange(Number.isNaN(val) ? 0 : val);
                }}
                onKeyDown={(e) => handleFieldKeyDown(e, 'btn_direct_save')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Outstanding Supplier Payable
              </label>
              <input
                type="text"
                readOnly
                value={`৳${calculateOutstandingPayable().toFixed(2)}`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-mono font-bold text-rose-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Payment Method Allocation
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(['CREDIT', 'CASH', 'BANK', 'CARD', 'MFS'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                    setIsDirty(true);
                  }}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-md transition-colors cursor-pointer text-center ${
                    paymentMethod === method
                      ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Method Specific Inputs */}
          {paymentMethod === 'BANK' && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Bank Name</label>
                <input
                  id="bank_name_input"
                  type="text"
                  placeholder="e.g. Eastern Bank PLC"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'bank_account_no_input')}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Account # / Trx Ref</label>
                <input
                  id="bank_account_no_input"
                  type="text"
                  placeholder="Acc/Cheque #"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'btn_direct_save')}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'MFS' && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Provider</label>
                <select
                  id="mfs_provider_select"
                  value={mfsProvider}
                  onChange={(e) => setMfsProvider(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'mfs_trx_id_input')}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-medium"
                >
                  <option value="Bkash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Trx ID</label>
                <input
                  id="mfs_trx_id_input"
                  type="text"
                  placeholder="e.g. TRX9012384"
                  value={mfsTrxId}
                  onChange={(e) => setMfsTrxId(e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 'btn_direct_save')}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-medium font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Sticky Action Control Bar */}
      <div className="sticky bottom-0 z-40 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
            <span>Line Items: <strong className="text-white font-bold">{lineItems.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Total Qty: <strong className="text-white font-bold">{calculateTotalQuantity()}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Grand Total: <strong className="text-emerald-400 font-mono text-sm font-bold">৳{calculateGrandTotal().toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Save Draft Button */}
          <button
            id="btn_save_draft"
            type="button"
            onClick={() => handleSavePurchase(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-indigo-400" />
            Save Draft
          </button>

          {/* Direct Save Button */}
          <button
            id="btn_direct_save"
            type="button"
            onClick={handleDirectSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Database className="w-4 h-4 text-emerald-100" />
            {isSaving ? 'Direct Saving...' : 'Direct Save'}
          </button>

          {/* Post Purchase Button */}
          <button
            id="btn_post_purchase"
            type="button"
            onClick={() => handleSavePurchase(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSaving ? 'Posting Purchase...' : 'Post Purchase'}
          </button>

          {/* New Button */}
          <button
            id="btn_new_purchase"
            type="button"
            onClick={handleNewPurchase}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            New
          </button>

          {/* Browse Button */}
          <button
            id="btn_browse_purchases"
            type="button"
            onClick={() => navigate('/purchases/invoices')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            Browse
          </button>

          {/* Print Voucher Button */}
          <button
            id="btn_print_voucher"
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Open Modern ERP A4 Purchase Voucher Print Preview"
          >
            <Printer className="w-4 h-4" />
            Print Voucher (A4)
          </button>

          {/* Close Button */}
          <button
            id="btn_close_purchase"
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>

      {/* Printable Modern ERP Purchase Voucher Modal (A4 Paper Format) */}
      {/* RETAILCORE POS_ERP — PURCHASE VOUCHER A4 Modern ERP Print Modal - window.print() */}
      {isPrintModalOpen && (
        <PurchaseVoucherPrintModal
          voucher={effectivePrintVoucher}
          company={
            activeCompany
              ? {
                  name: activeCompany.name,
                  address: activeCompany.address,
                  phone: activeCompany.phone,
                  email: activeCompany.email,
                  tax_number: activeCompany.vat_registration || activeCompany.tax_number,
                }
              : undefined
          }
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
