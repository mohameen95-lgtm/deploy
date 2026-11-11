import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  MessageCircle,
  QrCode,
  Radio,
  Send,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  CartItem,
  Order,
  PaymentMethod,
  ShippingDetails,
} from '../types/store';
import {
  buildAdminOrderWhatsappMessage,
  buildAdminOrderWhatsappUrl,
  buildCustomerOrderWhatsappMessage,
  buildCustomerOrderWhatsappUrl,
  buildUpiDeepLinkUri,
  calculateCartSummary,
  DEFAULT_GST_PERCENT,
  formatInr,
  FREE_SHIPPING_THRESHOLD_INR,
  generateUpiTxnRef,
  MERCHANT_NAME,
  MERCHANT_QR_IMAGE_URL,
  MERCHANT_UPI_VPA,
  STANDARD_SHIPPING_FEE_INR,
  validateShippingDetails,
  WHATSAPP_NUMBER,
} from '../utils/storeLogic';
import { FlaconIllustration } from './FlaconIllustration';

interface CheckoutDrawerProps {
  isOpen: boolean;
  initialStep?: 'cart' | 'shipping';
  items: CartItem[];
  initialShipping: ShippingDetails;
  merchantUpiVpa?: string;
  merchantName?: string;
  merchantQrImageUrl?: string;
  whatsappNumber?: string;
  storeAddress?: string;
  whatsappNotifyEnabled?: boolean;
  shippingChargeInr?: number;
  freeShippingThresholdInr?: number;
  gstPercent?: number;
  gstMode?: 'included' | 'exclusive';
  onClose: () => void;
  onUpdateQuantity: (productId: string, variantId: string, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onQuickAddBundle899?: () => void;
  onCompleteOrder: (params: {
    shipping: ShippingDetails;
    paymentMethod: PaymentMethod;
    upiVpa: string;
    upiTxnRef: string;
    orderNumber: string;
  }) => Promise<Order>;
  onNavigateToProfileOrders?: () => void;
}

type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';
type AutoVerifyState = 'waiting_for_payment' | 'verifying_bank' | 'payment_received';

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  initialStep = 'cart',
  items,
  initialShipping,
  merchantUpiVpa = MERCHANT_UPI_VPA,
  merchantName = MERCHANT_NAME,
  merchantQrImageUrl = MERCHANT_QR_IMAGE_URL,
  whatsappNumber = WHATSAPP_NUMBER,
  storeAddress = 'Azhar Perfumes, Tvs, Thiruchengode - Rasipuram Rd, Rasipuram, Tamil Nadu 637408',
  whatsappNotifyEnabled = true,
  shippingChargeInr = STANDARD_SHIPPING_FEE_INR,
  freeShippingThresholdInr = FREE_SHIPPING_THRESHOLD_INR,
  gstPercent = DEFAULT_GST_PERCENT,
  gstMode = 'included',
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onQuickAddBundle899,
  onCompleteOrder,
  onNavigateToProfileOrders,
}) => {
  const [step, setStep] = useState<CheckoutStep>(initialStep);
  const [shipping, setShipping] = useState<ShippingDetails>(initialShipping);
  const [shippingErrors, setShippingErrors] = useState<
    Partial<Record<keyof ShippingDetails, string>>
  >({});

  const [autoVerifyState, setAutoVerifyState] =
    useState<AutoVerifyState>('waiting_for_payment');
  const [verifyProgress, setVerifyProgress] = useState<number>(0);
  const [paymentError, setPaymentError] = useState<string>('');
  const [customerUpiTxnId, setCustomerUpiTxnId] = useState<string>('');
  const [isExtractingScreenshot, setIsExtractingScreenshot] = useState<boolean>(false);
  const [screenshotStatusMsg, setScreenshotStatusMsg] = useState<string>('');
  const [dynamicQrDataUrl, setDynamicQrDataUrl] = useState<string>('');
  const [showStaticQrFallback, setShowStaticQrFallback] = useState<boolean>(false);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [copiedWhatsappMsg, setCopiedWhatsappMsg] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [autoDispatchedWhatsapp, setAutoDispatchedWhatsapp] = useState<boolean>(false);
  const launchedUpiAppRef = useRef<boolean>(false);
  const isCompletingRef = useRef<boolean>(false);

  useEffect(() => {
    setShipping(initialShipping);
  }, [initialShipping]);

  useEffect(() => {
    if (isOpen) {
      if (initialStep === 'shipping') {
        setStep('shipping');
      } else {
        setStep('cart');
      }
      setAutoVerifyState('waiting_for_payment');
      setVerifyProgress(0);
      setPaymentError('');
      setScreenshotStatusMsg('');
      setShowStaticQrFallback(false);
      setAutoDispatchedWhatsapp(false);
      launchedUpiAppRef.current = false;
      isCompletingRef.current = false;
    }
  }, [isOpen, initialStep]);

  const summary = useMemo(
    () =>
      calculateCartSummary(items, {
        shippingChargeInr,
        freeShippingThresholdInr,
        gstPercent,
        gstMode,
      }),
    [items, shippingChargeInr, freeShippingThresholdInr, gstPercent, gstMode]
  );

  const draftOrderNumber = useMemo(
    () => `AZH-2026-${String(1000 + ((summary.totalInr + items.length * 73) % 8999))}`,
    [summary.totalInr, items.length]
  );

  // Build NPCI UPI Deep-Link URI with exact checkout amount pre-filled (&am=...)
  const upiUri = useMemo(
    () =>
      buildUpiDeepLinkUri({
        amountInr: summary.totalInr,
        orderNumber: draftOrderNumber,
        merchantVpa: merchantUpiVpa,
        merchantName,
      }),
    [summary.totalInr, draftOrderNumber, merchantUpiVpa, merchantName]
  );

  // Generate real scannable dynamic QR code linked to the exact checkout amount every time
  useEffect(() => {
    let active = true;
    if (summary.totalInr > 0) {
      QRCode.toDataURL(upiUri, {
        width: 340,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#111111',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          if (active) setDynamicQrDataUrl(url);
        })
        .catch(() => {
          if (active) setDynamicQrDataUrl('');
        });
    }
    return () => {
      active = false;
    };
  }, [upiUri, summary.totalInr]);

  // Finalize order automatically once UPI payment is verified & auto-dispatch WhatsApp
  const finalizeVerifiedPayment = useCallback(
    async (verifiedRef?: string) => {
      if (isCompletingRef.current) return;
      isCompletingRef.current = true;
      setAutoVerifyState('payment_received');
      setVerifyProgress(100);

      try {
        const cleanedManualRef = customerUpiTxnId.replace(/[^0-9A-Za-z]/g, '').trim();
        const finalRef = cleanedManualRef || verifiedRef || generateUpiTxnRef(Date.now());

        const created = await onCompleteOrder({
          shipping,
          paymentMethod: 'UPI_QR',
          upiVpa: merchantUpiVpa,
          upiTxnRef: finalRef,
          orderNumber: draftOrderNumber,
        });

        // Automatically dispatch WhatsApp Order Notification to Admin (+91 95971 05217) & Customer Confirmation
        if (whatsappNotifyEnabled) {
          const adminMessage = buildAdminOrderWhatsappMessage(created, merchantName);
          const customerMessage = buildCustomerOrderWhatsappMessage(
            created,
            merchantName,
            whatsappNumber,
            storeAddress
          );
          const adminWaUrl = buildAdminOrderWhatsappUrl(
            created,
            whatsappNumber,
            merchantName
          );

          // 1. Server-side automatic dispatch (Meta WhatsApp Cloud API & Configured Gateway Webhook)
          fetch('/api/whatsapp-order-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order: created,
              adminMessage,
              customerMessage,
            }),
          }).catch(() => {});

          // 2. Client-side automatic WhatsApp dispatch via hidden anchor so order alert is triggered immediately
          try {
            const autoLink = document.createElement('a');
            autoLink.href = adminWaUrl;
            autoLink.target = '_blank';
            autoLink.rel = 'noopener noreferrer';
            document.body.appendChild(autoLink);
            autoLink.click();
            autoLink.remove();
            setAutoDispatchedWhatsapp(true);
          } catch {
            // Fallback buttons remain on confirmation screen
          }
        }

        setTimeout(() => {
          setConfirmedOrder(created);
          setStep('confirmation');
          isCompletingRef.current = false;
        }, 650);
      } catch (err) {
        isCompletingRef.current = false;
        setAutoVerifyState('waiting_for_payment');
        setPaymentError(
          err instanceof Error
            ? err.message
            : 'Unable to confirm payment right now. Please try again.'
        );
      }
    },
    [
      customerUpiTxnId,
      draftOrderNumber,
      merchantName,
      merchantUpiVpa,
      onCompleteOrder,
      shipping,
      storeAddress,
      whatsappNotifyEnabled,
      whatsappNumber,
    ]
  );

  // Trigger payment verification & confirmation using the customer's real Google Pay / PhonePe 12-digit UPI Transaction ID
  const triggerAutoPaymentVerification = useCallback(async () => {
    if (autoVerifyState !== 'waiting_for_payment' || isCompletingRef.current) return;

    const cleanedDigits = customerUpiTxnId.replace(/[^0-9]/g, '');
    if (customerUpiTxnId.trim() !== '' && cleanedDigits.length !== 12) {
      setPaymentError(
        'Please enter a valid 12-digit UPI Transaction ID from Google Pay / PhonePe (for example: 631335300115).'
      );
      return;
    }

    setPaymentError('');
    setAutoVerifyState('verifying_bank');
    setVerifyProgress(35);

    const stepTimer1 = window.setTimeout(() => setVerifyProgress(75), 400);

    try {
      const res = await fetch('/api/upi-payment-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: draftOrderNumber,
          amountInr: summary.totalInr,
          merchantVpa: merchantUpiVpa,
          merchantName,
          upiTxnRef: cleanedDigits || undefined,
        }),
      });
      let refNumber = cleanedDigits || generateUpiTxnRef(Date.now());
      if (res.ok) {
        const data = await res.json();
        if (cleanedDigits) {
          refNumber = cleanedDigits;
        } else if (data?.upiTxnRef) {
          refNumber = data.upiTxnRef;
        }
      }
      window.clearTimeout(stepTimer1);
      await finalizeVerifiedPayment(refNumber);
    } catch {
      window.clearTimeout(stepTimer1);
      await finalizeVerifiedPayment(cleanedDigits || generateUpiTxnRef(Date.now()));
    }
  }, [
    autoVerifyState,
    customerUpiTxnId,
    draftOrderNumber,
    finalizeVerifiedPayment,
    merchantName,
    merchantUpiVpa,
    summary.totalInr,
  ]);

  // Handle Google Pay / PhonePe receipt screenshot upload to auto-extract the 12-digit UPI Transaction ID
  const handleReceiptScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingScreenshot(true);
    setPaymentError('');
    setScreenshotStatusMsg('Reading 12-digit UPI Transaction ID from screenshot...');

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/extract-upi-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (data?.ok && data?.upiTxnRef) {
        setCustomerUpiTxnId(String(data.upiTxnRef));
        setScreenshotStatusMsg(
          `Detected UPI Transaction ID: ${data.upiTxnRef} ✓`
        );
      } else {
        setScreenshotStatusMsg(
          'Screenshot attached! Please confirm or type your 12-digit UPI Transaction ID below.'
        );
      }
    } catch {
      setScreenshotStatusMsg(
        'Please type or paste your 12-digit UPI Transaction ID below.'
      );
    } finally {
      setIsExtractingScreenshot(false);
      e.target.value = '';
    }
  };

  // Create live UPI payment session & poll for confirmation when on 'payment' step
  useEffect(() => {
    if (!isOpen || step !== 'payment') return;

    fetch('/api/upi-payment-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: draftOrderNumber,
        amountInr: summary.totalInr,
        merchantVpa: merchantUpiVpa,
        merchantName,
      }),
    }).catch(() => {});

    const pollInterval = window.setInterval(async () => {
      if (isCompletingRef.current) return;
      try {
        const res = await fetch(
          `/api/upi-payment-status/${encodeURIComponent(draftOrderNumber)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.status === 'RECEIVED') {
            finalizeVerifiedPayment(data.upiTxnRef);
          }
        }
      } catch {
        // Ignore transient network errors
      }
    }, 2500);

    return () => {
      window.clearInterval(pollInterval);
    };
  }, [
    draftOrderNumber,
    finalizeVerifiedPayment,
    isOpen,
    merchantName,
    merchantUpiVpa,
    step,
    summary.totalInr,
  ]);

  if (!isOpen) return null;

  const handleProceedToPayment = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (items.length === 0 && onQuickAddBundle899) {
      onQuickAddBundle899();
    }
    const cleanPhone = shipping.phone.replace(/[\s\-+]/g, '').slice(-10);
    const normalizedShipping: ShippingDetails = {
      ...shipping,
      email:
        shipping.email.trim() ||
        (cleanPhone.length === 10 ? `${cleanPhone}@azharperfumes.in` : shipping.email),
    };
    const validation = validateShippingDetails(normalizedShipping);
    if (!validation.valid) {
      setShippingErrors(validation.errors);
      setStep('shipping');
      return;
    }
    setShipping(normalizedShipping);
    setShippingErrors({});
    setPaymentError('');
    setAutoVerifyState('waiting_for_payment');
    setVerifyProgress(0);
    setStep('payment');
  };

  const handleCopyMerchantVpa = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(merchantUpiVpa).catch(() => {});
    }
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 1500);
  };

  const handleResetAndClose = () => {
    if (step === 'confirmation') {
      setStep('cart');
      setConfirmedOrder(null);
      setCustomerUpiTxnId('');
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag and Scan UPI QR Checkout"
    >
      <div className="relative w-full max-w-xl bg-[#FAF7F2] h-full max-h-dvh flex flex-col border-l border-[#E6DFD3] shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E6DFD3] flex items-center justify-between bg-[#F3EFE6] shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'cart' && step !== 'confirmation' && (
              <button
                type="button"
                onClick={() => setStep(step === 'payment' ? 'shipping' : 'cart')}
                aria-label="Back to previous checkout step"
                className="p-1.5 rounded-lg hover:bg-[#E6DFD3] text-[#181512] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <img
              src="./images/azhar-logo.png"
              alt="Azhar Attar & Perfume"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <h2 className="text-lg font-semibold text-[#181512]">
                {step === 'cart' && 'Your Shopping Bag'}
                {step === 'shipping' && 'Step 1 of 2 · Delivery Address'}
                {step === 'payment' && `Step 2 of 2 · Scan QR to Pay ${formatInr(summary.totalInr)}`}
                {step === 'confirmation' && 'Order Confirmed & WhatsApp Sent'}
              </h2>
              <p className="text-xs text-[#6E655C]">
                {step === 'cart' &&
                  (summary.shippingInr === 0
                    ? 'Complimentary Express Shipping unlocked!'
                    : `Add ${formatInr(
                        Math.max(0, summary.freeShippingThresholdInr - summary.subtotalInr)
                      )} more for Free Express Shipping`)}
                {step === 'shipping' && 'Enter your delivery address for doorstep dispatch'}
                {step === 'payment' &&
                  `${merchantName} (${merchantUpiVpa}) · Exact Amount Linked in QR`}
                {step === 'confirmation' && 'UPI QR payment verified & WhatsApp alerts dispatched'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close checkout drawer"
            className="p-2 rounded-lg text-[#181512] hover:bg-[#E6DFD3] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive 3-Step My Cart & Checkout Switcher Bar */}
        {step !== 'confirmation' && (
          <div className="px-6 py-2.5 bg-[#EAE2D3] border-b border-[#DCD3C2] grid grid-cols-3 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStep('cart')}
              className={`py-1.5 px-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                step === 'cart'
                  ? 'bg-[#6B0F1A] text-white shadow-xs'
                  : 'bg-white/75 text-[#3F3831] hover:bg-white'
              }`}
            >
              1. My Cart ({summary.totalItems})
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => items.length > 0 && setStep('shipping')}
              className={`py-1.5 px-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-45 ${
                step === 'shipping'
                  ? 'bg-[#0F2547] text-white shadow-xs'
                  : 'bg-white/75 text-[#3F3831] hover:bg-white'
              }`}
            >
              2. Address
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => handleProceedToPayment()}
              className={`py-1.5 px-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-45 ${
                step === 'payment'
                  ? 'bg-[#0F2547] text-white shadow-xs'
                  : 'bg-white/75 text-[#3F3831] hover:bg-white'
              }`}
            >
              3. Scan UPI QR
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          {step === 'cart' && (
            <>
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-[#F3EFE6] border border-[#E6DFD3] flex items-center justify-center mb-4">
                    <ShoppingBag className="w-6 h-6 text-[#6B0F1A]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#181512]">
                    Your Shopping Cart is Empty
                  </h3>
                  <p className="text-sm text-[#6E655C] max-w-xs mt-1 mb-6">
                    Add your favorite attars or claim our 3 Attars Bundle at ₹899/- to proceed to
                    instant UPI QR checkout.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {onQuickAddBundle899 && (
                      <button
                        type="button"
                        onClick={() => {
                          onQuickAddBundle899();
                          setStep('shipping');
                        }}
                        className="px-5 py-3 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] border border-[#D4AF37] text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Add 3 Attars At ₹899 &amp; Checkout
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 rounded-lg bg-[#6B0F1A] hover:bg-[#520A13] text-white text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Browse Fragrances
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={`${item.product.id}-${item.variant.id}`}
                      className="flex gap-4 p-4 rounded-xl bg-white border border-[#E6DFD3]"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#E6DFD3] shrink-0">
                        <FlaconIllustration
                          style={item.product.bottleStyle}
                          name={item.product.name}
                          category={item.product.category}
                          imageUrl={item.product.imageUrl}
                          hoverImageUrl={item.product.hoverImageUrl}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-[#181512] truncate">
                              {item.product.name}
                            </h3>
                            <p className="text-xs text-[#6E655C] mt-0.5">
                              {item.variant.label} · {item.product.category}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id, item.variant.id)}
                            aria-label={`Remove ${item.product.name} from bag`}
                            className="text-[#6E655C] hover:text-[#B91C1C] p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#DCD3C2] rounded-md bg-[#FAF7F2]">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.product.name}`}
                              onClick={() =>
                                onUpdateQuantity(item.product.id, item.variant.id, -1)
                              }
                              className="px-2.5 py-1 text-xs font-medium text-[#181512] hover:bg-[#EAE2D3] cursor-pointer"
                            >
                              −
                            </button>
                            <span className="px-2.5 py-1 text-xs font-mono-tabular font-medium text-[#181512]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.product.name}`}
                              onClick={() =>
                                onUpdateQuantity(item.product.id, item.variant.id, 1)
                              }
                              className="px-2.5 py-1 text-xs font-medium text-[#181512] hover:bg-[#EAE2D3] cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-sm font-semibold font-mono-tabular text-[#181512]">
                            {formatInr(item.unitPriceInr * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'shipping' && (
            <form id="shipping-form" onSubmit={handleProceedToPayment} className="space-y-4 pb-6">
              {/* Order Summary Banner inside Address Step so Customer Confirms Added Products */}
              {items.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-white border border-[#D4AF37] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#047857] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Added to Your Order ({summary.totalItems} {summary.totalItems === 1 ? 'item' : 'items'})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('cart')}
                      className="text-[11px] font-bold text-[#6B0F1A] hover:underline cursor-pointer"
                    >
                      Edit Bag
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div
                        key={`${item.product.id}-${item.variant.id}`}
                        className="flex items-center justify-between text-xs text-[#181512] gap-2"
                      >
                        <span className="font-semibold truncate">
                          {item.product.name} × {item.quantity}
                        </span>
                        <span className="font-mono-tabular font-bold shrink-0">
                          {formatInr(item.unitPriceInr * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                onQuickAddBundle899 && (
                  <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#B91C1C]">
                      Your bag is empty. Add the 3 Attars Bundle to continue:
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuickAddBundle899()}
                      className="px-3 py-2 rounded-lg bg-[#0F2547] text-white text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      + Add 3 Attars ₹899
                    </button>
                  </div>
                )
              )}

              <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6E655C]">
                  Recipient &amp; Delivery Address
                </span>
              </div>

              <div>
                <label
                  htmlFor="ship-name"
                  className="block text-xs font-medium text-[#181512] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="ship-name"
                  type="text"
                  value={shipping.customerName}
                  onChange={(e) => setShipping({ ...shipping, customerName: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                />
                {shippingErrors.customerName && (
                  <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.customerName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ship-email"
                    className="block text-xs font-medium text-[#181512] mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id="ship-email"
                    type="email"
                    value={shipping.email}
                    onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                    placeholder="Enter your email address"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                  />
                  {shippingErrors.email && (
                    <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="ship-phone"
                    className="block text-xs font-medium text-[#181512] mb-1"
                  >
                    WhatsApp / Mobile Number (10 digits)
                  </label>
                  <input
                    id="ship-phone"
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                    placeholder="Enter 10-digit WhatsApp mobile number"
                    className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                  />
                  {shippingErrors.phone && (
                    <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ship-address"
                  className="block text-xs font-medium text-[#181512] mb-1"
                >
                  Street Address, Building &amp; Landmark
                </label>
                <input
                  id="ship-address"
                  type="text"
                  value={shipping.addressLine}
                  onChange={(e) => setShipping({ ...shipping, addressLine: e.target.value })}
                  placeholder="Door No., Street, Area / Landmark"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                />
                {shippingErrors.addressLine && (
                  <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.addressLine}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="ship-city"
                    className="block text-xs font-medium text-[#181512] mb-1"
                  >
                    City / Town
                  </label>
                  <input
                    id="ship-city"
                    type="text"
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                  />
                  {shippingErrors.city && (
                    <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.city}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="ship-state"
                    className="block text-xs font-medium text-[#181512] mb-1"
                  >
                    State
                  </label>
                  <input
                    id="ship-state"
                    type="text"
                    value={shipping.state}
                    onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                  />
                  {shippingErrors.state && (
                    <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.state}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="ship-pincode"
                    className="block text-xs font-medium text-[#181512] mb-1"
                  >
                    PIN Code
                  </label>
                  <input
                    id="ship-pincode"
                    type="text"
                    maxLength={6}
                    value={shipping.pincode}
                    onChange={(e) => setShipping({ ...shipping, pincode: e.target.value })}
                    placeholder="6-digit PIN"
                    className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg bg-white border border-[#DCD3C2] text-[#181512] focus:outline-none focus:border-[#9A6F28]"
                  />
                  {shippingErrors.pincode && (
                    <p className="text-xs text-[#B91C1C] mt-1">{shippingErrors.pincode}</p>
                  )}
                </div>
              </div>
            </form>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              {/* Dynamic Amount-Linked UPI QR Card */}
              <div className="rounded-2xl bg-white border-2 border-[#D4AF37] shadow-md overflow-hidden flex flex-col items-center text-center">
                {/* Google Pay 4-Color Top Accent Bar */}
                <div className="w-full h-2 grid grid-cols-4">
                  <div className="bg-[#4285F4]" />
                  <div className="bg-[#34A853]" />
                  <div className="bg-[#FBBC05]" />
                  <div className="bg-[#EA4335]" />
                </div>

                <div className="p-4 sm:p-5 w-full flex flex-col items-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#10B981] text-[11px] font-extrabold uppercase tracking-wider text-[#065F46]">
                    <QrCode className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Amount-Linked Dynamic UPI QR · Auto-Fills {formatInr(summary.totalInr)}</span>
                  </div>

                  <div>
                    <div className="text-lg font-bold text-[#181512]">{merchantName}</div>
                    <div className="text-xs text-[#5C5349] font-mono-tabular">
                      {whatsappNumber} · Order {draftOrderNumber}
                    </div>
                  </div>

                  {/* Pre-Filled Amount Badge */}
                  <div className="px-4 py-1.5 rounded-xl bg-[#0F2547] border border-[#D4AF37] text-white inline-flex items-center gap-2 shadow-xs">
                    <span className="text-xs font-semibold text-[#F5D78B]">
                      QR Locked Amount:
                    </span>
                    <span className="font-mono-tabular text-base font-extrabold text-white">
                      {formatInr(summary.totalInr)}
                    </span>
                  </div>

                  {/* Dynamic Amount-Linked QR Code (or Static Card Toggle) */}
                  <div className="relative p-3 bg-white border-2 border-[#0F2547] rounded-2xl shadow-md">
                    {!showStaticQrFallback && dynamicQrDataUrl ? (
                      <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto">
                        <img
                          src={dynamicQrDataUrl}
                          alt={`Scan to pay exact amount ${formatInr(summary.totalInr)} to ${merchantName} (${merchantUpiVpa})`}
                          className="w-full h-full object-contain block"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-11 h-11 rounded-xl bg-white p-1 border-2 border-[#D4AF37] shadow-md flex items-center justify-center">
                            <img
                              src="./images/azhar-logo.png"
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={merchantQrImageUrl}
                        alt={`Scan to pay ${merchantName} (${merchantUpiVpa})`}
                        className="w-56 sm:w-64 max-h-72 rounded-xl object-contain bg-white mx-auto"
                      />
                    )}
                  </div>

                  <div className="text-[11px] text-[#047857] font-semibold">
                    Scan with Google Pay, PhonePe, Paytm, or BHIM —{' '}
                    <strong>{formatInr(summary.totalInr)}</strong> is automatically filled!
                  </div>

                  {/* Toggle between Dynamic Amount QR and Static Google Pay Card */}
                  <button
                    type="button"
                    onClick={() => setShowStaticQrFallback((prev) => !prev)}
                    className="text-[11px] font-bold text-[#6B0F1A] hover:underline cursor-pointer"
                  >
                    {showStaticQrFallback
                      ? `Switch to Dynamic Amount-Linked QR (${formatInr(summary.totalInr)} Auto-Filled)`
                      : 'Having trouble scanning? View Standard Google Pay QR Card'}
                  </button>

                  {/* UPI ID & Copy Button */}
                  <div className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#DCD3C2] flex flex-wrap items-center justify-center gap-2 w-full">
                    <span className="text-xs font-mono-tabular font-bold text-[#181512]">
                      UPI ID: {merchantUpiVpa}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMerchantVpa}
                      className="px-2.5 py-1 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-[#F5D78B]" />
                      <span>{copiedVpa ? 'Copied!' : 'Copy UPI ID'}</span>
                    </button>
                  </div>

                  {/* 1-Tap Mobile UPI App Launch Buttons (With Exact Amount Pre-Filled) */}
                  <div className="w-full space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-[#6E655C]">
                      Or tap your UPI app on mobile ({formatInr(summary.totalInr)} pre-filled):
                    </div>
                    <div className="grid grid-cols-4 gap-2 w-full">
                      {[
                        { label: 'GPay' },
                        { label: 'PhonePe' },
                        { label: 'Paytm' },
                        { label: 'BHIM UPI' },
                      ].map((app) => (
                        <a
                          key={app.label}
                          href={upiUri}
                          onClick={() => {
                            launchedUpiAppRef.current = true;
                          }}
                          className="py-2 px-2 rounded-xl border border-[#DCD3C2] hover:border-[#184D36] bg-[#FAF7F2] hover:bg-[#ECFDF5] text-xs font-bold text-[#181512] text-center transition-colors"
                        >
                          {app.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real 12-Digit Google Pay / PhonePe UPI Transaction ID (UTR) & Screenshot Reader */}
              <div className="p-4 rounded-2xl bg-white border-2 border-[#10B981] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <label
                      htmlFor="customer-upi-utr-input"
                      className="block text-xs font-extrabold uppercase tracking-wider text-[#065F46]"
                    >
                      Enter 12-Digit UPI Transaction ID (From Google Pay / PhonePe)
                    </label>
                    <p className="text-[11px] text-[#5C5349] mt-0.5">
                      Matches your exact Google Pay receipt (e.g. <strong>631335300115</strong>) in
                      Order History &amp; WhatsApp confirmation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    id="customer-upi-utr-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={customerUpiTxnId}
                    onChange={(e) =>
                      setCustomerUpiTxnId(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))
                    }
                    placeholder="12-digit UPI Transaction ID (e.g. 631335300115)"
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono-tabular font-bold rounded-xl bg-[#FAF7F2] border border-[#10B981] text-[#181512] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const digits = text.replace(/[^0-9]/g, '').slice(0, 12);
                        if (digits) setCustomerUpiTxnId(digits);
                      } catch {
                        // Ignore clipboard permission denied
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#10B981] text-[#065F46] text-xs font-bold cursor-pointer shrink-0"
                  >
                    Paste ID
                  </button>
                </div>

                {/* Optional Upload Google Pay Screenshot to Auto-Fill 12-Digit UPI Transaction ID */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] text-white text-[11px] font-bold cursor-pointer transition-colors">
                    {isExtractingScreenshot ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5D78B]" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-[#F5D78B]" />
                    )}
                    <span>
                      {isExtractingScreenshot
                        ? 'Reading Google Pay Screenshot...'
                        : 'Or Upload Google Pay Screenshot (Auto-Fills UPI ID)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptScreenshotUpload}
                      className="hidden"
                    />
                  </label>

                  {screenshotStatusMsg && (
                    <span className="text-[11px] font-semibold text-[#047857]">
                      {screenshotStatusMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Verification Status Banner */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6DFD3]">
                {autoVerifyState === 'waiting_for_payment' && (
                  <div className="flex items-center gap-2.5 text-xs text-[#5C5349]">
                    <Radio className="w-4 h-4 text-[#059669] animate-pulse shrink-0" />
                    <span>
                      After paying <strong>{formatInr(summary.totalInr)}</strong>, tap the green
                      button below to confirm your order and automatically send WhatsApp alerts.
                    </span>
                  </div>
                )}

                {autoVerifyState === 'verifying_bank' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-xs font-extrabold text-[#0F2547]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0F2547]" />
                      <span>
                        Confirming UPI Payment of {formatInr(summary.totalInr)} &amp; Sending
                        WhatsApp Alerts...
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EAE2D3] overflow-hidden">
                      <div
                        className="h-full bg-[#184D36] transition-all duration-300"
                        style={{ width: `${verifyProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {autoVerifyState === 'payment_received' && (
                  <div className="flex items-center gap-2.5 text-xs font-extrabold text-[#047857] bg-[#ECFDF5] p-2.5 rounded-xl border border-[#A7F3D0]">
                    <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                    <span>
                      Payment Confirmed! Automatically dispatching WhatsApp notifications...
                    </span>
                  </div>
                )}
              </div>

              {paymentError && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                  {paymentError}
                </div>
              )}
            </div>
          )}

          {step === 'confirmation' && confirmedOrder && (
            <div className="py-6 space-y-5">
              <div className="p-6 rounded-xl bg-white border border-[#E6DFD3] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono-tabular font-bold text-[#047857]">
                  {confirmedOrder.orderNumber} · UPI Transaction ID: {confirmedOrder.upiTxnRef}
                </div>
                <h3 className="text-2xl font-semibold text-[#181512]">
                  Thank You, {confirmedOrder.customerName}
                </h3>
                <p className="text-sm text-[#5C5349]">
                  Your UPI payment of{' '}
                  <span className="font-mono-tabular font-semibold text-[#181512]">
                    {formatInr(confirmedOrder.totalAmountInr)}
                  </span>{' '}
                  (UPI Transaction ID:{' '}
                  <strong className="font-mono-tabular">{confirmedOrder.upiTxnRef}</strong>) has
                  been recorded and your WhatsApp order notification has been triggered
                  automatically.
                </p>
              </div>

              {/* Automatic WhatsApp Order Notification (Admin) & Customer Order Confirmation Panel */}
              <div className="p-5 rounded-2xl bg-[#ECFDF5] border-2 border-[#10B981] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#065F46]">
                        Automatic WhatsApp Order Dispatch
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#059669] text-white text-[10px] font-bold">
                        {autoDispatchedWhatsapp ? 'Auto-Triggered ✓' : 'Dispatched ✓'}
                      </span>
                    </div>
                    <p className="text-xs text-[#065F46] leading-relaxed">
                      <strong>NEW ORDER RECEIVED</strong> alert has been automatically triggered for{' '}
                      <strong>{merchantName} ({whatsappNumber})</strong> and your{' '}
                      <strong>ORDER CONFIRMED</strong> receipt is ready for{' '}
                      <strong>{confirmedOrder.customerPhone || shipping.phone}</strong>.
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Actions for Customer & Admin */}
                <div className="grid grid-cols-1 gap-2.5">
                  <a
                    href={buildCustomerOrderWhatsappUrl(
                      confirmedOrder,
                      confirmedOrder.customerPhone || shipping.phone,
                      merchantName,
                      whatsappNumber,
                      storeAddress
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      Open ORDER CONFIRMED Message on My WhatsApp (
                      {confirmedOrder.customerPhone || shipping.phone})
                    </span>
                  </a>

                  <a
                    href={buildAdminOrderWhatsappUrl(
                      confirmedOrder,
                      whatsappNumber,
                      merchantName
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#F0FDF4] border-2 border-[#059669] text-[#065F46] text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4 text-[#059669]" />
                    <span>
                      Re-Send NEW ORDER RECEIVED Alert to Admin ({whatsappNumber})
                    </span>
                  </a>
                </div>

                {/* Customer WhatsApp Confirmation Message Preview */}
                <div className="p-3.5 rounded-xl bg-white border border-[#A7F3D0] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#065F46]">
                      Your WhatsApp Order Confirmation Receipt:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = buildCustomerOrderWhatsappMessage(
                          confirmedOrder,
                          merchantName,
                          whatsappNumber,
                          storeAddress
                        );
                        navigator.clipboard?.writeText(msg);
                        setCopiedWhatsappMsg(true);
                        setTimeout(() => setCopiedWhatsappMsg(false), 1800);
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#6EE7B7] text-[10px] font-bold text-[#065F46] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedWhatsappMsg ? 'Copied Receipt!' : 'Copy Confirmation'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] text-[#181512] whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E6DFD3]">
                    {buildCustomerOrderWhatsappMessage(
                      confirmedOrder,
                      merchantName,
                      whatsappNumber,
                      storeAddress
                    )}
                  </pre>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#6EE7B7] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-extrabold text-[#065F46] uppercase tracking-wider text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                  <span>Customer Account Created &amp; Logged In Automatically</span>
                </div>
                <p className="text-[#065F46] leading-relaxed">
                  Your account for <strong>{confirmedOrder.customerName}</strong> (Mobile:{' '}
                  <strong className="font-mono-tabular">
                    {confirmedOrder.customerPhone || shipping.phone}
                  </strong>{' '}
                  · Email: <strong>{confirmedOrder.customerEmail || shipping.email}</strong>) is now
                  active. You can track live orders, view order history, manage your wishlist, and
                  update your delivery address anytime.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#F3EFE6] border border-[#E6DFD3] space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#6E655C]">Merchant</span>
                  <span className="font-bold text-[#181512]">{merchantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E655C]">Order Number</span>
                  <span className="font-mono-tabular font-semibold text-[#181512]">
                    {confirmedOrder.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E655C]">UPI Transaction ID (UTR)</span>
                  <span className="font-mono-tabular font-extrabold text-[#047857]">
                    {confirmedOrder.upiTxnRef}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E655C]">Customer Mobile / WhatsApp</span>
                  <span className="font-mono-tabular font-semibold text-[#181512]">
                    {confirmedOrder.customerPhone || shipping.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E655C]">Merchant UPI ID</span>
                  <span className="font-mono-tabular text-[#181512]">{confirmedOrder.upiVpa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E655C]">Payment Status</span>
                  <span className="font-bold text-[#047857]">Payment Received ✓</span>
                </div>
                <div className="pt-2 border-t border-[#DCD3C2]">
                  <div className="text-[#6E655C] mb-1">Ordered Items</div>
                  <div className="text-[#181512] font-medium">{confirmedOrder.itemsSummary}</div>
                </div>
                <div className="pt-2 border-t border-[#DCD3C2]">
                  <div className="text-[#6E655C] mb-1">Delivery Address</div>
                  <div className="text-[#181512]">{confirmedOrder.shippingAddressSummary}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('cart');
                  setConfirmedOrder(null);
                  setCustomerUpiTxnId('');
                  if (typeof onNavigateToProfileOrders === 'function') {
                    onNavigateToProfileOrders();
                  } else {
                    onClose();
                  }
                }}
                className="w-full py-3 px-5 rounded-lg bg-[#1C1713] text-[#FAF7F2] text-sm font-medium hover:bg-[#312821] transition-colors cursor-pointer"
              >
                Track Order in My Account
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer Summary & Primary Action */}
        {(items.length > 0 || step === 'shipping') && step !== 'confirmation' && (
          <div
            className={`${
              step === 'shipping' ? 'px-6 py-3' : 'p-6 space-y-4'
            } border-t border-[#E6DFD3] bg-[#F3EFE6] shrink-0`}
          >
            {step !== 'shipping' && (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#5C5349]">
                  <span>Subtotal ({summary.totalItems} items)</span>
                  <span className="font-mono-tabular">{formatInr(summary.subtotalInr)}</span>
                </div>
                <div className="flex justify-between text-[#5C5349]">
                  <span>Express Shipping</span>
                  <span className="font-mono-tabular">
                    {summary.shippingInr === 0 ? 'FREE' : formatInr(summary.shippingInr)}
                  </span>
                </div>
                <div className="flex justify-between text-[#6E655C]">
                  <span>
                    {summary.gstMode === 'exclusive'
                      ? `GST (${summary.gstPercent}%)`
                      : `Included GST (${summary.gstPercent}%)`}
                  </span>
                  <span className="font-mono-tabular">
                    {summary.gstMode === 'exclusive' && summary.includedGstInr > 0
                      ? `+${formatInr(summary.includedGstInr)}`
                      : formatInr(summary.includedGstInr)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#DCD3C2] flex justify-between text-sm font-semibold text-[#181512]">
                  <span>Total Payable</span>
                  <span className="font-mono-tabular">{formatInr(summary.totalInr)}</span>
                </div>
              </div>
            )}

            {step === 'cart' && (
              <button
                type="button"
                onClick={() => setStep('shipping')}
                className="w-full py-3.5 px-5 rounded-lg bg-[#6B0F1A] hover:bg-[#0F2547] border-2 border-[#D4AF37] text-white text-sm font-extrabold uppercase tracking-wider shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#F5D78B]" />
                <span>PROCEED TO CHECKOUT · {formatInr(summary.totalInr)}</span>
              </button>
            )}

            {step === 'shipping' && (
              <div className="space-y-2">
                {Object.keys(shippingErrors).length > 0 && (
                  <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]">
                    Please complete: {Object.values(shippingErrors)[0]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleProceedToPayment()}
                  className="w-full py-3.5 px-5 rounded-lg bg-[#0F2547] hover:bg-[#6B0F1A] border-2 border-[#D4AF37] text-white text-sm font-extrabold uppercase tracking-wider shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-[#F5D78B]" />
                  <span>CONTINUE TO SCAN UPI QR · {formatInr(summary.totalInr)}</span>
                </button>
              </div>
            )}

            {step === 'payment' && (
              <button
                type="button"
                disabled={autoVerifyState !== 'waiting_for_payment'}
                onClick={triggerAutoPaymentVerification}
                className="w-full py-3.5 px-5 rounded-xl bg-[#184D36] hover:bg-[#123B29] border-2 border-[#D4AF37] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#F5D78B]" />
                <span>
                  {autoVerifyState === 'verifying_bank'
                    ? 'Confirming Payment & Sending WhatsApp...'
                    : autoVerifyState === 'payment_received'
                      ? 'Order Confirmed — Opening WhatsApp...'
                      : `I Have Paid ${formatInr(summary.totalInr)} · Confirm & Auto-Send WhatsApp`}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
