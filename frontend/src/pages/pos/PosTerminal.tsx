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
  Gift,
  Coins,
  Star,
  Layers,
  Split,
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
  PosHeldSale,
  PaymentMethod,
  CustomerPoints,
} from '../../api/pos';
import { Customer, customersApi } from '../../api/customers';
import { PosReceiptModal } from './PosReceiptModal';
import { PosProductSearchModal } from './PosProductSearchModal';
import { PosCustomerModal } from './PosCustomerModal';
import { PosSessionModal } from './PosSessionModal';
import { PosHoldModal } from './PosHoldModal';

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

  // Loyalty & Points state
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints | null>(null);
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);
  const [pointsInput, setPointsInput] = useState<string>('0');

  // Payment state
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BKASH' | 'NAGAD' | 'BANK'>(
    () => initialBackup?.paymentMethod || 'CASH'
  );
  const [tenderedAmount, setTenderedAmount] = useState<string>(() => initialBackup?.tenderedAmount || '');
  const [cardType, setCardType] = useState('VISA');
  const [cardBank, setCardBank] = useState('City Bank');
  const [cardApprovalCode, setCardApprovalCode] = useState('');
  const [mfsTransactionRef, setMfsTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Split Tender State
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitTenders, setSplitTenders] = useState<Array<{
    id: string;
    method: string;
    amount: string;
    transaction_ref?: string;
    card_type?: string;
    card_bank?: string;
  }>>([]);

  // Modals state
  const [productSearchModalOpen, setProductSearchModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [heldSalesCount, setHeldSalesCount] = useState(0);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);

  // Live Product Search Dropdown state
  const [searchResults, setSearchResults] = useState<PosProductVariant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState<number>(-1);
  const searchTimeoutRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const res = await posApi.getPaymentMethods({ is_active: true });
      if (res.success && Array.isArray(res.data)) {
        setAvailablePaymentMethods(res.data);
      }
    } catch {
      // Fallback silently to default system methods
    }
  };

  // Fetch customer loyalty points when customer changes
  useEffect(() => {
    if (customer?.id) {
      posApi.getCustomerPoints(customer.id)
        .then((res) => {
          if (res.success && res.data) {
            setCustomerPoints(res.data);
          } else {
            setCustomerPoints(null);
          }
        })
        .catch(() => setCustomerPoints(null));
    } else {
      setCustomerPoints(null);
      setRedeemedPoints(0);
      setPointsInput('0');
    }
  }, [customer?.id]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus barcode input on mount and whenever modals close
  useEffect(() => {
    if (!productSearchModalOpen && !customerModalOpen && !receiptModalOpen && !sessionModalOpen && !holdModalOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 80);
    }
  }, [productSearchModalOpen, customerModalOpen, receiptModalOpen, sessionModalOpen, holdModalOpen]);

  const refreshHeldSalesCount = async (sessionId?: number) => {
    try {
      const sid = sessionId ?? session?.id;
      const res = await posApi.getHeldSales(sid);
      if (res.success && Array.isArray(res.data)) {
        setHeldSalesCount(res.data.length);
      }
    } catch {
      // Ignore background error
    }
  };

  useEffect(() => {
    if (session?.id) {
      refreshHeldSalesCount(session.id);
    }
  }, [session?.id]);

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

  // ----------------------------------------------------
  // Loyalty & Payment Calculations
  // ----------------------------------------------------
  const hasAnyDiscount = useMemo(() => {
    return (itemDiscountsTotal > 0.0001) || (specialDiscount > 0.0001);
  }, [itemDiscountsTotal, specialDiscount]);

  const redemptionRate = useMemo(() => {
    return customerPoints?.redemption_rate ? Number(customerPoints.redemption_rate) : 1.0;
  }, [customerPoints]);

  const pointsMonetaryValue = useMemo(() => {
    return Math.round(redeemedPoints * redemptionRate * 100) / 100;
  }, [redeemedPoints, redemptionRate]);

  const remainingGrandTotal = useMemo(() => {
    return Math.max(0, Math.round((grandTotal - pointsMonetaryValue) * 100) / 100);
  }, [grandTotal, pointsMonetaryValue]);

  // Points earned on current sale: 1 pt per ৳100 spent, 0 if discount or redemption applied
  const potentialPointsEarned = useMemo(() => {
    if (!customer) return 0;
    if (hasAnyDiscount || redeemedPoints > 0) return 0;
    return Math.floor(subtotal / 100);
  }, [customer, hasAnyDiscount, redeemedPoints, subtotal]);

  // Maximum redeemable points: min 400 pts, max min(balance, grandTotal)
  const maxRedeemablePoints = useMemo(() => {
    if (!customerPoints || hasAnyDiscount) return 0;
    const balance = customerPoints.points_balance || 0;
    if (balance < 400) return 0;
    const maxByTotal = Math.floor(grandTotal / redemptionRate);
    return Math.min(balance, maxByTotal);
  }, [customerPoints, hasAnyDiscount, grandTotal, redemptionRate]);

  // Split Tenders Sum
  const splitTendersSum = useMemo(() => {
    return splitTenders.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [splitTenders]);

  // Total tender provided across payment channels + points
  const totalTenderProvided = useMemo(() => {
    if (isSplitPayment) {
      return Math.round((splitTendersSum + pointsMonetaryValue) * 100) / 100;
    }
    const tender = parseFloat(tenderedAmount) || 0;
    const nonCashPaid = paymentMethod === 'CASH' ? tender : remainingGrandTotal;
    return Math.round((nonCashPaid + pointsMonetaryValue) * 100) / 100;
  }, [isSplitPayment, splitTendersSum, pointsMonetaryValue, tenderedAmount, paymentMethod, remainingGrandTotal]);

  // Paid amount and change
  const numericTendered = useMemo(() => {
    return parseFloat(tenderedAmount) || 0;
  }, [tenderedAmount]);

  const changeAmount = useMemo(() => {
    if (isSplitPayment) return 0; // Split overpayment is strictly rejected
    if (paymentMethod === 'CASH') {
      if (numericTendered > remainingGrandTotal) {
        return Math.round((numericTendered - remainingGrandTotal) * 100) / 100;
      }
    }
    return 0;
  }, [isSplitPayment, paymentMethod, numericTendered, remainingGrandTotal]);

  const dueAmount = useMemo(() => {
    if (isSplitPayment) {
      if (totalTenderProvided < grandTotal) {
        return Math.round((grandTotal - totalTenderProvided) * 100) / 100;
      }
      return 0;
    }
    if (paymentMethod === 'CASH') {
      if (numericTendered < remainingGrandTotal) {
        return Math.round((remainingGrandTotal - numericTendered) * 100) / 100;
      }
      return 0;
    }
    return 0;
  }, [isSplitPayment, totalTenderProvided, grandTotal, paymentMethod, numericTendered, remainingGrandTotal]);

  // Sync Tendered amount with remaining Grand Total by default if Cash
  useEffect(() => {
    if (remainingGrandTotal >= 0 && (!tenderedAmount || parseFloat(tenderedAmount) === 0 || !isSplitPayment)) {
      setTenderedAmount(remainingGrandTotal.toFixed(2));
    }
  }, [remainingGrandTotal, isSplitPayment]);

  // ----------------------------------------------------
  // Barcode Scanning, Live Search & Adding Product
  // ----------------------------------------------------
  const handleBarcodeInputTextChange = (value: string) => {
    setBarcodeInput(value);
    setScanStatus('idle');
    setScanMessage(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await posApi.searchProducts(trimmed);
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setSearchResults(res.data);
            setSearchDropdownOpen(true);
            setHighlightedSearchIndex(0);
          } else {
            setSearchResults([]);
            setSearchDropdownOpen(false);
            setHighlightedSearchIndex(-1);
          }
        } catch {
          setSearchResults([]);
          setSearchDropdownOpen(false);
          setHighlightedSearchIndex(-1);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    } else {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      setHighlightedSearchIndex(-1);
      setIsSearching(false);
    }
  };

  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchDropdownOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchDropdownOpen(false);
      setHighlightedSearchIndex(-1);
    }
  };

  const validateAndAddProduct = (variant: PosProductVariant): boolean => {
    const stock = Number(variant.available_stock ?? 0);
    setLastScannedStock(stock);

    // Stock validation: available stock must be >= 1
    if (stock < 1) {
      setScanStatus('error');
      setScanMessage(`"${variant.product?.name || variant.sku}" is OUT OF STOCK (Stock: 0)`);
      playSound('error');
      barcodeInputRef.current?.select();
      return false;
    }

    // Check if adding one more exceeds available stock
    const existing = cart.find((i) => i.product_variant_id === variant.id);
    const currentCartQty = existing ? existing.quantity : 0;
    if (currentCartQty + 1 > stock) {
      setScanStatus('error');
      setScanMessage(
        `Cannot add more. Insufficient stock for "${variant.product?.name || variant.sku}"! (Only ${stock} available, ${currentCartQty} in cart)`
      );
      playSound('error');
      barcodeInputRef.current?.select();
      return false;
    }

    addProductToCart(variant);
    setBarcodeInput('');
    setSearchResults([]);
    setSearchDropdownOpen(false);
    setHighlightedSearchIndex(-1);
    setScanStatus('success');
    setScanMessage(`Added "${variant.product?.name || variant.sku}" (Stock: ${stock})`);
    playSound('beep');
    barcodeInputRef.current?.focus();
    return true;
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // If live dropdown is active and an item is highlighted, select that item
    if (searchDropdownOpen && highlightedSearchIndex >= 0 && searchResults[highlightedSearchIndex]) {
      validateAndAddProduct(searchResults[highlightedSearchIndex]);
      return;
    }

    const code = barcodeInput.trim();
    if (!code) return;

    try {
      setScanStatus('idle');
      setScanMessage(null);
      const res = await posApi.getBarcode(code);
      if (res.success && res.data) {
        validateAndAddProduct(res.data);
      }
    } catch (err: any) {
      // Fallback: Check if search results already contain matching SKU or barcode
      if (searchResults.length > 0) {
        const exactMatch = searchResults.find(
          (s) =>
            s.sku.toLowerCase() === code.toLowerCase() ||
            s.barcodes?.some((b) => b.barcode.toLowerCase() === code.toLowerCase())
        );
        if (exactMatch) {
          validateAndAddProduct(exactMatch);
          return;
        }
      }
      setScanStatus('error');
      setScanMessage(`Barcode / SKU "${code}" not found`);
      playSound('error');
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

    const item = cart[index];
    if (item && item.available_stock > 0 && newQty > item.available_stock) {
      setScanStatus('error');
      setScanMessage(
        `Cannot set quantity to ${newQty}. Only ${item.available_stock} available in stock for "${item.name}".`
      );
      playSound('error');
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      const target = updated[index];
      const lineDiscount = (target.unit_price * newQty * target.discount_percent) / 100;
      const lineTax = applyVat ? ((target.unit_price * newQty - lineDiscount) * target.tax_rate) / 100 : 0;
      const lineTotal = target.unit_price * newQty - lineDiscount + lineTax;

      updated[index] = {
        ...target,
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
    setRedeemedPoints(0);
    setPointsInput('0');
    setIsSplitPayment(false);
    setSplitTenders([]);
    setCustomerPoints(null);
    setMfsTransactionRef('');
    barcodeInputRef.current?.focus();
  };

  // ----------------------------------------------------
  // Hold & Resume Sale Actions (F6)
  // ----------------------------------------------------
  const handleHoldCurrentCart = async (): Promise<boolean> => {
    if (cart.length === 0) return false;
    try {
      const payload = {
        pos_session_id: session?.id,
        customer_id: customer?.id || null,
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount_amount,
          tax: i.tax_amount,
        })),
        sale_discount: specialDiscount,
        discount_total: itemDiscountsTotal + specialDiscount,
        tax_total: taxTotal,
        grand_total: grandTotal,
        notes: salesNote || undefined,
      };

      const res = await posApi.holdSale(payload);
      if (res.success) {
        clearSale();
        playSound('beep');
        setScanStatus('success');
        setScanMessage(`Held current sale as ${res.data?.invoice_number || 'HELD'}`);
        if (session?.id) {
          refreshHeldSalesCount(session.id);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to hold sale.');
      playSound('error');
      return false;
    }
  };

  const handleResumeSale = async (heldSale: PosHeldSale, action: 'replace' | 'hold_and_replace') => {
    if (action === 'hold_and_replace' && cart.length > 0) {
      const ok = await handleHoldCurrentCart();
      if (!ok) return;
    }

    // Convert heldSale.items into CartItem[]
    const restoredItems: CartItem[] = (heldSale.items || []).map((item) => {
      const unitPrice = Number(item.unit_price);
      const qty = Number(item.quantity);
      const discount = Number(item.discount || 0);
      const tax = Number(item.tax || 0);
      const lineTotal = Number(item.line_total || qty * unitPrice - discount + tax);
      const discPct = qty * unitPrice > 0 ? (discount / (qty * unitPrice)) * 100 : 0;
      const taxRate = qty * unitPrice - discount > 0 ? (tax / (qty * unitPrice - discount)) * 100 : 0;

      return {
        id: `${item.product_variant_id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product_variant_id: item.product_variant_id,
        barcode: item.barcode_snapshot || item.sku_snapshot,
        sku: item.sku_snapshot,
        name: item.product_name_snapshot,
        variant_name: item.variant_description_snapshot || '',
        category_name: 'General',
        quantity: qty,
        unit_price: unitPrice,
        discount_percent: Math.round(discPct * 100) / 100,
        discount_amount: discount,
        tax_rate: Math.round(taxRate * 100) / 100,
        tax_amount: tax,
        line_total: lineTotal,
        available_stock: 999, // default stock placeholder
      };
    });

    setCart(restoredItems);
    setSelectedRowIndex(restoredItems.length > 0 ? 0 : null);
    setCustomer(heldSale.customer || null);
    setCustomerMobileQuery(heldSale.customer?.mobile || '');
    setSalesNote(heldSale.notes || '');

    // Discard the held record from backend so it cannot be double resumed
    await posApi.deleteHeldSale(heldSale.id);
    if (session?.id) {
      refreshHeldSalesCount(session.id);
    }

    playSound('beep');
    setScanStatus('success');
    setScanMessage(`Resumed held invoice ${heldSale.invoice_number}`);
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

    // Validation: Point redemption rules
    if (redeemedPoints > 0) {
      if (!customer) {
        setErrorMessage('Walk-in customers cannot redeem loyalty points.');
        playSound('error');
        return;
      }
      if (hasAnyDiscount) {
        setErrorMessage('Point redemption cannot be combined with discounts. Please clear discounts first.');
        playSound('error');
        return;
      }
      if (redeemedPoints < 400) {
        setErrorMessage('Minimum 400 points required to redeem.');
        playSound('error');
        return;
      }
      if (customerPoints && redeemedPoints > customerPoints.points_balance) {
        setErrorMessage(`Customer has only ${customerPoints.points_balance} points available.`);
        playSound('error');
        return;
      }
      if (pointsMonetaryValue > grandTotal + 0.0001) {
        setErrorMessage('Points redemption value cannot exceed Grand Total.');
        playSound('error');
        return;
      }
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
    if (redeemedPoints > 0) {
      paymentsData.push({
        method: 'POINT_REDEMPTION' as any,
        amount: pointsMonetaryValue,
      });
    }

    if (isSplitPayment) {
      for (const tender of splitTenders) {
        const amt = parseFloat(tender.amount) || 0;
        if (amt > 0) {
          paymentsData.push({
            method: tender.method as any,
            amount: amt,
            card_type: tender.method === 'CARD' ? (tender.card_type || cardType) : undefined,
            card_bank: tender.method === 'CARD' ? (tender.card_bank || cardBank) : undefined,
            transaction_ref: tender.transaction_ref || undefined,
          });
        }
      }
    } else {
      // Single tender mode
      const remaining = Math.max(0, grandTotal - pointsMonetaryValue);
      const paid = numericTendered > 0 ? numericTendered : remaining;
      if (paid > 0 || remaining === 0) {
        if (paid > 0) {
          paymentsData.push({
            method: paymentMethod,
            amount: paid,
            card_type: paymentMethod === 'CARD' ? cardType : undefined,
            card_bank: paymentMethod === 'CARD' ? cardBank : undefined,
            transaction_ref: paymentMethod === 'CARD' ? cardApprovalCode : (mfsTransactionRef || undefined),
          });
        }
      }
    }

    // Overpayment and Underpayment checks
    const totalPaid = paymentsData.reduce((s, p) => s + p.amount, 0);
    const isSingleCash = !isSplitPayment && redeemedPoints === 0 && paymentMethod === 'CASH';

    if (totalPaid > grandTotal + 0.0001) {
      if (!isSingleCash) {
        setErrorMessage(
          `Payment total (৳${totalPaid.toFixed(2)}) exceeds Grand Total (৳${grandTotal.toFixed(2)}). Overpayment is not permitted in multi-tender or digital payments.`
        );
        playSound('error');
        return;
      }
    }

    if (totalPaid < grandTotal - 0.0001) {
      if (!customer) {
        setErrorMessage(
          `Walk-in customer cannot have a due balance. Total paid: ৳${totalPaid.toFixed(2)}, required: ৳${grandTotal.toFixed(2)}.`
        );
        playSound('error');
        tenderedInputRef.current?.focus();
        return;
      }
    }

    const payload: CompleteSaleData = {
      pos_session_id: session.id,
      customer_id: customer ? customer.id : null,
      items: itemsData,
      sale_discount: specialDiscount,
      payments: paymentsData,
      points_redeemed: redeemedPoints > 0 ? redeemedPoints : undefined,
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
        const cashSum = paymentsData
          .filter((p) => String(p.method).toUpperCase() === 'CASH')
          .reduce((s, p) => s + p.amount, 0);
        if (cashSum > 0) {
          setTotalSessionCashSales((prev) => prev + Math.min(cashSum, grandTotal));
        }

        const receiptData = {
          invoiceNumber: completed.invoice_number || `INV-${Date.now()}`,
          saleDate: completed.created_at ? new Date(completed.created_at).toLocaleString() : new Date().toLocaleString(),
          items: [...cart],
          subtotal,
          discountTotal: itemDiscountsTotal + specialDiscount,
          taxTotal,
          grandTotal,
          paidAmount: isSingleCash ? Math.min(numericTendered, grandTotal) : totalPaid,
          changeAmount,
          paymentMethod: isSplitPayment
            ? 'SPLIT'
            : redeemedPoints > 0
            ? `${paymentMethod} + PTS`
            : paymentMethod,
          cardType: paymentMethod === 'CARD' ? cardType : undefined,
          cardBank: paymentMethod === 'CARD' ? cardBank : undefined,
          customer,
          cashierName: user?.name || 'Cashier',
          terminalName: session.terminal_code || `Terminal #${session.pos_terminal_id}`,
          notes: salesNote,
          pointsRedeemed: redeemedPoints > 0 ? redeemedPoints : undefined,
          pointsEarned: potentialPointsEarned,
          customerPointsBalance: customer
            ? (customerPoints
                ? customerPoints.points_balance - redeemedPoints + potentialPointsEarned
                : 0)
            : undefined,
          payments: paymentsData.map((p) => ({
            method: p.method,
            amount: p.amount,
            transaction_ref: p.transaction_ref,
          })),
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

      // F5: Customer Quick Select / Mobile Focus
      if (e.key === 'F5') {
        e.preventDefault();
        customerMobileInputRef.current?.focus();
        customerMobileInputRef.current?.select();
        return;
      }

      // F6: Hold / Resume Invoice Modal
      if (e.key === 'F6') {
        e.preventDefault();
        setHoldModalOpen(true);
        return;
      }

      // F7: Customer Mobile Focus
      if (e.key === 'F7') {
        e.preventDefault();
        customerMobileInputRef.current?.focus();
        customerMobileInputRef.current?.select();
        return;
      }

      // F8: Customer Search Directory Modal
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

      // F10: Pay / Tendered Amount Focus
      if (e.key === 'F10') {
        e.preventDefault();
        tenderedInputRef.current?.focus();
        tenderedInputRef.current?.select();
        return;
      }

      // F11: Card Type Selector
      if (e.key === 'F11') {
        e.preventDefault();
        setPaymentMethod('CARD');
        cardTypeSelectRef.current?.focus();
        return;
      }

      // F12: Cash Mode & Tendered Amount Focus
      if (e.key === 'F12') {
        e.preventDefault();
        setPaymentMethod('CASH');
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
      if (e.key === 'Delete' && selectedRowIndex !== null && !productSearchModalOpen && !customerModalOpen && !receiptModalOpen && !holdModalOpen) {
        e.preventDefault();
        removeItem(selectedRowIndex);
        return;
      }

      // Escape: Close modals & live dropdown
      if (e.key === 'Escape') {
        if (searchDropdownOpen) setSearchDropdownOpen(false);
        else if (holdModalOpen) setHoldModalOpen(false);
        else if (productSearchModalOpen) setProductSearchModalOpen(false);
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
    holdModalOpen,
    searchDropdownOpen,
    searchResults,
    highlightedSearchIndex,
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
      {/* 1.1 TOP SHORTCUT MATRIX BAR (Strict Serial Order)    */}
      {/* ==================================================== */}
      <div className="bg-slate-800 text-slate-300 px-3 py-1 border-b border-slate-700 flex items-center justify-between text-[11px] overflow-x-auto whitespace-nowrap gap-1">
        <div className="flex items-center gap-1.5 font-mono">
          <button
            type="button"
            onClick={() => {
              barcodeInputRef.current?.focus();
              barcodeInputRef.current?.select();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-emerald-400">F2</kbd> Scan
          </button>
          <button
            type="button"
            onClick={() => setProductSearchModalOpen(true)}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-blue-400">F3</kbd> Search
          </button>
          <button
            type="button"
            onClick={() => {
              discountInputRef.current?.focus();
              discountInputRef.current?.select();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-amber-400">F4</kbd> Discount
          </button>
          <button
            type="button"
            onClick={() => {
              customerMobileInputRef.current?.focus();
              customerMobileInputRef.current?.select();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-cyan-400">F5</kbd> Customer
          </button>
          <button
            type="button"
            onClick={() => setHoldModalOpen(true)}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors relative"
          >
            <kbd className="font-bold text-amber-300">F6</kbd> Hold
            {heldSalesCount > 0 && (
              <span className="ml-0.5 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[9px]">
                {heldSalesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              customerMobileInputRef.current?.focus();
              customerMobileInputRef.current?.select();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-indigo-400">F7</kbd> Mobile
          </button>
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-purple-400">F8</kbd> Directory
          </button>
          <button
            type="button"
            onClick={() => staffSelectRef.current?.focus()}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-teal-400">F9</kbd> Staff
          </button>
          <button
            type="button"
            onClick={() => {
              tenderedInputRef.current?.focus();
              tenderedInputRef.current?.select();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-emerald-400">F10</kbd> Pay
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('CARD');
              cardTypeSelectRef.current?.focus();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-blue-400">F11</kbd> Card
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('CASH');
              tenderedInputRef.current?.focus();
              tenderedInputRef.current?.select();
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-green-400">F12</kbd> Cash
          </button>
          <button
            type="button"
            onClick={handleCompleteSale}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-emerald-300">Ctrl+Enter</kbd> Save
          </button>
          <button
            type="button"
            onClick={clearSale}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-rose-300">Ctrl+N</kbd> New
          </button>
          <button
            type="button"
            onClick={() => {
              setHoldModalOpen(false);
              setProductSearchModalOpen(false);
              setCustomerModalOpen(false);
              setReceiptModalOpen(false);
              setSearchDropdownOpen(false);
            }}
            className="px-1.5 py-0.5 bg-slate-700/80 hover:bg-slate-700 rounded text-slate-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <kbd className="font-bold text-slate-300">Esc</kbd> Close
          </button>
        </div>

        {/* Auto-print checkbox toggle in shortcut bar */}
        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none font-sans shrink-0 ml-2">
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
            className="rounded border-slate-600 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
          />
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>Auto-Print</span>
        </label>
      </div>

      {/* ==================================================== */}
      {/* 2. SUB-HEADER: BARCODE SCANNER & CUSTOMER INFO       */}
      {/* ==================================================== */}
      <div className="bg-white px-3 py-2 border-b border-slate-300 grid grid-cols-12 gap-3 shrink-0 items-center">
        {/* Barcode-First Input Box with Live Dropdown (Cols 1-7) */}
        <div className="col-span-12 md:col-span-7 flex gap-2">
          <div ref={searchContainerRef} className="relative flex-1">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5">
              <div className="relative flex-1">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 font-mono text-[11px] font-bold">
                  <BarcodeIcon className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">F2</span>
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => handleBarcodeInputTextChange(e.target.value)}
                  onKeyDown={handleBarcodeInputKeyDown}
                  placeholder="Scan Barcode / Enter SKU / Type Product Name..."
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

            {/* Live Search Floating Dropdown */}
            {searchDropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-md shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Found {searchResults.length} matching item(s)</span>
                  <span className="text-slate-400">Use ↑↓ to navigate, Enter to select</span>
                </div>
                {searchResults.map((variant, idx) => {
                  const isHighlighted = idx === highlightedSearchIndex;
                  const stock = Number(variant.available_stock ?? 0);
                  const isOutOfStock = stock <= 0;
                  const primaryBarcode =
                    variant.barcodes?.find((b) => b.is_primary)?.barcode ||
                    variant.barcodes?.[0]?.barcode ||
                    variant.sku;

                  return (
                    <div
                      key={variant.id}
                      onClick={() => validateAndAddProduct(variant)}
                      onMouseEnter={() => setHighlightedSearchIndex(idx)}
                      className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                        isHighlighted
                          ? 'bg-blue-600 text-white'
                          : isOutOfStock
                          ? 'bg-rose-50/50 hover:bg-rose-50 text-slate-700'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold truncate ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                            {variant.product?.name || variant.variant_name}
                          </span>
                          {variant.variant_name && variant.variant_name !== variant.sku && (
                            <span className={`text-[10px] ${isHighlighted ? 'text-blue-100' : 'text-slate-500'}`}>
                              ({variant.variant_name})
                            </span>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-2 font-mono text-[10px] ${
                            isHighlighted ? 'text-blue-200' : 'text-slate-500'
                          }`}
                        >
                          <span>SKU: {variant.sku}</span>
                          <span>•</span>
                          <span>BC: {primaryBarcode}</span>
                          <span>•</span>
                          <span>{variant.product?.category?.name || 'General'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div className="font-mono font-bold text-sm">
                          ৳ {Number(variant.selling_price || 0).toFixed(2)}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isHighlighted
                              ? 'bg-white/20 text-white'
                              : isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : stock < 5
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'OUT OF STOCK' : `Stock: ${stock.toFixed(0)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
        <div
          className={`text-xs px-3 py-1 font-semibold flex items-center justify-between border-b ${
            scanStatus === 'error'
              ? 'bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {scanStatus === 'error' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
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
                <div className="mt-6 w-full max-w-lg bg-slate-50 border border-slate-200 rounded-md p-3.5 text-xs shadow-2xs">
                  <h4 className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1 text-[11px] uppercase tracking-wider flex items-center justify-between">
                    <span>Retail Keyboard Shortcut Matrix</span>
                    <span className="text-[10px] text-slate-400 font-mono">Serial Order F2–Esc</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-left font-mono text-[11px]">
                    <div><kbd className="font-bold text-emerald-700">F2</kbd> Focus Barcode Scan</div>
                    <div><kbd className="font-bold text-blue-700">F3</kbd> Item Catalog Search</div>
                    <div><kbd className="font-bold text-amber-700">F4</kbd> Overall Discount %</div>
                    <div><kbd className="font-bold text-cyan-700">F5</kbd> Select Customer</div>
                    <div><kbd className="font-bold text-amber-600">F6</kbd> Hold / Resume Invoices</div>
                    <div><kbd className="font-bold text-indigo-700">F7</kbd> Client Mobile Lookup</div>
                    <div><kbd className="font-bold text-purple-700">F8</kbd> Client Directory (Quick Add)</div>
                    <div><kbd className="font-bold text-teal-700">F9</kbd> Cashier / Staff Select</div>
                    <div><kbd className="font-bold text-emerald-700">F10</kbd> Pay / Tendered Focus</div>
                    <div><kbd className="font-bold text-blue-700">F11</kbd> Card Payment Mode</div>
                    <div><kbd className="font-bold text-green-700">F12</kbd> Cash Payment Mode</div>
                    <div><kbd className="font-bold text-emerald-800">Ctrl+Enter</kbd> Save & Complete Sale</div>
                    <div><kbd className="font-bold text-rose-700">Ctrl+N</kbd> New Sale / Clear Cart</div>
                    <div><kbd className="font-bold text-slate-700">Esc</kbd> Close Modals / Cancel</div>
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
              <div className="text-slate-700 font-medium flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Pts: <strong>{customer ? `${customerPoints?.points_balance ?? 0}` : 'Walk-in'}</strong></span>
                {customer && (
                  <span className="text-[10px] text-emerald-700 ml-1">
                    (+{potentialPointsEarned} earn)
                  </span>
                )}
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
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                    <input
                      ref={discountInputRef}
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      disabled={redeemedPoints > 0}
                      value={discountPercent}
                      onChange={(e) => {
                        setDiscountPercent(e.target.value);
                        setDiscountAmount('0');
                      }}
                      placeholder="%"
                      className="w-12 text-center py-0.5 text-xs font-bold focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="bg-slate-100 text-slate-500 px-1 text-[10px] font-bold">%</span>
                  </div>
                  <span className="text-slate-400 font-sans">or</span>
                  <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={redeemedPoints > 0}
                      value={discountAmount}
                      onChange={(e) => {
                        setDiscountAmount(e.target.value);
                        setDiscountPercent('0');
                      }}
                      placeholder="Tk"
                      className="w-14 text-center py-0.5 text-xs font-bold focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="bg-slate-100 text-slate-500 px-1 text-[10px] font-bold">Tk</span>
                  </div>
                </div>
                {redeemedPoints > 0 && (
                  <span className="text-[10px] text-amber-700 italic">Discounts disabled during point redemption</span>
                )}
              </div>
            </div>

            {applyVat && (
              <div className="flex justify-between text-slate-600">
                <span>VAT / Tax:</span>
                <span className="font-semibold text-slate-900">৳ {taxTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-300">
              <span>GRAND TOTAL:</span>
              <span className="text-emerald-700">৳ {grandTotal.toFixed(2)}</span>
            </div>

            {redeemedPoints > 0 && (
              <div className="flex justify-between font-bold text-xs text-purple-700 pt-0.5">
                <span className="flex items-center gap-1 font-sans">
                  <Gift className="w-3.5 h-3.5 text-purple-600" />
                  Points Redeemed ({redeemedPoints} pts):
                </span>
                <span>-৳ {pointsMonetaryValue.toFixed(2)}</span>
              </div>
            )}

            {redeemedPoints > 0 && (
              <div className="flex justify-between font-bold text-xs text-emerald-800 pt-1 border-t border-purple-200">
                <span>REMAINING PAYABLE:</span>
                <span>৳ {remainingGrandTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/* CUSTOMER LOYALTY POINTS & REDEMPTION PANEL        */}
          {/* -------------------------------------------------- */}
          <div className="p-3 bg-white border-b border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Gift className="w-4 h-4 text-purple-600" />
                <span>Loyalty Points</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                customer
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {customer ? `${customerPoints?.points_balance ?? 0} Pts (৳${((customerPoints?.points_balance ?? 0) * redemptionRate).toFixed(2)})` : 'Walk-in'}
              </span>
            </div>

            {!customer ? (
              <p className="text-[11px] text-slate-500 italic">
                Select a customer [F8] to view points balance and redeem.
              </p>
            ) : hasAnyDiscount ? (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Discounts active — Loyalty point redemption is not permitted when item or invoice discounts are applied.
                </span>
              </div>
            ) : (customerPoints?.points_balance || 0) < 400 ? (
              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between">
                <span>Min 400 points required to redeem.</span>
                <span className="font-bold text-slate-700">Need {400 - (customerPoints?.points_balance || 0)} more</span>
              </div>
            ) : (
              <div className="space-y-2 bg-purple-50/60 border border-purple-200 rounded p-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-purple-900">Redeem Points (1 Pt = ৳{redemptionRate.toFixed(2)}):</span>
                  {redeemedPoints > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRedeemedPoints(0);
                        setPointsInput('0');
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="400"
                    max={maxRedeemablePoints}
                    step="1"
                    value={pointsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPointsInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 400 && num <= maxRedeemablePoints) {
                        setRedeemedPoints(num);
                      } else if (isNaN(num) || num === 0) {
                        setRedeemedPoints(0);
                      }
                    }}
                    placeholder="Min 400"
                    className="w-24 px-2 py-1 bg-white border border-purple-300 rounded font-mono font-bold text-xs focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    disabled={maxRedeemablePoints < 400}
                    onClick={() => {
                      setRedeemedPoints(400);
                      setPointsInput('400');
                    }}
                    className="px-2 py-1 bg-white border border-purple-300 hover:bg-purple-100 rounded text-[11px] font-bold text-purple-700 transition-colors disabled:opacity-50"
                  >
                    400 Pts
                  </button>
                  <button
                    type="button"
                    disabled={maxRedeemablePoints < 400}
                    onClick={() => {
                      setRedeemedPoints(maxRedeemablePoints);
                      setPointsInput(String(maxRedeemablePoints));
                    }}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold transition-colors disabled:opacity-50"
                  >
                    Max ({maxRedeemablePoints})
                  </button>
                </div>

                {redeemedPoints > 0 ? (
                  <div className="text-[11px] text-purple-900 font-bold flex justify-between items-center bg-white px-2 py-1 rounded border border-purple-200">
                    <span>Applied: {redeemedPoints} Pts</span>
                    <span className="text-emerald-700">-৳{pointsMonetaryValue.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-purple-700 italic">
                    Earns 0 points on sale when redemption is used. Discounts locked.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/* PAYMENT TENDER (Single or Multi-Tender)            */}
          {/* -------------------------------------------------- */}
          <div className="p-3 bg-slate-100 border-b border-slate-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Payment Tender
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !isSplitPayment;
                  setIsSplitPayment(next);
                  if (next && splitTenders.length === 0) {
                    setSplitTenders([
                      {
                        id: 'tender-1',
                        method: paymentMethod,
                        amount: remainingGrandTotal > 0 ? remainingGrandTotal.toFixed(2) : '0',
                      },
                    ]);
                  }
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 border transition-colors ${
                  isSplitPayment
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{isSplitPayment ? 'Multi-Tender ON' : 'Enable Multi-Tender'}</span>
              </button>
            </div>

            {!isSplitPayment ? (
              /* SINGLE TENDER FLOW */
              <div className="space-y-2.5">
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
                    <span>Cash [F12]</span>
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

                {/* If Card Payment */}
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

                {/* If bKash / MFS */}
                {paymentMethod === 'BKASH' && (
                  <div className="p-2 bg-pink-50 border border-pink-200 rounded space-y-1 text-xs">
                    <label className="block text-[10px] font-bold text-slate-600">TRX ID / REF</label>
                    <input
                      type="text"
                      value={mfsTransactionRef}
                      onChange={(e) => setMfsTransactionRef(e.target.value)}
                      placeholder="e.g. TRX-9B7A21"
                      className="w-full bg-white border border-pink-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                )}

                {/* Tendered Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">
                      {paymentMethod === 'CASH' ? 'F12 Tendered Cash (৳)' : 'Tender Amount (৳)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setTenderedAmount(remainingGrandTotal.toFixed(2))}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Exact (৳{remainingGrandTotal.toFixed(2)})
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

                  {paymentMethod === 'CASH' && (
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
                  )}
                </div>
              </div>
            ) : (
              /* MULTI-TENDER / SPLIT PAYMENT FLOW */
              <div className="space-y-2">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {redeemedPoints > 0 && (
                    <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded p-1.5 text-xs font-mono">
                      <div className="w-24 text-[10px] font-bold text-purple-900 flex items-center gap-1">
                        <Gift className="w-3 h-3 text-purple-600" />
                        <span>POINTS</span>
                      </div>
                      <div className="flex-1 font-bold text-purple-900">
                        ৳ {pointsMonetaryValue.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-purple-600 font-sans italic pr-2">Locked</span>
                    </div>
                  )}

                  {splitTenders.map((row, idx) => (
                    <div key={row.id} className="flex items-center gap-1.5 bg-white border border-slate-300 rounded p-1.5 text-xs">
                      <select
                        value={row.method}
                        onChange={(e) => {
                          const updated = [...splitTenders];
                          updated[idx] = { ...updated[idx], method: e.target.value };
                          setSplitTenders(updated);
                        }}
                        className="w-24 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-[11px] font-bold"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BKASH">bKash</option>
                        <option value="NAGAD">Nagad</option>
                        <option value="BANK">Bank</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.amount}
                        onChange={(e) => {
                          const updated = [...splitTenders];
                          updated[idx] = { ...updated[idx], amount: e.target.value };
                          setSplitTenders(updated);
                        }}
                        placeholder="0.00"
                        className="w-24 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-xs"
                      />

                      <input
                        type="text"
                        value={row.transaction_ref || ''}
                        onChange={(e) => {
                          const updated = [...splitTenders];
                          updated[idx] = { ...updated[idx], transaction_ref: e.target.value };
                          setSplitTenders(updated);
                        }}
                        placeholder="Ref / Trx"
                        className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-mono"
                      />

                      {splitTenders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSplitTenders(splitTenders.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Remove tender line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const curSum = splitTenders.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                      const needed = Math.max(0, remainingGrandTotal - curSum);
                      setSplitTenders([
                        ...splitTenders,
                        {
                          id: `tender-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                          method: 'CASH',
                          amount: needed > 0 ? needed.toFixed(2) : '0',
                        },
                      ]);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Payment Line</span>
                  </button>

                  <span className="text-[11px] font-mono text-slate-600">
                    Tender Sum: <strong>৳{totalTenderProvided.toFixed(2)}</strong>
                  </span>
                </div>

                {/* Live Multi-Tender Reconciliation Status Banner */}
                {(() => {
                  const diff = totalTenderProvided - grandTotal;
                  if (Math.abs(diff) <= 0.0001) {
                    return (
                      <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 font-bold flex items-center justify-between">
                        <span>✓ Balanced: ৳{totalTenderProvided.toFixed(2)} / ৳{grandTotal.toFixed(2)}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    );
                  }
                  if (diff > 0.0001) {
                    return (
                      <div className="p-2 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800 font-bold flex items-start justify-between gap-1.5">
                        <div>
                          <div>❌ Overpayment: +৳{diff.toFixed(2)}</div>
                          <div className="text-[10px] font-normal text-rose-700">
                            Multi-tender overpayment is rejected. Must match Grand Total exactly.
                          </div>
                        </div>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      </div>
                    );
                  }
                  return (
                    <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-800 font-bold flex items-start justify-between gap-1.5">
                      <div>
                        <div>⚠️ Underpayment: -৳{(-diff).toFixed(2)}</div>
                        <div className="text-[10px] font-normal text-amber-700">
                          {customer ? 'Remainder will post to Accounts Receivable.' : 'Walk-in customer must pay full amount.'}
                        </div>
                      </div>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    </div>
                  );
                })()}
              </div>
            )}
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
            onClick={() => setHoldModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 relative"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>HOLD [F6]</span>
            {heldSalesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                {heldSalesCount}
              </span>
            )}
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

      <PosHoldModal
        isOpen={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        sessionId={session?.id}
        currentCart={cart}
        currentGrandTotal={grandTotal}
        onHoldCurrentCart={handleHoldCurrentCart}
        onResumeSale={handleResumeSale}
        onCountUpdate={(count) => setHeldSalesCount(count)}
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
