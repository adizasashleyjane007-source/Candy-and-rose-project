"use client";

import Header from "@/components/Header";
import {
    Receipt,
    Search,
    Filter,
    ArrowLeft,
    ArrowRight,
    Eye,
    Download,
    Wallet,
    Banknote,
    CreditCard,
    CheckCircle,
    CheckCircle2,
    XCircle,
    AlertCircle,
    X,
    PhilippinePeso,
    Loader2,
    Mail,
    Star,
    Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";
import { addNotification } from "@/lib/notifications";
import { Appointments, Billing, SettingsDB, fulfillPaymentSuccess, type Appointment, type BillingRecord } from "@/lib/db";
import { LoyaltyDB, calculateLoyaltyDiscountForAppointments, type LoyaltyRewardRecord } from "@/lib/loyalty";
import { createClient } from "@/lib/supabase/client";

interface PrintingReceiptData {
    invoiceNumber: string;
    customerName: string;
    staffName: string;
    formattedDateTime: string;
    serviceName: string;
    totalAmount: number;
    subtotal: number;
    loyaltyDiscountAmount?: number;
    loyaltyRewardDescription?: string | null;
    downpaymentCredited?: number;
    paymentMethod: string;
    isCash: boolean;
    cashReceived: number;
    changeDue: number;
}

interface CustomerOption {
    id?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    pendingCount: number;
}

export default function BillingPage() {
    const [filterOpen, setFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("Pending"); 
    const [searchQuery, setSearchQuery] = useState("");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Payment Modal State
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [checkoutUrl, setCheckoutUrl] = useState("");
    const [generatingQR, setGeneratingQR] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printingReceipt, setPrintingReceipt] = useState<PrintingReceiptData | null>(null);

    // Payment Success & Receipt Workflow Modal States
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [receiptModalStep, setReceiptModalStep] = useState<
        'PAYMENT_SUCCESS' | 'SENDING' | 'RECEIPT_SUCCESS' | 'RECEIPT_ERROR' | 'MISSING_EMAIL'
    >('PAYMENT_SUCCESS');
    const [isSendingReceiptModal, setIsSendingReceiptModal] = useState(false);
    const [receiptErrorMessage, setReceiptErrorMessage] = useState<string | null>(null);

    // Customer-Based Payment Modal States
    const [isCustomerPayModalOpen, setIsCustomerPayModalOpen] = useState(false);
    const [customerPayStep, setCustomerPayStep] = useState<'SELECT_CUSTOMER' | 'SELECT_SERVICES'>('SELECT_CUSTOMER');
    const [customerSearchTerm, setCustomerSearchTerm] = useState("");
    const [customerSearchResults, setCustomerSearchResults] = useState<CustomerOption[]>([]);
    const [searchingCustomers, setSearchingCustomers] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [customerPendingAppointments, setCustomerPendingAppointments] = useState<Appointment[]>([]);
    const [loadingCustomerAppointments, setLoadingCustomerAppointments] = useState(false);
    const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);
    const [selectedAppointmentsBatch, setSelectedAppointmentsBatch] = useState<Appointment[]>([]);
    const [paymentSuccessData, setPaymentSuccessData] = useState<{
        customerName: string;
        customerEmail: string | null;
        serviceName: string;
        totalPaid: number;
        paymentMethod: string;
        cashReceived: number;
        change: number;
        appointmentId: string;
    } | null>(null);

    // PayMongo GCash Return & Verification States
    const [showGcashSuccessModal, setShowGcashSuccessModal] = useState(false);
    const [isVerifyingGcashPayment, setIsVerifyingGcashPayment] = useState(false);
    const [isRedirectingToPayMongo, setIsRedirectingToPayMongo] = useState(false);
    const [gcashSuccessData, setGcashSuccessData] = useState<{
        appointmentId: string;
        customerName: string;
        serviceName: string;
        amount: number;
    } | null>(null);

    const [salonInfo, setSalonInfo] = useState({
        name: "Candy And Rose Salon",
        address: "Blk and Lot, Dasmarinas Cavite",
        phone: "032-123-4567",
        email: "candyandroses@gmail.com"
    });
    const [cashierName, setCashierName] = useState("Staff");
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
    const [selectedBilling, setSelectedBilling] = useState<BillingRecord | null>(null);
    const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

    // Top 5 Customer Loyalty Reward States
    const [availableLoyaltyReward, setAvailableLoyaltyReward] = useState<LoyaltyRewardRecord | null>(null);
    const [isLoyaltyRewardApplied, setIsLoyaltyRewardApplied] = useState(false);
    const [loadingLoyaltyReward, setLoadingLoyaltyReward] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const appts = await Appointments.list();
            setAppointments(appts);

            // Finalize PREVIOUS month Top 5 Customer Loyalty Rewards idempotently in background
            LoyaltyDB.syncPreviousMonth().catch(() => {});

            try {
                const bills = await Billing.list();
                setBillingRecords(bills || []);
            } catch (billErr) {
                console.warn("Could not load billing records:", billErr);
            }
            
            // Fetch salon settings
            const info = await SettingsDB.get("salon_info");
            if (info) setSalonInfo(info);

            // Fetch payment methods
            const methods = await SettingsDB.listPaymentMethods();
            const activeMethods = methods.filter(m => m.status === 'Active');
            setPaymentMethods(activeMethods);
            if (activeMethods.length > 0) setPaymentMethod(activeMethods[0].name);

            // Default staff name if none assigned
            setCashierName("Staff");
        } catch (error) {
            console.error("Failed to load billing data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyGcashReturn = async (appointmentId: string, sessionId?: string | null) => {
        setIsVerifyingGcashPayment(true);
        try {
            const res = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId,
                    sessionId: sessionId || undefined,
                }),
            });

            const data = await res.json();

            if (res.ok && data.verified) {
                await loadData();
                setGcashSuccessData({
                    appointmentId,
                    customerName: data.customerName || "Valued Customer",
                    serviceName: data.serviceName || "Salon Service",
                    amount: data.amount || 0,
                });
                setShowGcashSuccessModal(true);
            } else {
                addNotification(
                    "Payment Incomplete",
                    data.error || "The GCash payment has not been authorized or completed.",
                    "billing"
                );
            }
        } catch (err) {
            console.error("Payment verification error:", err);
            addNotification("Verification Error", "Failed to communicate with payment verification service.", "billing");
        } finally {
            setIsVerifyingGcashPayment(false);
            if (typeof window !== "undefined") {
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    };

    const handleCloseGcashSuccessModal = () => {
        setShowGcashSuccessModal(false);
        setGcashSuccessData(null);
        if (typeof window !== "undefined") {
            window.history.replaceState({}, "", window.location.pathname);
        }
        loadData();
    };

    useEffect(() => {
        loadData();

        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const paymentParam = params.get("payment");
            const refParam = params.get("ref");
            const sessionIdParam = params.get("session_id");

            if (paymentParam === "success" && refParam) {
                handleVerifyGcashReturn(refParam, sessionIdParam);
            } else if (paymentParam === "cancelled") {
                addNotification("Payment Cancelled", "The GCash payment was cancelled or not completed.", "billing");
                window.history.replaceState({}, "", window.location.pathname);
            } else if (params.get("gmail_auth") === "success") {
                addNotification("Gmail Connected", "Gmail account authorized successfully for sending receipts.", "billing");
                window.history.replaceState({}, "", window.location.pathname);
            } else if (params.get("gmail_error")) {
                addNotification("Gmail Error", decodeURIComponent(params.get("gmail_error") || "Failed to authorize Gmail."), "billing");
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    }, []);

    // Fetch available Top 5 Customer Loyalty Reward when a customer or appointment is selected for checkout
    useEffect(() => {
        let isMounted = true;
        const checkCustomerLoyaltyReward = async () => {
            if (!selectedApt && !selectedCustomer) {
                if (isMounted) {
                    setAvailableLoyaltyReward(null);
                    setIsLoyaltyRewardApplied(false);
                }
                return;
            }
            const custId = selectedCustomer?.id || selectedApt?.customer_id || null;
            const custName =
                selectedCustomer?.name ||
                selectedApt?.customers?.name ||
                selectedApt?.customer_name ||
                null;
            if (!custId && !custName) {
                if (isMounted) {
                    setAvailableLoyaltyReward(null);
                    setIsLoyaltyRewardApplied(false);
                }
                return;
            }
            setLoadingLoyaltyReward(true);
            try {
                const reward = await LoyaltyDB.getAvailableCustomerReward(custId, custName);
                if (isMounted) {
                    setAvailableLoyaltyReward(reward);
                    setIsLoyaltyRewardApplied(false);
                }
            } catch (err) {
                console.warn("Could not check customer loyalty reward:", err);
                if (isMounted) {
                    setAvailableLoyaltyReward(null);
                    setIsLoyaltyRewardApplied(false);
                }
            } finally {
                if (isMounted) setLoadingLoyaltyReward(false);
            }
        };
        checkCustomerLoyaltyReward();
        return () => {
            isMounted = false;
        };
    }, [selectedApt?.id, selectedCustomer?.id, selectedCustomer?.name]);

    useEffect(() => {
        const fetchCheckoutUrl = async () => {
            if (paymentMethod.toLowerCase() === 'gcash' && selectedApt) {
                setGeneratingQR(true);
                const apptsForCalc = selectedAppointmentsBatch.length > 0 ? selectedAppointmentsBatch : [selectedApt];
                const rawSubtotal = apptsForCalc.reduce((sum, a) => sum + (a.price || 0), 0);
                const loyaltyCalc =
                    isLoyaltyRewardApplied && availableLoyaltyReward
                        ? calculateLoyaltyDiscountForAppointments(apptsForCalc, availableLoyaltyReward)
                        : null;
                const currentFee = loyaltyCalc && loyaltyCalc.isApplicable ? loyaltyCalc.finalTotal : rawSubtotal;
                const svcName = selectedAppointmentsBatch.length > 1
                    ? `${selectedAppointmentsBatch.length} Services (${selectedAppointmentsBatch.map(s => s.service_name || s.services?.name || 'Service').join(', ')})`
                    : (selectedApt.service_name || selectedApt.services?.name || 'Salon Service');
                const custName = selectedCustomer?.name || selectedApt.customers?.name || selectedApt.customer_name || 'Guest';

                try {
                    const response = await fetch('/api/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: selectedApt.id,
                            amount: currentFee,
                            serviceName: svcName,
                            customerName: custName,
                            loyaltyRewardId:
                                isLoyaltyRewardApplied && availableLoyaltyReward && loyaltyCalc?.isApplicable
                                    ? availableLoyaltyReward.id
                                    : null,
                            originalAmount: rawSubtotal,
                            loyaltyDiscountAmount:
                                isLoyaltyRewardApplied && loyaltyCalc?.isApplicable
                                    ? loyaltyCalc.discountAmount
                                    : 0,
                            loyaltyRewardDescription:
                                isLoyaltyRewardApplied && availableLoyaltyReward && loyaltyCalc?.isApplicable
                                    ? availableLoyaltyReward.reward_description
                                    : null,
                        })
                    });
                    const data = await response.json();
                    if (data.checkout_url) {
                        setCheckoutUrl(data.checkout_url);
                    }
                } catch (error) {
                    console.error("Failed to generate QR:", error);
                } finally {
                    setGeneratingQR(false);
                }
            } else {
                setCheckoutUrl("");
            }
        };
        fetchCheckoutUrl();
    }, [paymentMethod, selectedApt, selectedAppointmentsBatch, selectedCustomer, isLoyaltyRewardApplied, availableLoyaltyReward]);

    const printReceiptDirectly = (receipt: PrintingReceiptData) => {
        let iframe = document.getElementById("receipt-direct-print-frame") as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.id = "receipt-direct-print-frame";
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            iframe.style.visibility = "hidden";
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - #${receipt.invoiceNumber}</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    html {
                        background: #ffffff;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        background: #ffffff;
                        color: #000000;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        padding: 6mm;
                        width: 80mm;
                        margin: 0 auto;
                    }
                    @media print {
                        html, body {
                            background: #ffffff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div style="text-align: center; padding-bottom: 12px;">
                    <h2 style="font-weight: 800; font-size: 16px; text-transform: uppercase; margin-bottom: 4px; color: #000;">
                        ${(salonInfo.name || "CANDY & ROSE").toUpperCase()}
                    </h2>
                    <p style="font-size: 10.5px; color: #6b7280; line-height: 1.3;">
                        ${salonInfo.address}
                    </p>
                    <p style="font-size: 10.5px; color: #6b7280; margin-top: 2px;">
                        ${salonInfo.phone}
                    </p>
                </div>

                <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;"></div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #000;">
                        SALES INVOICE
                    </span>
                    <span style="font-family: monospace; font-size: 12px; font-weight: 600; color: #9ca3af;">
                        #${receipt.invoiceNumber}
                    </span>
                </div>

                <div style="font-size: 11px; margin-bottom: 12px; line-height: 1.6;">
                    <div style="display: flex; align-items: flex-start;">
                        <span style="width: 85px; color: #6b7280; flex-shrink: 0;">CUSTOMER:</span>
                        <span style="font-weight: 700; color: #000; text-transform: uppercase;">${receipt.customerName}</span>
                    </div>
                    <div style="display: flex; align-items: flex-start;">
                        <span style="width: 85px; color: #6b7280; flex-shrink: 0;">STAFF:</span>
                        <span style="font-weight: 600; color: #000; text-transform: uppercase;">${receipt.staffName}</span>
                    </div>
                    <div style="display: flex; align-items: flex-start;">
                        <span style="width: 85px; color: #6b7280; flex-shrink: 0;">DATE:</span>
                        <span style="font-weight: 600; color: #000;">${receipt.formattedDateTime}</span>
                    </div>
                </div>

                <div style="background-color: #fff1f2; padding: 6px 10px; border-radius: 2px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #F02D98; text-transform: uppercase; margin-bottom: 8px;">
                    <span>DESCRIPTION</span>
                    <span>PRICE</span>
                </div>

                <div style="font-size: 11px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                        <span style="color: #000; flex: 1;">${receipt.serviceName}</span>
                        <span style="font-weight: 700; color: #000; font-family: monospace; flex-shrink: 0;">₱${receipt.subtotal.toLocaleString()}</span>
                    </div>
                </div>

                <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;"></div>

                <div style="font-size: 11px; margin-bottom: 12px; line-height: 1.5;">
                    <div style="display: flex; justify-content: space-between; color: #4b5563;">
                        <span>Subtotal:</span>
                        <span style="font-family: monospace; font-weight: 500; color: #000;">₱${receipt.subtotal.toLocaleString()}</span>
                    </div>
                    ${receipt.loyaltyDiscountAmount && receipt.loyaltyDiscountAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: #F02D98; font-weight: 700;">
                        <span>Loyalty Discount (${receipt.loyaltyRewardDescription || 'Top 5 Reward'}):</span>
                        <span style="font-family: monospace; font-weight: 700;">-₱${receipt.loyaltyDiscountAmount.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    ${receipt.downpaymentCredited && receipt.downpaymentCredited > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: #059669; font-weight: 700;">
                        <span>Downpayment Credited:</span>
                        <span style="font-family: monospace; font-weight: 700;">-₱${receipt.downpaymentCredited.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; color: #4b5563;">
                        <span>Tax (0%):</span>
                        <span style="font-family: monospace; font-weight: 500; color: #000;">₱0.00</span>
                    </div>
                </div>

                <div style="background-color: #F02D98; color: #ffffff; padding: 8px 10px; border-radius: 2px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">
                    <span>TOTAL AMOUNT:</span>
                    <span style="font-family: monospace; font-size: 14px; font-weight: 900;">₱${receipt.totalAmount.toLocaleString()}</span>
                </div>

                <div style="font-size: 11px; margin-bottom: 16px; line-height: 1.5;">
                    ${receipt.isCash ? `
                        <div style="display: flex; justify-content: space-between; color: #4b5563;">
                            <span>Cash Paid:</span>
                            <span style="font-family: monospace; font-weight: 700; color: #000;">₱${receipt.cashReceived.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #F02D98;">
                            <span>CHANGE:</span>
                            <span style="font-family: monospace;">₱${receipt.changeDue.toLocaleString()}</span>
                        </div>
                    ` : `
                        <div style="display: flex; justify-content: space-between; color: #4b5563;">
                            <span>Payment Method:</span>
                            <span style="font-weight: 700; text-transform: uppercase; color: #000;">${receipt.paymentMethod}</span>
                        </div>
                    `}
                </div>

                <div style="text-align: center; padding-top: 8px; font-size: 11px; color: #6b7280; line-height: 1.4;">
                    <p style="font-style: italic;">Thank you for your visit!</p>
                    <p style="font-size: 10px; color: #9ca3af; margin-top: 2px;">Please visit us again soon.</p>
                </div>

                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #d1d5db; text-align: center; color: #9ca3af; font-size: 10px; font-family: monospace;">
                    - - - - - - TEAR HERE - - - - - -
                </div>
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        }, 150);
    };

    const handlePrint = (customCash?: number, customApt?: Appointment | null) => {
        const apt = customApt || selectedApt;
        if (!apt) return;
        const apptsForReceipt = selectedAppointmentsBatch.length > 0 ? selectedAppointmentsBatch : [apt];
        const rawSubtotal = apptsForReceipt.reduce((sum, a) => sum + (a.price || 0), 0);
        const loyaltyCalc =
            isLoyaltyRewardApplied && availableLoyaltyReward
                ? calculateLoyaltyDiscountForAppointments(apptsForReceipt, availableLoyaltyReward)
                : null;
        const discountVal = loyaltyCalc && loyaltyCalc.isApplicable ? loyaltyCalc.discountAmount : 0;
        const dpCredited = apptsForReceipt.reduce((sum, a) => sum + (Number(a.downpayment_amount) || Number(a.downpayment_paid) || 0), 0);
        const totalAmount = Math.max(0, rawSubtotal - discountVal - dpCredited);
        const paymentMethodName = paymentMethod || "Cash";
        const isCash = paymentMethodName.toLowerCase() === "cash";
        const cashRec = customCash !== undefined ? Math.max(customCash, totalAmount) : (Number(paymentAmount) || totalAmount);
        const changeDue = Math.max(0, cashRec - totalAmount);

        const invoiceNum = apt.id
            ? apt.id.replace(/-/g, "").slice(0, 9).toUpperCase()
            : "CR-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        const customerName = apt.customers?.name || apt.customer_name || "Valued Customer";
        const staffName = apt.staff?.name || apt.staff_name || cashierName || "Staff";
        const apptDate = apt.appointment_date || new Date().toLocaleDateString();
        const apptTime = apt.appointment_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const serviceName = apptsForReceipt.map(a => a.services?.name || a.service_name || "Salon Service").join(", ");

        const receiptData: PrintingReceiptData = {
            invoiceNumber: invoiceNum,
            customerName: customerName,
            staffName: staffName,
            formattedDateTime: `${apptDate} ${apptTime}`,
            serviceName: serviceName,
            totalAmount: totalAmount,
            subtotal: rawSubtotal,
            loyaltyDiscountAmount: discountVal,
            loyaltyRewardDescription: discountVal > 0 ? availableLoyaltyReward?.reward_description : null,
            downpaymentCredited: dpCredited,
            paymentMethod: paymentMethodName,
            isCash: isCash,
            cashReceived: cashRec,
            changeDue: changeDue
        };

        setPrintingReceipt(receiptData);
        printReceiptDirectly(receiptData);
    };

    useEffect(() => {
        if (showReceipt && isPrinting) {
            handlePrint();
            setIsPrinting(false);
        }
    }, [showReceipt, isPrinting]);

    // Filter Logic
    const filteredAppointments = appointments.filter(apt => {
        const customerName = apt.customers?.name || apt.customer_name || "";
        const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (apt.id || "").toLowerCase().includes(searchQuery.toLowerCase());

        const isPaid = apt.status === 'Completed' || apt.payment_status === 'Paid';
        const dpPaid = Number(apt.downpayment_amount) || Number(apt.downpayment_paid) || 0;
        const remaining = Math.max(0, (apt.price || 0) - dpPaid);
        const isPartiallyPaid = !isPaid && (
            apt.payment_status === 'Partially Paid' ||
            (dpPaid > 0 && remaining > 0 && apt.status !== 'Cancelled')
        );

        let matchesStatus = true;
        if (statusFilter === "Pending") matchesStatus = !isPaid && apt.status !== "Cancelled";
        if (statusFilter === "Partially Paid") matchesStatus = isPartiallyPaid;
        if (statusFilter === "Paid") matchesStatus = isPaid;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
    const paginatedAppointments = filteredAppointments.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

    // Dynamic Summary Metrics
    const totalRevenue = appointments
        .filter(a => a.status === 'Completed' || a.payment_status === 'Paid')
        .reduce((sum, a) => sum + (a.price || 0), 0)
        + appointments
        .filter(a => a.payment_status === 'Partially Paid' && a.status !== 'Completed')
        .reduce((sum, a) => sum + (Number(a.downpayment_amount) || Number(a.downpayment_paid) || 0), 0);

    const pendingRevenue = appointments
        .filter(a => a.status !== 'Completed' && a.status !== 'Cancelled')
        .reduce((sum, a) => {
            const totalPrice = a.price || 0;
            const dpPaid = a.payment_status === 'Partially Paid'
                ? (Number(a.downpayment_amount) || Number(a.downpayment_paid) || 0)
                : 0;
            return sum + Math.max(0, totalPrice - dpPaid);
        }, 0);

    const paidTransactionsCount = appointments.filter(a => a.status === 'Completed' || a.payment_status === 'Paid').length;

    const handleExportCSV = () => {
        if (filteredAppointments.length === 0) {
            addNotification("No Records to Export", "No billing transactions match the current filter and search query.", "billing");
            return;
        }

        const escapeCSV = (value: string | number | null | undefined) => {
            const str = value === null || value === undefined ? "" : String(value);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const headers = [
            "Customer",
            "Service",
            "Amount",
            "Payment Status",
            "Transaction Date",
            "Payment Method"
        ];

        const rows = filteredAppointments.map((trx) => {
            const matchedBill = billingRecords.find(
                (b) => b.appointment_id === trx.id || b.id === trx.id
            );
            const isPaid = trx.status === "Completed" || trx.payment_status === "Paid";
            const dpPaid = Number(trx.downpayment_amount) || Number(trx.downpayment_paid) || 0;
            const remainingBalance = Math.max(0, (trx.price || 0) - dpPaid);
            const isPartiallyPaid = !isPaid && (
                trx.payment_status === "Partially Paid" ||
                (dpPaid > 0 && remainingBalance > 0 && trx.status !== "Cancelled")
            );
            const customerName = trx.customers?.name || trx.customer_name || "Unknown";
            const serviceName = trx.service_name || trx.services?.name || "Unknown Service";
            const amount = trx.price ?? matchedBill?.amount ?? 0;
            const paymentStatus = isPaid
                ? "Paid"
                : isPartiallyPaid
                ? "Partially Paid"
                : "Pending Payment";
            const amountDisplay = isPartiallyPaid
                ? `Total: ₱${Number(amount).toLocaleString()} (Paid: ₱${dpPaid.toLocaleString()}, Balance: ₱${remainingBalance.toLocaleString()})`
                : `₱${Number(amount).toLocaleString()}`;
            const transactionDate = trx.appointment_date
                ? `${trx.appointment_date}${trx.appointment_time ? ` ${trx.appointment_time}` : ""}`
                : matchedBill?.created_at
                    ? new Date(matchedBill.created_at).toLocaleDateString()
                    : trx.created_at
                        ? new Date(trx.created_at).toLocaleDateString()
                        : "N/A";
            const paymentMethodValue =
                trx.payment_method ||
                matchedBill?.payment_method ||
                (!isPaid ? "Pending" : "Cash");

            return [
                escapeCSV(customerName),
                escapeCSV(serviceName),
                escapeCSV(amountDisplay),
                escapeCSV(paymentStatus),
                escapeCSV(transactionDate),
                escapeCSV(paymentMethodValue),
            ].join(",");
        });

        const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateStamp = new Date().toISOString().split("T")[0];
        link.href = url;
        link.setAttribute("download", `billing-transactions-${statusFilter.toLowerCase()}-${dateStamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleOpenPayment = (apt: Appointment) => {
        setSelectedApt(apt);
        setSelectedAppointmentsBatch([apt]);
        setSelectedCustomer(apt.customers ? {
            id: apt.customer_id,
            name: apt.customers.name,
            email: apt.customers.email,
            phone: apt.customers.phone,
            pendingCount: 1
        } : {
            id: apt.customer_id,
            name: apt.customer_name || "Valued Customer",
            pendingCount: 1
        });
        const dp = Number(apt.downpayment_amount) || Number(apt.downpayment_paid) || 0;
        const balanceDue = Math.max(0, (apt.price || 0) - dp);
        setPaymentAmount(balanceDue > 0 ? balanceDue.toString() : ""); 
        setPaymentMethod("Cash");
        setSelectedBilling(null);
        setReceiptModalStep('PAYMENT_SUCCESS');
    };

    const handleOpenCustomerPayModal = () => {
        setIsCustomerPayModalOpen(true);
        setCustomerPayStep('SELECT_CUSTOMER');
        setCustomerSearchTerm("");
        setSelectedCustomer(null);
        setSelectedAppointmentIds([]);
        setCustomerPendingAppointments([]);

        // Build initial customer list from currently loaded appointments that are pending
        const pendingAppts = appointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
        const custMap = new Map<string, CustomerOption>();

        for (const apt of pendingAppts) {
            const name = apt.customers?.name || apt.customer_name || "Valued Customer";
            const id = apt.customer_id;
            const key = id || name.toLowerCase();

            const existing = custMap.get(key);
            if (existing) {
                existing.pendingCount += 1;
            } else {
                custMap.set(key, {
                    id: id,
                    name: name,
                    email: apt.customers?.email,
                    phone: apt.customers?.phone,
                    pendingCount: 1
                });
            }
        }

        setCustomerSearchResults(Array.from(custMap.values()));
    };

    const handleCustomerSearch = async (term: string) => {
        setCustomerSearchTerm(term);
        const trimmed = term.trim().toLowerCase();

        // If search term is empty, restore initial list of customers with pending bookings
        if (!trimmed) {
            const pendingAppts = appointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
            const custMap = new Map<string, CustomerOption>();
            for (const apt of pendingAppts) {
                const name = apt.customers?.name || apt.customer_name || "Valued Customer";
                const id = apt.customer_id;
                const key = id || name.toLowerCase();
                const existing = custMap.get(key);
                if (existing) {
                    existing.pendingCount += 1;
                } else {
                    custMap.set(key, {
                        id: id,
                        name: name,
                        email: apt.customers?.email,
                        phone: apt.customers?.phone,
                        pendingCount: 1
                    });
                }
            }
            setCustomerSearchResults(Array.from(custMap.values()));
            return;
        }

        // First, filter customers that have pending appointments
        const pendingAppts = appointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
        const matchedPendingMap = new Map<string, CustomerOption>();
        for (const apt of pendingAppts) {
            const name = apt.customers?.name || apt.customer_name || "Valued Customer";
            const email = apt.customers?.email || "";
            const phone = apt.customers?.phone || "";
            const id = apt.customer_id;

            if (
                name.toLowerCase().includes(trimmed) ||
                email.toLowerCase().includes(trimmed) ||
                phone.includes(trimmed)
            ) {
                const key = id || name.toLowerCase();
                const existing = matchedPendingMap.get(key);
                if (existing) {
                    existing.pendingCount += 1;
                } else {
                    matchedPendingMap.set(key, {
                        id,
                        name,
                        email,
                        phone,
                        pendingCount: 1
                    });
                }
            }
        }

        // Also query Supabase customers table to find any registered customers matching the search
        setSearchingCustomers(true);
        try {
            const supabase = createClient();
            const { data: dbCustomers } = await supabase
                .from("customers")
                .select("id, name, email, phone")
                .or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
                .limit(10);

            if (dbCustomers) {
                for (const c of dbCustomers) {
                    const key = c.id || c.name.toLowerCase();
                    if (!matchedPendingMap.has(key)) {
                        // Count how many pending appointments this customer has
                        const pendingCount = appointments.filter(
                            a => (a.customer_id === c.id || a.customer_name?.toLowerCase() === c.name.toLowerCase()) &&
                                 a.status !== 'Completed' && a.status !== 'Cancelled'
                        ).length;

                        matchedPendingMap.set(key, {
                            id: c.id,
                            name: c.name,
                            email: c.email,
                            phone: c.phone,
                            pendingCount
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Error searching customers:", err);
        } finally {
            setSearchingCustomers(false);
            setCustomerSearchResults(Array.from(matchedPendingMap.values()));
        }
    };

    const handleSelectCustomer = async (cust: CustomerOption) => {
        setSelectedCustomer(cust);
        setLoadingCustomerAppointments(true);
        try {
            const supabase = createClient();
            let query = supabase
                .from("appointments")
                .select(`
                    *,
                    customers(id, name, email, phone),
                    staff(name),
                    services(name, price)
                `)
                .not("status", "in", '("Completed","Cancelled")')
                .order("appointment_date", { ascending: false });

            if (cust.id) {
                query = query.or(`customer_id.eq.${cust.id},customer_name.ilike.%${cust.name}%`);
            } else {
                query = query.ilike("customer_name", cust.name);
            }

            const { data, error } = await query;
            if (error) throw error;

            const apts = (data || []) as Appointment[];
            setCustomerPendingAppointments(apts);
            // Pre-select all eligible appointments
            setSelectedAppointmentIds(apts.map(a => a.id!));
            setCustomerPayStep('SELECT_SERVICES');
        } catch (err) {
            console.error("Failed to load customer pending appointments:", err);
            addNotification("Error", "Failed to retrieve booked services.", "billing");
        } finally {
            setLoadingCustomerAppointments(false);
        }
    };

    const toggleSelectAllServices = () => {
        if (selectedAppointmentIds.length === customerPendingAppointments.length) {
            setSelectedAppointmentIds([]);
        } else {
            setSelectedAppointmentIds(customerPendingAppointments.map(a => a.id!));
        }
    };

    const toggleSelectService = (id: string) => {
        setSelectedAppointmentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleProceedToFinalizePayment = () => {
        const selectedApts = customerPendingAppointments.filter(a => selectedAppointmentIds.includes(a.id!));
        if (selectedApts.length === 0) return;

        setSelectedAppointmentsBatch(selectedApts);
        setSelectedApt(selectedApts[0]);
        setIsCustomerPayModalOpen(false);
        setPaymentAmount("");
        setPaymentMethod("Cash");
        setShowReceipt(false);
    };

    const handleGoBackFromPayment = () => {
        setSelectedApt(null);
        if (customerPendingAppointments.length > 0 && selectedCustomer) {
            setIsCustomerPayModalOpen(true);
            setCustomerPayStep('SELECT_SERVICES');
        } else {
            setSelectedAppointmentsBatch([]);
        }
    };

    const handleViewReceipt = async (apt: Appointment) => {
        let matchedBill: BillingRecord | null = null;
        try {
            const billings = await Billing.list();
            matchedBill = billings.find(b => b.appointment_id === apt.id || b.id === apt.id) || null;
        } catch (err) {
            console.warn("Could not load billing record:", err);
        }

        const totalAmount = matchedBill?.amount ?? apt.price ?? 0;
        const discountVal = Number(matchedBill?.loyalty_discount_amount ?? apt.loyalty_discount_amount ?? 0);
        const subtotalAmount = Number(
            matchedBill?.original_amount ??
                apt.original_amount ??
                (discountVal > 0 ? totalAmount + discountVal : totalAmount)
        );
        const rewardDesc = matchedBill?.loyalty_reward_description || apt.loyalty_reward_description || null;
        const paymentMethodName = matchedBill?.payment_method || "Cash";
        const isCash = paymentMethodName.toLowerCase() === "cash";
        const cashRec = matchedBill?.cash_received !== undefined ? matchedBill.cash_received : totalAmount;
        const changeDue = Math.max(0, cashRec - totalAmount);

        const invoiceNum = matchedBill?.id
            ? matchedBill.id.replace(/-/g, "").slice(0, 9).toUpperCase()
            : apt.id
                ? apt.id.replace(/-/g, "").slice(0, 9).toUpperCase()
                : "CR-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        const customerName = apt.customers?.name || apt.customer_name || "Valued Customer";
        const staffName = apt.staff?.name || apt.staff_name || cashierName || "Staff";
        const apptDate = apt.appointment_date || new Date().toLocaleDateString();
        const apptTime = apt.appointment_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const serviceName = apt.services?.name || apt.service_name || "Salon Service";

        const receiptData: PrintingReceiptData = {
            invoiceNumber: invoiceNum,
            customerName: customerName,
            staffName: staffName,
            formattedDateTime: `${apptDate} ${apptTime}`,
            serviceName: serviceName,
            totalAmount: totalAmount,
            subtotal: subtotalAmount,
            loyaltyDiscountAmount: discountVal,
            loyaltyRewardDescription: rewardDesc,
            downpaymentCredited: Number(matchedBill?.downpayment_credited ?? (apt.downpayment_amount || apt.downpayment_paid || 0)),
            paymentMethod: paymentMethodName,
            isCash: isCash,
            cashReceived: cashRec,
            changeDue: changeDue
        };

        setPrintingReceipt(receiptData);
        printReceiptDirectly(receiptData);
    };

    const handleSendReceiptEmail = async (apt: Appointment) => {
        if (isSendingEmail) return;

        const customerEmail = apt.customers?.email || null;
        if (!customerEmail) {
            addNotification("No Email Found", "Receipt cannot be sent because this customer does not have a registered email address.", "billing");
            return;
        }

        setIsSendingEmail(apt.id!);
        try {
            const response = await fetch("/api/send-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointmentId: apt.id })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                addNotification("Success", `Receipt sent successfully to ${customerEmail}.`, "billing");
            } else {
                addNotification("Error", result.message || "Unable to send the receipt.", "billing");
            }
        } catch (error: any) {
            console.error("Failed to send receipt:", error);
            addNotification("Error", "Unable to send the receipt. Please try again.", "billing");
        } finally {
            setIsSendingEmail(null);
        }
    };

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
        const wantsPrint = submitter?.innerText.toLowerCase().includes('print');
        
        const appointmentsToPay = selectedAppointmentsBatch.length > 0 
            ? selectedAppointmentsBatch 
            : (selectedApt ? [selectedApt] : []);

        if (appointmentsToPay.length === 0) return;
        
        const currentTotal = totalWithTax;

        // Cash Payment Validation
        if (paymentMethod.toLowerCase() === 'cash' && currentTotal > 0) {
            const enteredCash = parseFloat(paymentAmount);
            if (isNaN(enteredCash) || enteredCash < currentTotal) {
                addNotification("Payment Validation Error", "Please enter a valid cash amount equal to or greater than the total amount.", "billing");
                return;
            }
        }

        try {
            const billAmount = totalWithTax;
            const cashRec = paymentMethod.toLowerCase() === 'cash' ? (Number(paymentAmount) || 0) : totalWithTax;
            const calcChange = Math.max(0, cashRec - billAmount);

            const applyRewardNow =
                isLoyaltyRewardApplied &&
                availableLoyaltyReward &&
                loyaltyCalc.isApplicable &&
                loyaltyCalc.discountAmount > 0;

            let remainingDiscount = applyRewardNow ? loyaltyCalc.discountAmount : 0;

            // Fulfill payment for each selected appointment idempotently
            for (let i = 0; i < appointmentsToPay.length; i++) {
                const apt = appointmentsToPay[i];
                const rawAptPrice = formatPrice(apt.price);
                const aptDiscount = Math.min(rawAptPrice, remainingDiscount);
                remainingDiscount = Math.max(0, remainingDiscount - aptDiscount);
                const aptDp = Number(apt.downpayment_amount) || Number(apt.downpayment_paid) || 0;
                const finalAptPrice = Math.max(0, rawAptPrice - aptDiscount - aptDp);
                const aptCash = i === 0 ? cashRec : finalAptPrice;

                const res = await fulfillPaymentSuccess({
                    appointmentId: apt.id!,
                    amount: finalAptPrice,
                    cashReceived: aptCash,
                    paymentMethod: paymentMethod,
                    notes: `Payment for ${apt.service_name || apt.services?.name || 'service'}`,
                    loyaltyRewardId: i === 0 && applyRewardNow ? availableLoyaltyReward.id : null,
                    originalAmount: i === 0 && applyRewardNow ? apptFee : rawAptPrice,
                    loyaltyDiscountAmount: i === 0 && applyRewardNow ? loyaltyCalc.discountAmount : 0,
                    loyaltyRewardDescription:
                        i === 0 && applyRewardNow ? availableLoyaltyReward.reward_description : null,
                    downpaymentCredited: aptDp,
                });

                if (!res.success) {
                    throw new Error(res.error || `Payment fulfillment failed for ${apt.service_name || 'service'}`);
                }
            }

            if (applyRewardNow) {
                setAvailableLoyaltyReward(null);
                setIsLoyaltyRewardApplied(false);
            }

            addNotification("Success", "Payment confirmed successfully.", "billing");
            
            if (wantsPrint) {
                handlePrint(cashRec);
            }
            
            // Prepare success dashboard data
            const primaryApt = appointmentsToPay[0];
            const custName = selectedCustomer?.name || primaryApt.customers?.name || primaryApt.customer_name || "Valued Customer";
            const custEmail = selectedCustomer?.email || primaryApt.customers?.email || null;
            const svcNames = appointmentsToPay.map(a => a.services?.name || a.service_name || "Salon Service").join(", ");

            setPaymentSuccessData({
                customerName: custName,
                customerEmail: custEmail,
                serviceName: svcNames,
                totalPaid: billAmount,
                paymentMethod: paymentMethod,
                cashReceived: cashRec,
                change: calcChange,
                appointmentId: primaryApt.id!
            });

            // Transition from payment input modal to Payment Success Dashboard
            setSelectedApt(null);
            setSelectedAppointmentsBatch([]);
            setSelectedCustomer(null);
            setShowReceipt(false);
            setPaymentAmount("");
            setReceiptModalStep('PAYMENT_SUCCESS');
            setShowSuccessModal(true);

            // Refresh table data
            loadData();
        } catch (error) {
            console.error("Payment failed:", error);
            addNotification("Error", "Failed to confirm payment.", "billing");
        }
    };

    const handleTriggerSendReceipt = async () => {
        if (!paymentSuccessData || isSendingReceiptModal) return;

        setIsSendingReceiptModal(true);
        setReceiptModalStep('SENDING');

        try {
            const response = await fetch("/api/send-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId: paymentSuccessData.appointmentId
                })
            });

            const contentType = response.headers.get("content-type");
            let result: any = {};
            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                result = { success: false, message: `Server error (${response.status})` };
            }

            if (response.ok && result.success) {
                setReceiptModalStep('RECEIPT_SUCCESS');
            } else if (result.code === 'CUSTOMER_EMAIL_MISSING' || (result.message && result.message.includes("registered email address"))) {
                setReceiptModalStep('MISSING_EMAIL');
            } else {
                setReceiptErrorMessage(result.message || "Something went wrong while sending the receipt.");
                setReceiptModalStep('RECEIPT_ERROR');
            }
        } catch (error: unknown) {
            console.error("Error sending receipt:", error);
            setReceiptErrorMessage("Something went wrong while sending the receipt. Please try again.");
            setReceiptModalStep('RECEIPT_ERROR');
        } finally {
            setIsSendingReceiptModal(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setReceiptModalStep('PAYMENT_SUCCESS');
        setPaymentSuccessData(null);
        setIsSendingReceiptModal(false);
    };

    const formatPrice = (p: number | null | undefined) => p || 0;
    
    // Receipt & Loyalty Discount Calculations
    const activePaymentAppointments = selectedAppointmentsBatch.length > 0
        ? selectedAppointmentsBatch
        : (selectedApt ? [selectedApt] : []);
    const apptFee = activePaymentAppointments.reduce((sum, a) => sum + formatPrice(a.price), 0);
    const loyaltyCalc = calculateLoyaltyDiscountForAppointments(
        activePaymentAppointments,
        availableLoyaltyReward
    );
    const appliedDiscountAmount =
        isLoyaltyRewardApplied && availableLoyaltyReward && loyaltyCalc.isApplicable
            ? loyaltyCalc.discountAmount
            : 0;
    const tax = 0; 
    const totalDownpaymentCredited = activePaymentAppointments.reduce((sum, a) => sum + (Number(a.downpayment_amount) || Number(a.downpayment_paid) || 0), 0);
    const totalWithTax = Math.max(0, (apptFee - appliedDiscountAmount) - totalDownpaymentCredited + tax);
    const excessCredit = Math.max(0, totalDownpaymentCredited - (apptFee - appliedDiscountAmount));
    const isAmountReceivedValid =
        totalWithTax === 0
            ? (paymentAmount === "" || parseFloat(paymentAmount) >= 0)
            : parseFloat(paymentAmount) >= totalWithTax;
    const change = Math.max(0, (parseFloat(paymentAmount) || 0) - totalWithTax);

    // Subtotal for customer-based payment selection
    const selectedServicesSubtotal = customerPendingAppointments
        .filter(a => selectedAppointmentIds.includes(a.id!))
        .reduce((sum, a) => sum + formatPrice(a.price), 0);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-y-auto overflow-x-hidden w-full max-w-full">
            <div id="billing-screen-content" className="flex-1 flex flex-col w-full print:hidden">
                <Header />
            <div className="px-4 sm:px-8 pb-8 flex-1 max-w-7xl mx-auto w-full mt-2">
                <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Billing & Transactions</h2>
                    <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage pending payments and customer receipts</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Total Revenue Collected</p>
                            <Wallet className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">₱{totalRevenue.toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Pending Payments Expected</p>
                            <Banknote className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">₱{pendingRevenue.toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-pink-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-500">Paid Transactions</p>
                            <Receipt className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold text-gray-900">{paidTransactionsCount}</h3>
                        </div>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 w-full sm:w-80">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-2.5 border border-pink-100 rounded-full bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 sm:text-sm"
                                placeholder="Search by customer name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        {/* Status Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="h-full px-5 py-2.5 bg-white border border-pink-100 rounded-full shadow-sm text-sm font-semibold text-gray-700 hover:bg-pink-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                                <Filter className="w-4 h-4 text-gray-500" />
                                <span className={statusFilter !== 'Pending' ? 'text-pink-600 font-bold' : ''}>
                                    Status: {statusFilter}
                                </span>
                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {filterOpen && (
                                <div className="absolute z-10 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 py-2 right-0">
                                    {["All", "Pending", "Partially Paid", "Paid"].map((filterOpt) => (
                                        <button
                                            key={filterOpt}
                                            onClick={() => { setStatusFilter(filterOpt); setFilterOpen(false); setCurrentPage(1); }}
                                            className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${statusFilter === filterOpt ? "bg-pink-50 text-pink-600 font-bold" : "text-gray-700 hover:bg-gray-50 font-medium"}`}
                                        >
                                            {filterOpt === "All" ? "All Transactions" : filterOpt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Export & Prominent Upper-Right Pay Buttons */}
                    <div className="flex items-center justify-end gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="flex-1 md:flex-initial px-6 py-3 bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 rounded-full font-bold shadow-sm hover:shadow active:scale-95 transition-all text-base flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                            <Download className="w-4 h-4 text-pink-500" />
                            <span>Export</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenCustomerPayModal}
                            className="flex-1 md:flex-initial px-10 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold shadow-md shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-500/30 active:scale-95 transition-all text-base flex items-center justify-center cursor-pointer whitespace-nowrap"
                        >
                            Pay
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
                        <p className="mt-4 text-gray-500 font-medium tracking-tight">Loading transactions...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-pink-200 overflow-hidden">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-separate min-w-max" style={{ borderSpacing: "0 6px" }}>
                                <thead>
                                    <tr>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Service</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                                        <th className="pb-2 px-4 text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedAppointments.map((trx) => {
                                        const isPaid = trx.status === 'Completed' || trx.payment_status === 'Paid';
                                        const totalPrice = trx.price || 0;
                                        const dpPaid = Number(trx.downpayment_amount) || Number(trx.downpayment_paid) || 0;
                                        const remainingBalance = Math.max(0, totalPrice - dpPaid);
                                        const isPartiallyPaid = !isPaid && (
                                            trx.payment_status === 'Partially Paid' ||
                                            (dpPaid > 0 && remainingBalance > 0 && trx.status !== 'Cancelled')
                                        );
                                        const isPending = !isPaid && !isPartiallyPaid && trx.status !== 'Cancelled';
                                        const customerName = trx.customers?.name || trx.customer_name || "Unknown";
                                        const serviceName = trx.service_name || trx.services?.name || "Unknown Service";

                                        return (
                                            <tr key={trx.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                                <td className="py-2.5 px-4 text-sm font-bold text-gray-900 rounded-l-xl whitespace-nowrap">
                                                    {customerName}
                                                </td>
                                                <td className="py-2.5 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">{serviceName}</td>
                                                <td className="py-2.5 px-4 text-sm whitespace-nowrap">
                                                    {isPartiallyPaid ? (
                                                        <div className="flex flex-col py-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-gray-900 text-sm">₱{totalPrice.toLocaleString()}</span>
                                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">(Total)</span>
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                                <span>Paid: <strong className="text-emerald-600 font-bold">₱{dpPaid.toLocaleString()}</strong></span>
                                                                <span>•</span>
                                                                <span>Remaining: <strong className="text-pink-600 font-bold">₱{remainingBalance.toLocaleString()}</strong></span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-gray-900">₱{totalPrice.toLocaleString()}</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 text-sm text-center whitespace-nowrap">
                                                    <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight border ${
                                                        isPaid
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                            : isPartiallyPaid
                                                            ? 'bg-pink-50 text-pink-600 border-pink-200'
                                                            : 'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                        {isPaid ? "Paid" : isPartiallyPaid ? "Partially Paid" : "Pending Payment"}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 text-sm rounded-r-xl text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {!isPaid ? (
                                                            <button
                                                                onClick={() => handleOpenPayment(trx)}
                                                                className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg font-bold shadow-sm hover:bg-emerald-600 transition-all text-xs"
                                                            >
                                                                {isPartiallyPaid ? "Pay Balance" : "Pay"}
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleViewReceipt(trx)} className="px-3 py-1.5 bg-[#F02D98]/10 text-[#F02D98] rounded-lg border border-[#F02D98]/25 shadow-xs hover:bg-[#F02D98]/20 font-bold transition-all text-xs" title="Print Receipt">Receipt</button>
                                                                <button 
                                                                    onClick={() => handleSendReceiptEmail(trx)} 
                                                                    disabled={isSendingEmail === trx.id}
                                                                    className="px-3 py-1.5 bg-white text-gray-600 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 font-bold transition-all flex items-center gap-1 text-xs"
                                                                    title="Send to Gmail"
                                                                >
                                                                    {isSendingEmail === trx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                                    <span>Send</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                    </div>
                )}

                {/* Pagination Component */}
                {!loading && (
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Customer-Based Payment Modal */}
            {isCustomerPayModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className={`bg-white rounded-3xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden sm:min-h-[600px] max-h-[90vh] transition-all ${
                        customerPayStep === 'SELECT_CUSTOMER' ? 'max-w-[580px]' : 'max-w-4xl'
                    }`}>
                        {/* Modal Header */}
                        <div className="px-6 py-4.5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Select Customer for Payment</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {customerPayStep === 'SELECT_CUSTOMER'
                                        ? "Search for a customer to view and pay for their booked services"
                                        : `Select services to pay for ${selectedCustomer?.name || 'Customer'}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomerPayModalOpen(false)}
                                className="text-gray-400 hover:text-pink-500 transition-colors p-1 rounded-full hover:bg-pink-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        {customerPayStep === 'SELECT_CUSTOMER' ? (
                            <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-4">
                                <div className="space-y-4">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search customer name..."
                                            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-gray-50/70 border border-pink-100 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm font-medium transition-all"
                                            value={customerSearchTerm}
                                            onChange={(e) => handleCustomerSearch(e.target.value)}
                                            autoFocus
                                        />
                                        {searchingCustomers && (
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Customers List */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {customerSearchTerm ? "Matching Customers" : "Customers with Pending Services"}
                                            </span>
                                            <span className="text-xs text-pink-600 font-semibold">
                                                {customerSearchResults.length} customer{customerSearchResults.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {customerSearchResults.length === 0 ? (
                                            <div className="py-12 text-center space-y-2 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
                                                <p className="text-sm font-bold text-gray-700">No customers found</p>
                                                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                                                    {customerSearchTerm
                                                        ? `No customer matching "${customerSearchTerm}". Try another name or phone number.`
                                                        : "No customers currently have pending appointments."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                                                {customerSearchResults.map((cust, idx) => (
                                                    <div
                                                        key={cust.id || `cust-${idx}`}
                                                        onClick={() => handleSelectCustomer(cust)}
                                                        className="p-3.5 rounded-2xl border border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50/30 transition-all cursor-pointer flex items-center justify-between group shadow-xs hover:shadow-md min-h-[66px]"
                                                    >
                                                        <div className="min-w-0 flex-1 pr-2.5">
                                                            <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-pink-600 transition-colors">
                                                                {cust.name}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                {cust.phone || cust.email || "Registered Customer"}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                                                                cust.pendingCount > 0 
                                                                    ? 'bg-pink-50 text-pink-600 border border-pink-200' 
                                                                    : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                                {cust.pendingCount} pending
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* STEP 2: SELECT SERVICES (Dynamic Height & Scrollable) */
                            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                {/* Selected Customer Header Bar (Sticky) */}
                                <div className="p-4 sm:px-7 sm:py-4 border-b border-gray-100 bg-pink-50/40 shrink-0 flex justify-between items-center">
                                    <div className="min-w-0 flex-1 pr-3">
                                        <h4 className="text-sm font-bold text-gray-900 truncate">{selectedCustomer?.name}</h4>
                                        <p className="text-xs text-gray-500 truncate mt-1">
                                            {selectedCustomer?.phone || selectedCustomer?.email || "Customer"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCustomerPayStep('SELECT_CUSTOMER')}
                                        className="px-3.5 py-2 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>Change Customer</span>
                                    </button>
                                </div>

                                {/* Dynamic & Independently Scrollable Services List Area */}
                                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-7 min-h-0 space-y-3.5">
                                    {loadingCustomerAppointments ? (
                                        <div className="py-20 text-center">
                                            <Loader2 className="w-9 h-9 animate-spin text-pink-500 mx-auto" />
                                            <p className="mt-3 text-xs font-semibold text-gray-500">Loading booked services...</p>
                                        </div>
                                    ) : customerPendingAppointments.length === 0 ? (
                                        <div className="py-16 text-center space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                            <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
                                            <h4 className="text-sm font-bold text-gray-800">No Pending Services Found</h4>
                                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                                This customer currently has no unpaid or pending bookings. All scheduled services may have already been paid.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setCustomerPayStep('SELECT_CUSTOMER')}
                                                className="mt-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-colors shadow-sm cursor-pointer"
                                            >
                                                Select Another Customer
                                            </button>
                                        </div>
                                    ) : (
                                        /* Services Table without Checkboxes */
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1 pb-1">
                                                <span className="text-xs text-gray-500 font-medium">
                                                    Click any service row to include or exclude it from payment:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={toggleSelectAllServices}
                                                    className="text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline cursor-pointer transition-colors"
                                                >
                                                    {selectedAppointmentIds.length === customerPendingAppointments.length ? "Deselect All" : "Select All"}
                                                </button>
                                            </div>

                                            <div className="border border-pink-100 rounded-2xl shadow-xs bg-white overflow-hidden">
                                                <table className="w-full table-fixed text-left text-xs">
                                                    <colgroup>
                                                        <col className="w-[27%]" />
                                                        <col className="w-[21%]" />
                                                        <col className="w-[18%]" />
                                                        <col className="w-[16%]" />
                                                        <col className="w-[18%]" />
                                                    </colgroup>
                                                    <thead className="bg-pink-50/60 border-b border-pink-100 text-gray-700">
                                                        <tr>
                                                            <th className="py-4 px-3 sm:px-4 font-bold text-pink-600 uppercase tracking-wider text-[11px] sm:text-xs">Service Name</th>
                                                            <th className="py-4 px-3 sm:px-4 font-bold text-pink-600 uppercase tracking-wider text-[11px] sm:text-xs">Appointment Date</th>
                                                            <th className="py-4 px-3 sm:px-4 font-bold text-pink-600 uppercase tracking-wider text-[11px] sm:text-xs">Assigned Staff</th>
                                                            <th className="py-4 px-3 sm:px-4 font-bold text-pink-600 uppercase tracking-wider text-[11px] sm:text-xs text-right">Service Price</th>
                                                            <th className="py-4 px-3 sm:px-4 font-bold text-pink-600 uppercase tracking-wider text-[11px] sm:text-xs text-center whitespace-nowrap">Payment Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                        {customerPendingAppointments.map((apt) => {
                                                            const isChecked = selectedAppointmentIds.includes(apt.id!);
                                                            const formattedDate = apt.appointment_date || "Scheduled Date";
                                                            const staffName = apt.staff?.name || apt.staff_name || "Assigned Staff";
                                                            const serviceName = apt.services?.name || apt.service_name || "Salon Service";
                                                            const price = formatPrice(apt.price);

                                                            return (
                                                                <tr
                                                                    key={apt.id}
                                                                    onClick={() => toggleSelectService(apt.id!)}
                                                                    className={`transition-all cursor-pointer select-none ${
                                                                        isChecked 
                                                                            ? 'bg-pink-50/35 hover:bg-pink-50/60' 
                                                                            : 'bg-white hover:bg-gray-50/80 opacity-50'
                                                                    }`}
                                                                >
                                                                    <td className="py-4 sm:py-4.5 px-3 sm:px-4 font-bold text-gray-900">
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            <span className={`w-2 h-2 rounded-full shrink-0 ${isChecked ? 'bg-pink-500' : 'bg-gray-300'}`} />
                                                                            <span className="truncate">{serviceName}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 sm:py-4.5 px-3 sm:px-4 text-gray-600">
                                                                        <div className="min-w-0">
                                                                            <span className="font-semibold text-gray-800 text-xs">{formattedDate}</span>
                                                                            {apt.appointment_time && (
                                                                                <span className="block text-[11px] text-gray-400 mt-0.5 truncate">{apt.appointment_time}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 sm:py-4.5 px-3 sm:px-4 text-gray-600 font-medium">
                                                                        <span className="truncate block">{staffName}</span>
                                                                    </td>
                                                                    <td className="py-4 sm:py-4.5 px-3 sm:px-4 font-extrabold text-pink-600 text-xs sm:text-sm text-right whitespace-nowrap">
                                                                        ₱{price.toLocaleString()}
                                                                    </td>
                                                                    <td className="py-4 sm:py-4.5 px-3 sm:px-4 text-center">
                                                                        <div className="flex justify-center items-center">
                                                                            {isChecked ? (
                                                                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs whitespace-nowrap">
                                                                                    Pending
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap">
                                                                                    Excluded
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer for Step 2 (Always Visible at Bottom) */}
                                {customerPendingAppointments.length > 0 && (
                                    <div className="p-5 sm:px-7 sm:py-5 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                                        <div className="text-left w-full sm:w-auto space-y-0.5">
                                            <p className="text-xs text-gray-500 font-medium">
                                                Selected services: <span className="font-bold text-gray-800">{selectedAppointmentIds.length}</span> of {customerPendingAppointments.length}
                                            </p>
                                            <p className="text-base sm:text-lg font-black text-pink-600 tracking-tight">
                                                Total Amount: ₱{selectedServicesSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomerPayModalOpen(false)}
                                                className="h-11 px-5 bg-white border border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-400 rounded-xl font-bold transition-all text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={selectedAppointmentIds.length === 0}
                                                onClick={handleProceedToFinalizePayment}
                                                className={`h-11 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                                                    selectedAppointmentIds.length > 0
                                                        ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/35 active:scale-95'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                                                }`}
                                            >
                                                <span>Proceed to Payment</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {selectedApt && !showReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-[490px] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden">
                        <div className="px-6 py-4.5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Finalize Payment</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedApt(null);
                                    setSelectedAppointmentsBatch([]);
                                }}
                                className="text-gray-400 hover:text-pink-500 transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
                            {/* Top 5 Customer Loyalty Reward Banner */}
                            {availableLoyaltyReward && (
                                <div className="rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 via-rose-50/70 to-pink-50 p-3.5 shadow-2xs">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-500 text-white shadow-2xs">
                                                    ⭐ TOP 5 CUSTOMER
                                                </span>
                                                <span className="text-[11px] font-bold text-pink-700">
                                                    Rank #{availableLoyaltyReward.rank_position} ({availableLoyaltyReward.ranking_period_label})
                                                </span>
                                            </div>
                                            <p className="text-xs font-extrabold text-gray-900 mt-1.5">
                                                Available Reward: <span className="text-pink-600">{availableLoyaltyReward.reward_description}</span>
                                            </p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Valid until {new Date(availableLoyaltyReward.valid_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                            {!loyaltyCalc.isApplicable && loyaltyCalc.reason && (
                                                <p className="text-[11px] text-amber-600 font-semibold mt-1">
                                                    {loyaltyCalc.reason}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!loyaltyCalc.isApplicable}
                                            onClick={() => setIsLoyaltyRewardApplied((prev) => !prev)}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                                                !loyaltyCalc.isApplicable
                                                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                                    : isLoyaltyRewardApplied
                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                        : "bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200 active:scale-95"
                                            }`}
                                        >
                                            {isLoyaltyRewardApplied ? "Reward Applied ✓" : "Apply Reward"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">1. Payment Summary</h4>
                                    {selectedAppointmentsBatch.length > 1 && (
                                        <span className="text-[11px] font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                                            {selectedAppointmentsBatch.length} Services Selected
                                        </span>
                                    )}
                                </div>
                                <div className="bg-pink-50/40 border border-pink-100/80 rounded-2xl p-4 space-y-2">
                                    {selectedAppointmentsBatch.length > 1 ? (
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                            {selectedAppointmentsBatch.map((apt) => (
                                                <div key={apt.id} className="flex justify-between items-center text-xs text-gray-600">
                                                    <span className="truncate max-w-[260px] font-medium">{apt.services?.name || apt.service_name || "Service"}</span>
                                                    <span className="font-bold text-gray-900">₱{formatPrice(apt.price).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            <div className="h-px bg-pink-100 my-1" />
                                        </div>
                                    ) : null}
                                    <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                                        <span>{appliedDiscountAmount > 0 ? "Original subtotal:" : "Service Price:"}</span>
                                        <span className="text-gray-900 font-bold">₱{apptFee.toLocaleString()}</span>
                                    </div>
                                    {appliedDiscountAmount > 0 && availableLoyaltyReward && (
                                        <div className="flex justify-between items-center text-sm font-bold text-pink-600">
                                            <span>Loyalty discount ({availableLoyaltyReward.reward_description}):</span>
                                            <span>-₱{appliedDiscountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {totalDownpaymentCredited > 0 && (
                                        <div className="flex justify-between items-center text-sm font-bold text-emerald-600">
                                            <span>Downpayment Credited:</span>
                                            <span>-₱{totalDownpaymentCredited.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {excessCredit > 0 && (
                                        <div className="flex justify-between items-center text-xs font-semibold text-amber-700 bg-amber-50 p-2 rounded-lg">
                                            <span>Excess DP Credit (To Refund/Credit):</span>
                                            <span className="font-bold">₱{excessCredit.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                                        <span>Tax (0%):</span>
                                        <span className="text-gray-900 font-bold">₱0.00</span>
                                    </div>
                                    <div className="h-px bg-pink-100 my-1" />
                                    <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                                        <span className="text-gray-800">{totalDownpaymentCredited > 0 || appliedDiscountAmount > 0 ? "Balance Due:" : "Total Amount:"}</span>
                                        <span className="text-lg text-pink-600 font-extrabold">₱{totalWithTax.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">2. Mode of Payment</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {paymentMethods.map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.name)}
                                            className={`py-2.5 px-4 rounded-xl border font-bold text-sm transition-all ${paymentMethod === m.name ? 'bg-pink-50 border-pink-500 text-pink-600 shadow-sm' : 'bg-gray-50/70 border-gray-200 text-gray-600 hover:bg-gray-100/60'}`}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                    {paymentMethods.length === 0 && (
                                        <p className="col-span-2 text-center text-xs text-gray-400 py-2 italic font-bold">No active payment methods contact admin</p>
                                    )}
                                </div>
                                
                                {paymentMethod.toLowerCase() === 'gcash' ? (
                                    <div className="mt-3 flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50/70 border border-pink-100/60 shadow-inner">
                                        <div className="text-center space-y-1">
                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Redirect to PayMongo</h4>
                                            <p className="text-xs text-gray-500 max-w-[320px] mx-auto leading-relaxed">
                                                You will be directed to PayMongo&apos;s secure hosted payment page. The customer can complete their transaction there.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative mt-2.5 space-y-2">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <PhilippinePeso className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="number"
                                                required={totalWithTax > 0}
                                                placeholder="Amount Received"
                                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border ${!isAmountReceivedValid && paymentAmount !== "" ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 focus:ring-pink-500'} text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-sans`}
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                            />
                                        </div>
                                        {!isAmountReceivedValid && paymentAmount !== "" ? (
                                            <p className="text-[11px] text-rose-500 font-bold px-1 animate-pulse">Insufficient amount to cover the total bill.</p>
                                        ) : paymentAmount !== "" && (
                                            <div className="px-3.5 py-2 flex justify-between items-center bg-emerald-50 rounded-xl border border-emerald-100 animate-in slide-in-from-top-1">
                                                <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Change Due:</span>
                                                <span className="text-sm text-emerald-800 font-black">₱{change.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={handleGoBackFromPayment}
                                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-pink-600 transition-colors p-0 cursor-pointer active:scale-95"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Go Back</span>
                                </button>

                                {paymentMethod.toLowerCase() === 'gcash' ? (
                                    <button
                                        type="button"
                                        disabled={!checkoutUrl || generatingQR || isRedirectingToPayMongo}
                                        onClick={() => {
                                            if (checkoutUrl) {
                                                setIsRedirectingToPayMongo(true);
                                                window.location.href = checkoutUrl;
                                            }
                                        }}
                                        className={`py-3 px-6 rounded-xl font-bold shadow-md transition-all text-sm ${(!checkoutUrl || generatingQR || isRedirectingToPayMongo) ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200 cursor-pointer'}`}
                                    >
                                        {isRedirectingToPayMongo ? "Redirecting to PayMongo..." : generatingQR ? "Preparing Checkout..." : "Proceed to PayMongo"}
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!isAmountReceivedValid}
                                        className={`py-3 px-6 rounded-xl font-bold shadow-md active:scale-95 transition-all text-sm cursor-pointer min-w-[130px] text-center ${
                                            isAmountReceivedValid 
                                                ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/25 hover:shadow-pink-500/35' 
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                                        }`}
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Payment Success & Receipt Modal Workflow */}
            {showSuccessModal && paymentSuccessData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden text-center p-6 sm:p-8">
                        
                        {/* STEP 1: PAYMENT SUCCESSFUL MODAL */}
                        {receiptModalStep === 'PAYMENT_SUCCESS' && (
                            <>
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-100">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>

                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Payment Successful!</h3>

                                <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                                    Your payment has been successfully processed. Would you like to send the receipt to the customer&apos;s registered email address?
                                </p>

                                <div className="bg-pink-50/40 border border-pink-100 rounded-2xl p-4 my-5 text-left text-xs space-y-2.5">
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-gray-500 font-medium shrink-0">Customer Name:</span>
                                        <span className="font-bold text-gray-900 truncate text-right">{paymentSuccessData.customerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-gray-500 font-medium shrink-0">Service Name:</span>
                                        <span className="font-semibold text-gray-800 truncate text-right">{paymentSuccessData.serviceName}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-gray-500 font-medium shrink-0">Total Amount:</span>
                                        <span className="font-extrabold text-pink-600 text-sm">₱{paymentSuccessData.totalPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-gray-500 font-medium shrink-0">Payment Method:</span>
                                        <span className="font-bold text-gray-800">{paymentSuccessData.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-3 pt-2 border-t border-pink-100/70">
                                        <span className="text-gray-500 font-medium shrink-0">Customer Email:</span>
                                        <span className="font-medium text-gray-700 truncate text-right max-w-[200px]" title={paymentSuccessData.customerEmail || "No registered email"}>
                                            {paymentSuccessData.customerEmail || <span className="text-gray-400 italic">No registered email</span>}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleCloseSuccessModal}
                                        className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold transition-all text-xs sm:text-sm shadow-sm active:scale-95"
                                    >
                                        Close
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSendingReceiptModal}
                                        onClick={handleTriggerSendReceipt}
                                        className="flex-1 py-3 px-4 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all text-xs sm:text-sm shadow-lg shadow-pink-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                                    >
                                        <Mail className="w-4 h-4" />
                                        <span>Send Receipt</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* STEP 2: LOADING MODAL ("Sending Receipt...") */}
                        {receiptModalStep === 'SENDING' && (
                            <div className="py-4">
                                <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-pink-100 shadow-inner">
                                    <Loader2 className="w-9 h-9 animate-spin text-pink-500" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Sending Receipt...</h3>
                                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-[260px] mx-auto">
                                    Please wait while we send the receipt to the customer&apos;s email.
                                </p>
                            </div>
                        )}

                        {/* STEP 3: SUCCESS MODAL ("Receipt Sent Successfully!") */}
                        {receiptModalStep === 'RECEIPT_SUCCESS' && (
                            <div className="py-2">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>

                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-3">Receipt Sent Successfully!</h3>
                                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6 max-w-[270px] mx-auto">
                                    The receipt was successfully sent to the customer&apos;s registered email.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleCloseSuccessModal}
                                    className="w-full py-3.5 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-pink-500/20 active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        {/* STEP 4: ERROR MODAL ("Unable to Send Receipt") */}
                        {receiptModalStep === 'RECEIPT_ERROR' && (
                            <div className="py-2">
                                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-sm">
                                    <XCircle className="w-10 h-10 text-rose-500" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-3">Unable to Send Receipt</h3>
                                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-5 max-w-[270px] mx-auto">
                                    {receiptErrorMessage || (
                                        <>Something went wrong while sending the receipt.<br />Please try again.</>
                                    )}
                                </p>

                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        type="button"
                                        onClick={handleCloseSuccessModal}
                                        className="flex-1 py-3 px-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold transition-all text-xs sm:text-sm shadow-sm active:scale-95"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReceiptModalStep('PAYMENT_SUCCESS')}
                                        className="flex-1 py-3 px-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all text-xs sm:text-sm shadow-lg shadow-pink-500/20 active:scale-95"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: MISSING EMAIL MODAL ("Unable to Send Receipt") */}
                        {receiptModalStep === 'MISSING_EMAIL' && (
                            <div className="py-2">
                                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm">
                                    <AlertCircle className="w-10 h-10 text-amber-500" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-3">Unable to Send Receipt</h3>
                                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6 max-w-[270px] mx-auto">
                                    This customer does not have a registered email address.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleCloseSuccessModal}
                                    className="w-full py-3.5 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-pink-500/20 active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PayMongo Return Verification Loader */}
            {isVerifyingGcashPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden text-center p-6 sm:p-8">
                        <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-100 shadow-inner">
                            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Verifying Payment...</h3>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                            Please wait while we confirm your GCash transaction with PayMongo.
                        </p>
                    </div>
                </div>
            )}

            {/* Redesigned GCash Payment Success Modal */}
            {showGcashSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden text-center p-6 sm:p-8">
                        {/* Upper-right Close Button */}
                        <button
                            type="button"
                            onClick={handleCloseGcashSuccessModal}
                            aria-label="Close modal"
                            className="absolute right-4 top-4 text-gray-400 hover:text-pink-500 transition-colors p-1.5 rounded-full hover:bg-pink-50 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Pink Circular Success Icon with Checkmark */}
                        <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-100 shadow-sm">
                            <CheckCircle2 className="w-9 h-9 text-pink-500" />
                        </div>

                        {/* Heading */}
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                            Payment Successful!
                        </h3>

                        {/* Supporting Text */}
                        <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                            Your GCash payment has been authorized successfully.
                        </p>

                        {/* Additional Message */}
                        <p className="text-pink-600 font-semibold text-xs sm:text-sm mt-1">
                            Thank you for your payment!
                        </p>

                        {/* Transaction Details (if available) */}
                        {gcashSuccessData && (
                            <div className="bg-pink-50/40 border border-pink-100 rounded-2xl p-4 my-5 text-left text-xs space-y-2">
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-gray-500 font-medium">Customer:</span>
                                    <span className="font-bold text-gray-900 truncate text-right">
                                        {gcashSuccessData.customerName}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-gray-500 font-medium">Service:</span>
                                    <span className="font-semibold text-gray-800 truncate text-right">
                                        {gcashSuccessData.serviceName}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-gray-500 font-medium">Payment Method:</span>
                                    <span className="font-bold text-gray-800">GCash (PayMongo)</span>
                                </div>
                                <div className="flex justify-between items-center gap-3 pt-2 border-t border-pink-100/70">
                                    <span className="text-gray-500 font-medium">Total Paid:</span>
                                    <span className="font-extrabold text-pink-600 text-sm">
                                        ₱{Number(gcashSuccessData.amount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Prominent Pink Button labeled "Back to Billing" */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleCloseGcashSuccessModal}
                                className="w-full py-3.5 px-6 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/35 active:scale-95 transition-all text-sm sm:text-base cursor-pointer"
                            >
                                Back to Billing
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Dedicated In-Page Printable Receipt Sheet */}
            {printingReceipt && (
                <div id="receipt-print-wrapper" aria-hidden="true" className="bg-[#FFFBF2]">
                    <div id="receipt-paper" style={{ maxWidth: "80mm", margin: "0 auto", background: "#ffffff", padding: "6mm", fontFamily: "Arial, Helvetica, sans-serif" }}>
                        <div style={{ textAlign: "center", paddingBottom: "12px" }}>
                            <h2 style={{ fontWeight: 800, fontSize: "16px", textTransform: "uppercase", marginBottom: "4px", color: "#000" }}>
                                {(salonInfo.name || "CANDY & ROSE").toUpperCase()}
                            </h2>
                            <p style={{ fontSize: "10.5px", color: "#6b7280", lineHeight: 1.3 }}>
                                {salonInfo.address}
                            </p>
                            <p style={{ fontSize: "10.5px", color: "#6b7280", marginTop: "2px" }}>
                                {salonInfo.phone}
                            </p>
                        </div>

                        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "12px" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <span style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#000" }}>
                                SALES INVOICE
                            </span>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>
                                #{printingReceipt.invoiceNumber}
                            </span>
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "12px", lineHeight: 1.6 }}>
                            <div style={{ display: "flex", alignItems: "flex-start" }}>
                                <span style={{ width: "85px", color: "#6b7280", flexShrink: 0 }}>CUSTOMER:</span>
                                <span style={{ fontWeight: 700, color: "#000", textTransform: "uppercase" }}>{printingReceipt.customerName}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start" }}>
                                <span style={{ width: "85px", color: "#6b7280", flexShrink: 0 }}>STAFF:</span>
                                <span style={{ fontWeight: 600, color: "#000", textTransform: "uppercase" }}>{printingReceipt.staffName}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start" }}>
                                <span style={{ width: "85px", color: "#6b7280", flexShrink: 0 }}>DATE:</span>
                                <span style={{ fontWeight: 600, color: "#000" }}>{printingReceipt.formattedDateTime}</span>
                            </div>
                        </div>

                        <div style={{ backgroundColor: "#fff1f2", padding: "6px 10px", borderRadius: "2px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: 700, color: "#F02D98", textTransform: "uppercase", marginBottom: "8px" }}>
                            <span>DESCRIPTION</span>
                            <span>PRICE</span>
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                                <span style={{ color: "#000", flex: 1 }}>{printingReceipt.serviceName}</span>
                                <span style={{ fontWeight: 700, color: "#000", fontFamily: "monospace", flexShrink: 0 }}>₱{printingReceipt.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "12px" }} />

                        <div style={{ fontSize: "11px", marginBottom: "12px", lineHeight: 1.5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                                <span>Sub-total:</span>
                                <span style={{ fontFamily: "monospace", fontWeight: 500, color: "#000" }}>₱{printingReceipt.subtotal.toLocaleString()}</span>
                            </div>
                            {printingReceipt.loyaltyDiscountAmount && printingReceipt.loyaltyDiscountAmount > 0 ? (
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#F02D98", fontWeight: 700 }}>
                                    <span>Loyalty Discount ({printingReceipt.loyaltyRewardDescription || 'Top 5 Reward'}):</span>
                                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>-₱{printingReceipt.loyaltyDiscountAmount.toLocaleString()}</span>
                                </div>
                            ) : null}
                            {printingReceipt.downpaymentCredited && printingReceipt.downpaymentCredited > 0 ? (
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: 700 }}>
                                    <span>Downpayment Credited:</span>
                                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>-₱{printingReceipt.downpaymentCredited.toLocaleString()}</span>
                                </div>
                            ) : null}
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                                <span>Tax (0%):</span>
                                <span style={{ fontFamily: "monospace", fontWeight: 500, color: "#000" }}>₱0.00</span>
                            </div>
                        </div>

                        <div style={{ backgroundColor: "#F02D98", color: "#ffffff", padding: "8px 10px", borderRadius: "2px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "12px" }}>
                            <span>TOTAL AMOUNT:</span>
                            <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 900 }}>₱{printingReceipt.totalAmount.toLocaleString()}</span>
                        </div>

                        <div style={{ fontSize: "11px", marginBottom: "16px", lineHeight: 1.5 }}>
                            {printingReceipt.isCash ? (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                                        <span>Cash Paid:</span>
                                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#000" }}>₱{printingReceipt.cashReceived.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#F02D98" }}>
                                        <span>CHANGE:</span>
                                        <span style={{ fontFamily: "monospace" }}>₱{printingReceipt.changeDue.toLocaleString()}</span>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                                    <span>Payment Method:</span>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase", color: "#000" }}>{printingReceipt.paymentMethod}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ textAlign: "center", paddingTop: "8px", fontSize: "11px", color: "#6b7280", lineHeight: 1.4 }}>
                            <p style={{ fontStyle: "italic" }}>Thank you for your visit!</p>
                            <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Please visit us again soon.</p>
                        </div>

                        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #d1d5db", textAlign: "center", color: "#9ca3af", fontSize: "10px", fontFamily: "monospace" }}>
                            - - - - - - TEAR HERE - - - - - -
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                    @media screen {
                        #receipt-print-wrapper {
                            display: none !important;
                        }
                    }
                    @media print {
                        @page {
                            size: 80mm auto;
                            margin: 0;
                        }
                        html, body {
                            background: #ffffff !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            color: #000000 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        aside,
                        header,
                        nav,
                        .no-print,
                        #billing-screen-content {
                            display: none !important;
                        }
                        #receipt-print-wrapper {
                            display: block !important;
                            width: 100% !important;
                            max-width: 80mm !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                            box-shadow: none !important;
                        }
                        #receipt-paper {
                            background: #ffffff !important;
                            box-shadow: none !important;
                            border: none !important;
                            padding: 6mm !important;
                        }
                    }
                `
            }} />
        </div>
    );
}
