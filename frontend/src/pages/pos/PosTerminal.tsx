import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ShoppingCart,
  Search,
  User,
  CreditCard,
  X,
  Pause,
  Printer,
  Banknote,
  Plus,
  Minus,
  Trash2,
  Barcode as BarcodeIcon,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut,
  Building,
  ArrowLeft,
  Smartphone,
  Check,
  Tag,
  Percent,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../contexts/CompanyContext';
import {
  posApi,
  PosSession,
  PosProductVariant,
  CartItem,
  SalePaymentData,
  CompleteSaleData,
} from '../../api/pos';
import { Customer, customersApi } from '../../api/customers';
import { PosReceiptModal } from './PosReceiptModal';
import { PosProductSearchModal } from './PosProductSearchModal';
import { PosCustomerModal } from './PosCustomerModal';
import { PosSessionModal } from './PosSessionModal';

// Audio feedback helper for USB barcode scanner & counter actions
function playSound(type: 'beep' | 'success' | 'error' | 'cash') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'beep') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'cash') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch (e) {
    // AudioContext autoplay restrictions are handled gracefully
  }
}

export const CART_STORAGE_KEY = 'retailcore_pos_cart_backup';

export interface PosCartBackup {
  cart: CartItem[];
  customer: Customer | null;
  discountPercent: string;
  discountAmount: string;
  salesNote: string;
  applyVat: boolean;
  paymentMethod: 'CASH' | 'CARD' | 'BKASH' | 'NAGAD' | 'BANK';
  tenderedAmount: string;
  selectedStaffId?: number | '';
  sessionId?: number;
  timestamp: number;
}

export const getPosStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__rc_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const testKey = '__rc_storage_test__';
        window.sessionStorage.setItem(testKey, '1');
        window.sessionStorage.removeItem(testKey);
        return window.sessionStorage;
      }
    } catch {
      return null;
    }
  }
  return null;
};

export const loadInitialCartBackup = (): PosCartBackup | null => {
  try {
    const storage = getPosStorage();
    if (!storage) return null;
    const raw = storage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.cart) && parsed.cart.length > 0) {
      // Discard if older than 24 hours
      const isFresh = Date.now() - (parsed.timestamp || 0) < 24 * 60 * 60 * 1000;
      if (isFresh) return parsed;
      storage.removeItem(CART_STORAGE_KEY);
    }
  } catch {
    // Ignore parse or access errors
  }
  return null;
};

export function PosTerminal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompany();

  // Cached initial backup for restoring state on refresh
  const initialBackupRef = useRef<PosCartBackup | null>(loadInitialCartBackup());
  const initialBackup = initialBackupRef.current;

  // POS Session state
  const [session, setSession] = useState<PosSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState<'open' | 'close'>('open');
  const [totalSessionCashSales, setTotalSessionCashSales] = useState(0);

  // Cart & Sales state (restored from localStorage if available)
  const [cart, setCart] = useState<CartItem[]>(() => initialBackup?.cart || []);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(() => (initialBackup?.cart?.length ? 0 : null));
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>(() => (initialBackup?.cart?.length ? 'success' : 'idle'));
  const [scanMessage, setScanMessage] = useState<string | null>(() =>
    initialBackup?.cart?.length ? `Restored ${initialBackup.cart.length} item(s) from auto-backup` : null
  );
  const [lastScannedStock, setLastScannedStock] = useState<number | null>(null);
  const [salesNote, setSalesNote] = useState(() => initialBackup?.salesNote || '');
  const [applyVat, setApplyVat] = useState(() => initialBackup?.applyVat ?? true);
  const [autoPrint, setAutoPrint] = useState(true);
  const [discountPercent, setDiscountPercent] = useState<string>(() => initialBackup?.discountPercent || '0');
  const [discountAmount, setDiscountAmount] = useState<string>(() => initialBackup?.discountAmount || '0');

  // Customer & Staff state
  const [customer, setCustomer] = useState<Customer | null>(() => initialBackup?.customer || null);
  const [customerMobileQuery, setCustomerMobileQuery] = useState(() => initialBackup?.customer?.mobile || '');
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | ''>(() => initialBackup?.selectedStaffId || '');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BKASH' | 'NAGAD' | 'BANK'>(
    () => initialBackup?.paymentMethod || 'CASH'
  );
  const [tenderedAmount, setTenderedAmount] = useState<string>(() => initialBackup?.tenderedAmount || '');
  const [cardType, setCardType] = useState('VISA');
  const [cardBank, setCardBank] = useState('City Bank');
  const [cardApprovalCode, setCardApprovalCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [productSearchModalOpen, setProductSearchModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Input Refs for fast keyboard navigation
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const customerMobileInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const tenderedInputRef = useRef<HTMLInputElement>(null);
  const staffSelectRef = useRef<HTMLSelectElement>(null);
  const cardTypeSelectRef = useRef<HTMLSelectElement>(null);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Active Session on Mount
  useEffect(() => {
    checkActiveSession();
    loadStaffUsers();
  }, []);

  // Autofocus barcode input on mount and whenever modals close
  useEffect(() => {
    if (!productSearchModalOpen && !customerModalOpen && !receiptModalOpen && !sessionModalOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 80);
    }
  }, [productSearchModalOpen, customerModalOpen, receiptModalOpen, sessionModalOpen]);

  const checkActiveSession = async () => {
    try {
      setIsSessionLoading(true);
      const res = await posApi.getCurrentSession();
      if (res.success && res.data) {
        setSession(res.data);
        // If backup belonged to a completely different session, discard it
        if (initialBackup?.sessionId && initialBackup.sessionId !== res.data.id) {
          clearSale();
        }
      } else {
        setSessionModalMode('open');
        setSessionModalOpen(true);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSessionModalMode('open');
        setSessionModalOpen(true);
      }
    } finally {
      setIsSessionLoading(false);
    }
  };

  const loadStaffUsers = async () => {
    try {
      const users = await posApi.getUsers();
      if (users && users.length > 0) {
        setStaffUsers(users);
        if (user?.id) {
          setSelectedStaffId(user.id);
        }
      }
    } catch (e) {
      // If user list fails (e.g. permission), default to logged-in user
      if (user) {
        setStaffUsers([user]);
        setSelectedStaffId(user.id);
      }
    }
  };

  // ----------------------------------------------------
  // Financial & Cart Calculations
  // ----------------------------------------------------
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  const itemDiscountsTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount_amount, 0);
  }, [cart]);

  // Overall sale discount calculation
  const specialDiscount = useMemo(() => {
    const pct = parseFloat(discountPercent) || 0;
    const amt = parseFloat(discountAmount) || 0;
    if (pct > 0) {
      return (subtotal - itemDiscountsTotal) * (pct / 100);
    }
    return amt;
  }, [subtotal, itemDiscountsTotal, discountPercent, discountAmount]);

  // Tax calculation based on item tax_rate (authoritative)
  const taxTotal = useMemo(() => {
    if (!applyVat) return 0;
    return cart.reduce((sum, item) => {
      const taxableAmount = item.quantity * item.unit_price - item.discount_amount;
      const rate = Number(item.tax_rate ?? 0);
      return sum + Math.max(0, taxableAmount * (rate / 100));
    }, 0);
  }, [cart, applyVat]);

  const grandTotal = useMemo(() => {
    const total = subtotal - itemDiscountsTotal - specialDiscount + taxTotal;
    return Math.max(0, Math.round(total * 100) / 100);
  }, [subtotal, itemDiscountsTotal, specialDiscount, taxTotal]);

  const totalQty = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Paid amount and change
  const numericTendered = useMemo(() => {
    return parseFloat(tenderedAmount) || 0;
  }, [tenderedAmount]);

  const changeAmount = useMemo(() => {
    if (numericTendered > grandTotal) {
      return numericTendered - grandTotal;
    }
    return 0;
  }, [numericTendered, grandTotal]);

  const dueAmount = useMemo(() => {
    if (numericTendered < grandTotal) {
      return grandTotal - numericTendered;
    }
    return 0;
  }, [numericTendered, grandTotal]);

  // Sync Tendered amount with Grand Total by default if Cash
  useEffect(() => {
    if (grandTotal > 0 && (!tenderedAmount || parseFloat(tenderedAmount) === 0)) {
      setTenderedAmount(grandTotal.toFixed(2));
    }
  }, [grandTotal]);

  // ----------------------------------------------------
  // Barcode Scanning & Adding Product
  // ----------------------------------------------------
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    try {
      setScanStatus('idle');
      setScanMessage(null);
      const res = await posApi.getBarcode(code);
      if (res.success && res.data) {
        addProductToCart(res.data);
        setBarcodeInput('');
        setScanStatus('success');
        playSound('beep');
      }
    } catch (err: any) {
      setScanStatus('error');
      setScanMessage(`Barcode / SKU "${code}" not found`);
      playSound('error');
      // Highlight barcode input so next scan replaces it
      barcodeInputRef.current?.select();
    }
  };

  const addProductToCart = (variant: PosProductVariant) => {
    const primaryBarcode =
      variant.barcodes?.find((b) => b.is_primary)?.barcode ||
      variant.barcodes?.[0]?.barcode ||
      variant.sku;
    const price = Number(variant.selling_price || variant.mrp || 0);
    const stock = Number(variant.available_stock ?? 0);
    const taxRate = Number(variant.tax_rate ?? variant.product?.tax_rate ?? 0);

    setLastScannedStock(stock);

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_variant_id === variant.id);
      if (existingIdx !== -1) {
        // Increment quantity
        const updated = [...prev];
        const item = updated[existingIdx];
        const newQty = item.quantity + 1;
        const lineDiscount = (item.unit_price * newQty * item.discount_percent) / 100;
        const lineTax = applyVat ? ((item.unit_price * newQty - lineDiscount) * item.tax_rate) / 100 : 0;
        const lineTotal = item.unit_price * newQty - lineDiscount + lineTax;

        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          discount_amount: lineDiscount,
          tax_amount: lineTax,
          line_total: lineTotal,
          available_stock: stock,
        };
        setSelectedRowIndex(existingIdx);
        return updated;
      }

      // Add new item
      const lineDiscount = 0;
      const lineTax = applyVat ? (price * taxRate) / 100 : 0;
      const lineTotal = price + lineTax;

      const newItem: CartItem = {
        id: `${variant.id}-${Date.now()}`,
        product_variant_id: variant.id,
        barcode: primaryBarcode,
        sku: variant.sku,
        name: variant.product?.name || variant.variant_name,
        variant_name: variant.variant_name || '',
        category_name: variant.product?.category?.name || 'General',
        quantity: 1,
        unit_price: price,
        discount_percent: 0,
        discount_amount: lineDiscount,
        tax_rate: taxRate,
        tax_amount: lineTax,
        line_total: lineTotal,
        available_stock: stock,
      };

      const newCart = [newItem, ...prev];
      setSelectedRowIndex(0);
      return newCart;
    });

    barcodeInputRef.current?.focus();
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const lineDiscount = (item.unit_price * newQty * item.discount_percent) / 100;
      const lineTax = applyVat ? ((item.unit_price * newQty - lineDiscount) * item.tax_rate) / 100 : 0;
      const lineTotal = item.unit_price * newQty - lineDiscount + lineTax;

      updated[index] = {
        ...item,
        quantity: newQty,
        discount_amount: lineDiscount,
        tax_amount: lineTax,
        line_total: lineTotal,
      };
      return updated;
    });
  };

  const updateItemDiscount = (index: number, percent: number) => {
    const validPct = Math.min(100, Math.max(0, percent || 0));
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const lineDiscount = (item.unit_price * item.quantity * validPct) / 100;
      const lineTax = applyVat ? ((item.unit_price * item.quantity - lineDiscount) * item.tax_rate) / 100 : 0;
      const lineTotal = item.unit_price * item.quantity - lineDiscount + lineTax;

      updated[index] = {
        ...item,
        discount_percent: validPct,
        discount_amount: lineDiscount,
        tax_amount: lineTax,
        line_total: lineTotal,
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    if (selectedRowIndex === index) {
      setSelectedRowIndex(null);
    } else if (selectedRowIndex !== null && selectedRowIndex > index) {
      setSelectedRowIndex(selectedRowIndex - 1);
    }
    barcodeInputRef.current?.focus();
  };

  const clearSale = () => {
    try {
      const storage = getPosStorage();
      storage?.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setCart([]);
    setSelectedRowIndex(null);
    setBarcodeInput('');
    setDiscountPercent('0');
    setDiscountAmount('0');
    setTenderedAmount('0');
    setSalesNote('');
    setScanStatus('idle');
    setScanMessage(null);
    setErrorMessage(null);
    setCustomer(null);
    setCustomerMobileQuery('');
    setLastScannedStock(null);
    barcodeInputRef.current?.focus();
  };

  // ----------------------------------------------------
  // Sync Cart & Active Sale State to Local/Session Storage
  // ----------------------------------------------------
  useEffect(() => {
    try {
      const storage = getPosStorage();
      if (!storage) return;

      if (cart.length > 0) {
        const backup: PosCartBackup = {
          cart,
          customer,
          discountPercent,
          discountAmount,
          salesNote,
          applyVat,
          paymentMethod,
          tenderedAmount,
          selectedStaffId,
          sessionId: session?.id,
          timestamp: Date.now(),
        };
        storage.setItem(CART_STORAGE_KEY, JSON.stringify(backup));
      } else {
        storage.removeItem(CART_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to sync POS cart backup to storage', e);
    }
  }, [
    cart,
    customer,
    discountPercent,
    discountAmount,
    salesNote,
    applyVat,
    paymentMethod,
    tenderedAmount,
    selectedStaffId,
    session?.id,
  ]);

  // ----------------------------------------------------
  // Quick Customer Mobile Lookup
  // ----------------------------------------------------
  const handleCustomerMobileLookup = async (mobile: string) => {
    setCustomerMobileQuery(mobile);
    if (mobile.length >= 10) {
      try {
        const res = await customersApi.getCustomers({ search: mobile });
        if (res.success && res.data?.data && res.data.data.length > 0) {
          const match = res.data.data.find((c) => c.mobile === mobile) || res.data.data[0];
          setCustomer(match);
        }
      } catch (e) {
        // Ignore lookup error
      }
    }
  };

  // ----------------------------------------------------
  // Complete & Save Sale
  // ----------------------------------------------------
  const handleCompleteSale = async () => {
    if (!session) {
      setErrorMessage('No active POS session. Please open a session first.');
      setSessionModalMode('open');
      setSessionModalOpen(true);
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Please scan or add products to complete sale.');
      playSound('error');
      barcodeInputRef.current?.focus();
      return;
    }

    // Validation: Walk-in customers cannot have due balance
    if (dueAmount > 0 && !customer) {
      setErrorMessage('Walk-in customer cannot have a due balance. Please register customer [F8] or collect full payment.');
      playSound('error');
      tenderedInputRef.current?.focus();
      return;
    }

    // Prepare Sale Items
    const itemsData = cart.map((item) => ({
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount_amount,
      tax: item.tax_amount,
    }));

    // Prepare Payment Data
    const paymentsData: SalePaymentData[] = [];
    const paid = numericTendered > 0 ? numericTendered : grandTotal;

    paymentsData.push({
      method: paymentMethod,
      amount: paid,
      card_type: paymentMethod === 'CARD' ? cardType : undefined,
      card_bank: paymentMethod === 'CARD' ? cardBank : undefined,
      transaction_ref: cardApprovalCode || undefined,
    });

    const payload: CompleteSaleData = {
      pos_session_id: session.id,
      customer_id: customer ? customer.id : null,
      items: itemsData,
      sale_discount: specialDiscount,
      payments: paymentsData,
      notes: salesNote || undefined,
      idempotency_key: `pos-${session.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await posApi.completeSale(payload);

      if (res.success && res.data) {
        playSound('cash');
        const completed = res.data;

        // Track cash sales for session closing audit
        if (paymentMethod === 'CASH') {
          setTotalSessionCashSales((prev) => prev + Math.min(paid, grandTotal));
        }

        const receiptData = {
          invoiceNumber: completed.invoice_number || `INV-${Date.now()}`,
          saleDate: completed.created_at ? new Date(completed.created_at).toLocaleString() : new Date().toLocaleString(),
          items: [...cart],
          subtotal,
          discountTotal: itemDiscountsTotal + specialDiscount,
          taxTotal,
          grandTotal,
          paidAmount: paid,
          changeAmount,
          paymentMethod,
          cardType: paymentMethod === 'CARD' ? cardType : undefined,
          cardBank: paymentMethod === 'CARD' ? cardBank : undefined,
          customer,
          cashierName: user?.name || 'Cashier',
          terminalName: session.terminal_code || `Terminal #${session.pos_terminal_id}`,
          notes: salesNote,
        };

        setLastCompletedSale(receiptData);

        if (autoPrint) {
          setReceiptModalOpen(true);
        }

        // Reset Sale
        clearSale();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete sale. Check inventory and cashier session.');
      playSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Global F-Keys & Keyboard Shortcuts Handler
  // ----------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modifier keys like Alt are pressed
      if (e.altKey) return;

      // F2: Barcode Focus
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
        return;
      }

      // F3: Item Search Modal
      if (e.key === 'F3') {
        e.preventDefault();
        setProductSearchModalOpen(true);
        return;
      }

      // F4: Discount % Focus
      if (e.key === 'F4') {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
        return;
      }

      // F6: Hold Sale
      if (e.key === 'F6') {
        e.preventDefault();
        // Trigger hold if cart has items
        if (cart.length > 0) {
          posApi.holdSale({
            pos_session_id: session?.id,
            customer_id: customer?.id,
            items: cart.map((i) => ({
              product_variant_id: i.product_variant_id,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
          });
          clearSale();
          playSound('beep');
        }
        return;
      }

      // F7: Customer Mobile Focus
      if (e.key === 'F7') {
        e.preventDefault();
        customerMobileInputRef.current?.focus();
        customerMobileInputRef.current?.select();
        return;
      }

      // F8: Customer Search Modal
      if (e.key === 'F8') {
        e.preventDefault();
        setCustomerModalOpen(true);
        return;
      }

      // F9: Staff Selector Focus
      if (e.key === 'F9') {
        e.preventDefault();
        staffSelectRef.current?.focus();
        return;
      }

      // F11: Card Type Selector
      if (e.key === 'F11') {
        e.preventDefault();
        setPaymentMethod('CARD');
        cardTypeSelectRef.current?.focus();
        return;
      }

      // F12: Tendered / Paid Amount Focus
      if (e.key === 'F12') {
        e.preventDefault();
        tenderedInputRef.current?.focus();
        tenderedInputRef.current?.select();
        return;
      }

      // Ctrl + Enter: Save / Complete Sale
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleCompleteSale();
        return;
      }

      // Ctrl + N: New Sale
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        clearSale();
        return;
      }

      // Delete key: Remove selected cart item
      if (e.key === 'Delete' && selectedRowIndex !== null && !productSearchModalOpen && !customerModalOpen && !receiptModalOpen) {
        e.preventDefault();
        removeItem(selectedRowIndex);
        return;
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (productSearchModalOpen) setProductSearchModalOpen(false);
        else if (customerModalOpen) setCustomerModalOpen(false);
        else if (receiptModalOpen) setReceiptModalOpen(false);
        else if (sessionModalOpen && sessionModalMode === 'close') setSessionModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    session,
    cart,
    customer,
    specialDiscount,
    numericTendered,
    grandTotal,
    dueAmount,
    paymentMethod,
    cardType,
    cardBank,
    cardApprovalCode,
    salesNote,
    selectedRowIndex,
    productSearchModalOpen,
    customerModalOpen,
    receiptModalOpen,
    sessionModalOpen,
    sessionModalMode,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-800 font-sans select-none overflow-hidden">
      {/* ==================================================== */}
      {/* 1. TOP HEADER & METADATA BAR (High Density)          */}
      {/* ==================================================== */}
      <header className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between border-b border-slate-700 shadow-xs shrink-0 text-xs">
        {/* Left: Terminal Info & Record / Draft No */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            title="Exit POS to Dashboard"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1">
              <Building className="w-4 h-4 text-emerald-400" />
              {company?.name || 'RETAILCORE'}
            </span>
            <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-slate-700">
              POS TERMINAL {session?.terminal_code ? `[${session.terminal_code}]` : '#1'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span>RECORD:</span>
            <span className="font-bold text-slate-200">
              RC-{session ? session.id : '1'}-{cart.length + 1}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Center: Live Stock Quantity Badge */}
        <div className="flex items-center gap-2">
          {lastScannedStock !== null && (
            <div className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] flex items-center gap-1.5">
              <span className="text-slate-400">AVAILABLE STOCK:</span>
              <span
                className={`font-bold ${
                  lastScannedStock > 10
                    ? 'text-emerald-400'
                    : lastScannedStock > 0
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {lastScannedStock.toFixed(2)} PCS
              </span>
            </div>
          )}
        </div>

        {/* Right: Cashier / Staff Selector & Session Controls */}
        <div className="flex items-center gap-2">
          {/* Staff Selector [F9] */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            <span className="text-[10px] text-slate-400 font-mono font-bold">F9 STAFF:</span>
            <select
              ref={staffSelectRef}
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
              className="bg-transparent text-white text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              {staffUsers.length > 0 ? (
                staffUsers.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name}
                  </option>
                ))
              ) : (
                <option value={user?.id || 1} className="bg-slate-900 text-white">
                  {user?.name || 'Cashier'}
                </option>
              )}
            </select>
          </div>

          {/* Session Status & Close Button */}
          {session ? (
            <button
              onClick={() => {
                setSessionModalMode('close');
                setSessionModalOpen(true);
              }}
              title="Close POS Session"
              className="px-2 py-1 bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Close Session
            </button>
          ) : (
            <button
              onClick={() => {
                setSessionModalMode('open');
                setSessionModalOpen(true);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded flex items-center gap-1 transition-colors"
            >
              Open Session
            </button>
          )}
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. SUB-HEADER: BARCODE SCANNER & CUSTOMER INFO       */}
      {/* ==================================================== */}
      <div className="bg-white px-3 py-2 border-b border-slate-300 grid grid-cols-12 gap-3 shrink-0 items-center">
        {/* Barcode-First Input Box (Cols 1-7) */}
        <div className="col-span-12 md:col-span-7 flex gap-2">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-1.5">
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 font-mono text-[11px] font-bold">
                <BarcodeIcon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">F2</span>
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan Barcode / Enter SKU and Press Enter..."
                className={`w-full pl-14 pr-3 py-1.5 text-sm font-mono font-bold border-2 rounded-md transition-all focus:outline-hidden ${
                  scanStatus === 'error'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500'
                    : scanStatus === 'success'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 focus:ring-2 focus:ring-emerald-500'
                    : 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-md transition-colors"
            >
              Scan
            </button>
          </form>

          {/* F3 Product Search Button */}
          <button
            onClick={() => setProductSearchModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>F3 Search</span>
          </button>
        </div>

        {/* Customer Search & Mobile Box (Cols 8-12) */}
        <div className="col-span-12 md:col-span-5 flex items-center gap-2">
          {/* Quick Mobile Input [F7] */}
          <div className="relative flex-1">
            <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              ref={customerMobileInputRef}
              type="text"
              value={customerMobileQuery}
              onChange={(e) => handleCustomerMobileLookup(e.target.value)}
              placeholder="F7 Client Mobile..."
              className="w-full pl-7 pr-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Customer Selection Button [F8] */}
          <button
            onClick={() => setCustomerModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-colors truncate shrink-0 max-w-[200px] ${
              customer
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{customer ? customer.name : 'Walk-in [F8]'}</span>
          </button>

          {customer && (
            <button
              onClick={() => {
                setCustomer(null);
                setCustomerMobileQuery('');
              }}
              title="Reset to Walk-in Customer"
              className="p-1 text-slate-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Non-intrusive Scan Feedback Banner */}
      {scanMessage && (
        <div className="bg-rose-100 text-rose-800 text-xs px-3 py-1 font-semibold flex items-center justify-between border-b border-rose-200">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{scanMessage}</span>
          </div>
          <button onClick={() => setScanMessage(null)} className="p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-600 text-white text-xs px-4 py-1.5 font-semibold flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-white hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. MAIN WORKSPACE: CART GRID (Left) & PAYMENT (Right) */}
      {/* ==================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN: HIGH DENSITY CART TABLE                 */}
        {/* ---------------------------------------------------- */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-slate-300">
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              /* Empty State with Keyboard Shortcuts Help */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <ShoppingCart className="w-14 h-14 text-slate-300 mb-3" />
                <h3 className="font-bold text-base text-slate-700">Counter Ready — Cart is Empty</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Scan a barcode via USB scanner, type an SKU, or press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono font-bold text-slate-800">F3</kbd> to search products.
                </p>

                {/* Keyboard Shortcut Cheat Sheet Table */}
                <div className="mt-6 w-full max-w-md bg-slate-50 border border-slate-200 rounded-md p-3 text-xs">
                  <h4 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1 text-[11px] uppercase tracking-wider">
                    Retail Keyboard Shortcut Matrix
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-left font-mono text-[11px]">
                    <div><kbd className="font-bold text-blue-700">F2</kbd> Focus Barcode</div>
                    <div><kbd className="font-bold text-blue-700">F3</kbd> Item Search</div>
                    <div><kbd className="font-bold text-blue-700">F4</kbd> Discount %</div>
                    <div><kbd className="font-bold text-blue-700">F6</kbd> Hold Sale</div>
                    <div><kbd className="font-bold text-blue-700">F7</kbd> Client Mobile</div>
                    <div><kbd className="font-bold text-blue-700">F8</kbd> Client Directory</div>
                    <div><kbd className="font-bold text-blue-700">F11</kbd> Card Mode</div>
                    <div><kbd className="font-bold text-blue-700">F12</kbd> Tendered Paid</div>
                    <div><kbd className="font-bold text-emerald-700">Ctrl+Enter</kbd> Save Sale</div>
                    <div><kbd className="font-bold text-slate-700">Ctrl+N</kbd> New Sale</div>
                  </div>
                </div>
              </div>
            ) : (
              /* DENSE RETAIL TABLE */
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-200/90 text-slate-700 font-bold sticky top-0 border-b border-slate-300 uppercase tracking-wider text-[11px] z-10">
                  <tr>
                    <th className="py-2 px-2 text-center w-8">#</th>
                    <th className="py-2 px-2.5">Barcode / SKU</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2 text-right">Stock</th>
                    <th className="py-2 px-3 text-center w-28">Quantity</th>
                    <th className="py-2 px-2 text-right">Rate (৳)</th>
                    <th className="py-2 px-2 text-center w-20">Dis %</th>
                    <th className="py-2 px-2 text-right">Total (৳)</th>
                    {applyVat && <th className="py-2 px-2 text-right">VAT (৳)</th>}
                    <th className="py-2 px-2.5 text-right font-extrabold text-slate-900">Net Total (৳)</th>
                    <th className="py-2 px-2 text-center w-10">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {cart.map((item, idx) => {
                    const isSelected = selectedRowIndex === idx;
                    const stock = item.available_stock;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRowIndex(idx)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-100 font-semibold ring-1 ring-blue-500 text-blue-900'
                            : 'hover:bg-slate-50 odd:bg-white even:bg-slate-50/60 text-slate-800'
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900 truncate max-w-[110px]" title={item.barcode}>
                          {item.barcode}
                        </td>
                        <td className="py-1.5 px-3 font-sans">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          {item.variant_name && item.variant_name !== item.sku && (
                            <span className="text-[10px] text-slate-500 ml-1">({item.variant_name})</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 font-sans text-slate-600">{item.category_name}</td>
                        <td className="py-1.5 px-2 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              stock > 10
                                ? 'bg-emerald-100 text-emerald-800'
                                : stock > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {stock.toFixed(0)}
                          </span>
                        </td>
                        {/* Qty +/- and Input */}
                        <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, item.quantity - 1)}
                              className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => updateItemQty(idx, parseFloat(e.target.value) || 1)}
                              className="w-12 text-center font-bold text-xs focus:outline-hidden py-0.5 bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, item.quantity + 1)}
                              className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right">{item.unit_price.toFixed(2)}</td>
                        {/* Inline Item Discount % */}
                        <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discount_percent}
                            onChange={(e) => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 text-center font-bold border border-slate-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                        {applyVat && (
                          <td className="py-1.5 px-2 text-right text-slate-600">
                            {item.tax_amount.toFixed(2)}
                          </td>
                        )}
                        <td className="py-1.5 px-2.5 text-right font-extrabold text-slate-900">
                          {item.line_total.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            title="Remove item (Del)"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN: HIGH VISIBILITY SUMMARY & PAYMENT      */}
        {/* ---------------------------------------------------- */}
        <div className="w-[380px] lg:w-[420px] bg-slate-50 flex flex-col h-full border-l border-slate-300 overflow-y-auto">
          {/* Top Stat Tiles: Total Bill, Paid Amount, Change */}
          <div className="p-3 bg-white border-b border-slate-300 space-y-2">
            {/* TOTAL BILL (Green Hero Tile) */}
            <div className="bg-emerald-700 text-white rounded-md p-2.5 flex items-center justify-between shadow-xs">
              <span className="font-bold text-xs uppercase tracking-wider">TOTAL BILL:</span>
              <span className="font-mono font-extrabold text-2xl tracking-tight">
                ৳ {grandTotal.toFixed(2)}
              </span>
            </div>

            {/* CASH PAID & CHANGE / RETURN (2 Columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800 text-white rounded-md p-2 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">PAID AMOUNT</span>
                <span className="font-mono font-bold text-lg text-blue-300">
                  ৳ {numericTendered.toFixed(2)}
                </span>
              </div>

              <div
                className={`rounded-md p-2 flex flex-col justify-between ${
                  dueAmount > 0
                    ? 'bg-rose-700 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-white/80">
                  {dueAmount > 0 ? 'DUE AMOUNT' : 'CHANGE / RETURN'}
                </span>
                <span className="font-mono font-bold text-lg">
                  ৳ {dueAmount > 0 ? dueAmount.toFixed(2) : changeAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total Qty & Loyalty Points Bar */}
            <div className="pt-1.5 flex justify-between items-center text-[11px] font-mono text-slate-600 border-t border-slate-200">
              <div>
                <span>Items: <strong className="text-slate-900">{cart.length}</strong></span>
                <span className="mx-2">|</span>
                <span>Qty: <strong className="text-slate-900">{totalQty.toFixed(2)}</strong></span>
              </div>
              <div className="text-slate-400 font-medium">
                Pts: N/A
              </div>
            </div>
          </div>

          {/* Pricing Breakdown & Discount Fields */}
          <div className="p-3 border-b border-slate-300 bg-white space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-semibold text-slate-900">৳ {subtotal.toFixed(2)}</span>
            </div>

            {itemDiscountsTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Item Discounts:</span>
                <span>-৳ {itemDiscountsTotal.toFixed(2)}</span>
              </div>
            )}

            {/* Special / Invoice Discount [F4] */}
            <div className="flex items-center justify-between py-1 border-y border-dashed border-slate-200">
              <span className="text-slate-700 font-sans font-semibold flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-slate-400" />
                F4 Discount:
              </span>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                  <input
                    ref={discountInputRef}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={discountPercent}
                    onChange={(e) => {
                      setDiscountPercent(e.target.value);
                      setDiscountAmount('0');
                    }}
                    placeholder="%"
                    className="w-12 text-center py-0.5 text-xs font-bold focus:outline-hidden"
                  />
                  <span className="bg-slate-100 text-slate-500 px-1 text-[10px] font-bold">%</span>
                </div>
                <span className="text-slate-400 font-sans">or</span>
                <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountAmount}
                    onChange={(e) => {
                      setDiscountAmount(e.target.value);
                      setDiscountPercent('0');
                    }}
                    placeholder="Tk"
                    className="w-14 text-center py-0.5 text-xs font-bold focus:outline-hidden"
                  />
                  <span className="bg-slate-100 text-slate-500 px-1 text-[10px] font-bold">Tk</span>
                </div>
              </div>
            </div>

            {applyVat && (
              <div className="flex justify-between text-slate-600">
                <span>VAT / Tax:</span>
                <span className="font-semibold text-slate-900">৳ {taxTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-300">
              <span>NET PAYABLE:</span>
              <span className="text-emerald-700">৳ {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="p-3 bg-slate-100 border-b border-slate-300 space-y-2.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-1 text-xs font-bold rounded border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-1 text-xs font-bold rounded border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CARD'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card [F11]</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BKASH')}
                className={`py-2 px-1 text-xs font-bold rounded border flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'BKASH'
                    ? 'bg-pink-600 border-pink-600 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>bKash / MFS</span>
              </button>
            </div>

            {/* If Card Payment: Card Type & Bank Controls */}
            {paymentMethod === 'CARD' && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">F11 CARD TYPE</label>
                    <select
                      ref={cardTypeSelectRef}
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                    >
                      <option value="VISA">Visa Card</option>
                      <option value="MASTERCARD">MasterCard</option>
                      <option value="AMEX">American Express</option>
                      <option value="NEXUS">DBBL Nexus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">CARD BANK</label>
                    <select
                      value={cardBank}
                      onChange={(e) => setCardBank(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold"
                    >
                      <option value="City Bank">City Bank</option>
                      <option value="BRAC Bank">BRAC Bank</option>
                      <option value="DBBL">DBBL</option>
                      <option value="EBL">Eastern Bank</option>
                      <option value="SCB">Standard Chartered</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">APPROVAL / REF CODE</label>
                  <input
                    type="text"
                    value={cardApprovalCode}
                    onChange={(e) => setCardApprovalCode(e.target.value)}
                    placeholder="Terminal auth code / transaction reference"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Tendered / Paid Amount Input [F12] */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">
                  F12 Tendered Cash (৳)
                </label>
                <button
                  type="button"
                  onClick={() => setTenderedAmount(grandTotal.toFixed(2))}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Exact Cash
                </button>
              </div>

              <input
                ref={tenderedInputRef}
                type="number"
                min="0"
                step="any"
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border-2 border-slate-400 rounded font-mono font-bold text-lg text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500"
              />

              {/* Quick Cash Add Buttons */}
              <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[11px]">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(tenderedAmount) || 0;
                      setTenderedAmount((cur + amt).toFixed(2));
                    }}
                    className="py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded font-bold text-slate-700 transition-colors shadow-2xs"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 4. BOTTOM ACTION & TOOLBAR (Keyboard-Driven)        */}
      {/* ==================================================== */}
      <footer className="bg-slate-900 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 shrink-0 text-xs">
        {/* Left Options: Sales Note, Apply VAT, Auto Print */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <input
            type="text"
            value={salesNote}
            onChange={(e) => setSalesNote(e.target.value)}
            placeholder="Sales remarks or customer memo..."
            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={applyVat}
              onChange={(e) => setApplyVat(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>Apply VAT / Tax</span>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0"
            />
            <span>Auto Print</span>
          </label>
        </div>

        {/* Right Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* F6 Hold Sale */}
          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) {
                posApi.holdSale({
                  pos_session_id: session?.id,
                  customer_id: customer?.id,
                  items: cart.map((i) => ({
                    product_variant_id: i.product_variant_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                  })),
                });
                clearSale();
                playSound('beep');
              }
            }}
            disabled={cart.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-50"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>HOLD [F6]</span>
          </button>

          {/* Ctrl+N New Sale */}
          <button
            type="button"
            onClick={clearSale}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>NEW [Ctrl+N]</span>
          </button>

          {/* LARGE PRIMARY SAVE & PAY BUTTON [Ctrl+Enter] */}
          <button
            type="button"
            disabled={isSubmitting || cart.length === 0}
            onClick={handleCompleteSale}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-md font-bold text-sm tracking-wide flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{isSubmitting ? 'PROCESSING...' : 'SAVE SALE [Ctrl+Enter]'}</span>
          </button>
        </div>
      </footer>

      {/* ==================================================== */}
      {/* 5. SUPPORTING MODALS                                  */}
      {/* ==================================================== */}
      <PosProductSearchModal
        isOpen={productSearchModalOpen}
        onClose={() => setProductSearchModalOpen(false)}
        onSelectProduct={(product) => {
          addProductToCart(product);
          playSound('beep');
        }}
      />

      <PosCustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelectCustomer={(c) => {
          setCustomer(c);
          if (c?.mobile) {
            setCustomerMobileQuery(c.mobile);
          }
        }}
        selectedCustomerId={customer?.id}
      />

      <PosReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        saleData={lastCompletedSale}
        companyName={company?.name || 'RETAILCORE SUPERSTORE'}
        companyAddress={company?.address || 'Dhaka, Bangladesh'}
        companyPhone={company?.phone || '+880 1700-000000'}
        companyBin={company?.tax_number || 'BIN-0012345678-0101'}
      />

      <PosSessionModal
        isOpen={sessionModalOpen}
        mode={sessionModalMode}
        onClose={() => setSessionModalOpen(false)}
        currentSession={session}
        onSessionOpened={(s) => setSession(s)}
        onSessionClosed={() => {
          clearSale();
          setSession(null);
          setSessionModalMode('open');
          setSessionModalOpen(true);
        }}
        cashierName={user?.name || 'Cashier'}
        cashSalesTotal={totalSessionCashSales}
      />
    </div>
  );
}
