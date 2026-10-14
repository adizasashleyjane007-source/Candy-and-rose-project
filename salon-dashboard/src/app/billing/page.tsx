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
    Mail
} from "lucide-react";
import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";
import { addNotification } from "@/lib/notifications";
import { Appointments, Billing, SettingsDB, fulfillPaymentSuccess, type Appointment, type BillingRecord } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

interface PrintingReceiptData {
    invoiceNumber: string;
    customerName: string;
    staffName: string;
    formattedDateTime: string;
    serviceName: string;
    totalAmount: number;
    subtotal: number;
    paymentMethod: string;
    isCash: boolean;
    cashReceived: number;
    changeDue: number;
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
    const [receiptErrorMessage, setReceiptErrorMessage] = useState<string | null>(null);
    const [paymentSuccessData, setPaymentSuccessData] = useState<{
        customerName: string;
        customerEmail: string | null;
        totalPaid: number;
        paymentMethod: string;
        cashReceived: number;
        change: number;
        appointmentId: string;
    } | null>(null);

    const [salonInfo, setSalonInfo] = useState({
        name: "Candy And Rose Salon",
        address: "Blk and Lot, Dasmarinas Cavite",
        phone: "032-123-4567",
        email: "candyandroses@gmail.com"
    });
    const [cashierName, setCashierName] = useState("Staff");
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [selectedBilling, setSelectedBilling] = useState<BillingRecord | null>(null);
    const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const appts = await Appointments.list();
            setAppointments(appts);
            
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

    useEffect(() => {
        loadData();

        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("gmail_auth") === "success") {
                addNotification("Gmail Connected", "Gmail account authorized successfully for sending receipts.", "billing");
                window.history.replaceState({}, "", window.location.pathname);
            } else if (params.get("gmail_error")) {
                addNotification("Gmail Error", decodeURIComponent(params.get("gmail_error") || "Failed to authorize Gmail."), "billing");
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    }, []);

    useEffect(() => {
        const fetchCheckoutUrl = async () => {
            if (paymentMethod.toLowerCase() === 'gcash' && selectedApt) {
                setGeneratingQR(true);
                const apptFee = selectedApt.price || 0;
                try {
                    const response = await fetch('/api/create-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: selectedApt.id,
                            amount: apptFee,
                            serviceName: selectedApt.service_name || 'Salon Service',
                            customerName: selectedApt.customers?.name || selectedApt.customer_name || 'Guest'
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
    }, [paymentMethod, selectedApt]);

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
                        <span style="font-weight: 700; color: #000; font-family: monospace; flex-shrink: 0;">₱${receipt.totalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;"></div>

                <div style="font-size: 11px; margin-bottom: 12px; line-height: 1.5;">
                    <div style="display: flex; justify-content: space-between; color: #4b5563;">
                        <span>Sub-total:</span>
                        <span style="font-family: monospace; font-weight: 500; color: #000;">₱${receipt.subtotal.toLocaleString()}</span>
                    </div>
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
        const totalAmount = apt.price || 0;
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
        const serviceName = apt.services?.name || apt.service_name || "Salon Service";

        const receiptData: PrintingReceiptData = {
            invoiceNumber: invoiceNum,
            customerName: customerName,
            staffName: staffName,
            formattedDateTime: `${apptDate} ${apptTime}`,
            serviceName: serviceName,
            totalAmount: totalAmount,
            subtotal: totalAmount,
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

        let matchesStatus = true;
        if (statusFilter === "Pending") matchesStatus = apt.status === "Scheduled";
        if (statusFilter === "Paid") matchesStatus = apt.status === "Completed";

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
    const paginatedAppointments = filteredAppointments.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

    // Dynamic Summary Metrics
    const totalRevenue = appointments
        .filter(a => a.status === 'Completed')
        .reduce((sum, a) => sum + (a.price || 0), 0);

    const pendingRevenue = appointments
        .filter(a => a.status === 'Scheduled')
        .reduce((sum, a) => sum + (a.price || 0), 0);

    const paidTransactionsCount = appointments.filter(a => a.status === 'Completed').length;

    const handleOpenPayment = (apt: Appointment) => {
        setSelectedApt(apt);
        setPaymentAmount(""); 
        setPaymentMethod("Cash");
        setSelectedBilling(null);
        setReceiptModalStep('PAYMENT_SUCCESS');
    };

    const handleViewReceipt = async (apt: Appointment) => {
        let matchedBill: BillingRecord | null = null;
        try {
            const billings = await Billing.list();
            matchedBill = billings.find(b => b.appointment_id === apt.id || b.id === apt.id) || null;
        } catch (err) {
            console.warn("Could not load billing record:", err);
        }

        const totalAmount = apt.price || matchedBill?.amount || 0;
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
            subtotal: totalAmount,
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
        
        if (!selectedApt) return;
        
        const currentTotal = totalWithTax;

        // Cash Payment Validation
        if (paymentMethod.toLowerCase() === 'cash') {
            const enteredCash = parseFloat(paymentAmount);
            if (isNaN(enteredCash) || enteredCash < currentTotal) {
                addNotification("Payment Validation Error", "Please enter a valid cash amount equal to or greater than the total amount.", "billing");
                return;
            }
        }

        try {
            const billAmount = totalWithTax;
            const cashRec = paymentMethod.toLowerCase() === 'cash' ? Number(paymentAmount) : totalWithTax;
            const calcChange = Math.max(0, cashRec - billAmount);

            // Fulfill payment success server-side idempotently
            const res = await fulfillPaymentSuccess({
                appointmentId: selectedApt.id!,
                amount: billAmount,
                cashReceived: cashRec,
                paymentMethod: paymentMethod,
                notes: `Payment for ${selectedApt.service_name || 'service'}`
            });

            if (!res.success) {
                throw new Error(res.error || "Payment fulfillment failed");
            }

            addNotification("Success", "Payment confirmed successfully.", "billing");
            
            if (wantsPrint) {
                handlePrint(cashRec);
            }
            
            // Prepare success dashboard data
            const custName = selectedApt.customers?.name || selectedApt.customer_name || "Valued Customer";
            const custEmail = selectedApt.customers?.email || null;

            setPaymentSuccessData({
                customerName: custName,
                customerEmail: custEmail,
                totalPaid: billAmount,
                paymentMethod: paymentMethod,
                cashReceived: cashRec,
                change: calcChange,
                appointmentId: selectedApt.id!
            });

            // Transition from payment input modal to Payment Success Dashboard
            setSelectedApt(null);
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
        if (!paymentSuccessData || receiptModalStep === 'SENDING') return;

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
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setReceiptModalStep('PAYMENT_SUCCESS');
        setPaymentSuccessData(null);
    };



    const formatPrice = (p: number | null | undefined) => p || 0;
    
    // Receipt Calculations
    const apptFee = selectedApt ? formatPrice(selectedApt.price) : 0;
    const tax = 0; 
    const totalWithTax = apptFee + tax;
    const isAmountReceivedValid = parseInt(paymentAmount) >= totalWithTax;
    const change = Math.max(0, (parseInt(paymentAmount) || 0) - totalWithTax);

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
                                    {["All", "Pending", "Paid"].map((filterOpt) => (
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
                                        const isPending = trx.status !== 'Completed' && trx.status !== 'Cancelled';
                                        const customerName = trx.customers?.name || trx.customer_name || "Unknown";
                                        const serviceName = trx.service_name || "Unknown Service";
                                        return (
                                            <tr key={trx.id} className="bg-gray-50/50 hover:bg-pink-50/50 transition-all shadow-sm group">
                                                <td className="py-2.5 px-4 text-sm font-bold text-gray-900 rounded-l-xl whitespace-nowrap">
                                                    {customerName}
                                                </td>
                                                <td className="py-2.5 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">{serviceName}</td>
                                                <td className="py-2.5 px-4 text-sm font-bold text-gray-900 whitespace-nowrap">₱{(trx.price || 0).toLocaleString()}</td>
                                                <td className="py-2.5 px-4 text-sm text-center whitespace-nowrap">
                                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight border ${isPending ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                        {isPending ? "Pending Payment" : "Paid"}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 text-sm rounded-r-xl text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {isPending ? (
                                                            <button onClick={() => handleOpenPayment(trx)} className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg font-bold shadow-sm hover:bg-emerald-600 transition-all">Pay</button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleViewReceipt(trx)} className="px-3 py-1.5 bg-[#F02D98]/10 text-[#F02D98] rounded-lg border border-[#F02D98]/25 shadow-xs hover:bg-[#F02D98]/20 font-bold transition-all" title="Print Receipt">Receipt</button>
                                                                <button 
                                                                    onClick={() => handleSendReceiptEmail(trx)} 
                                                                    disabled={isSendingEmail === trx.id}
                                                                    className="px-3 py-1.5 bg-white text-gray-600 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 font-bold transition-all flex items-center gap-1"
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

            {/* Payment Modal */}
            {selectedApt && !showReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Finalize Payment</h3>
                            <button onClick={() => setSelectedApt(null)} className="text-gray-400 hover:text-pink-500"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="p-6 space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">1. Payment Summary</h4>
                                <div className="space-y-2 px-1">
                                    <div className="flex justify-between text-base font-medium text-gray-500">
                                        <span>Service Price:</span>
                                        <span className="text-gray-900 font-bold">₱{apptFee.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium text-gray-500">
                                        <span>Tax (0%):</span>
                                        <span className="text-gray-900 font-bold">₱0.00</span>
                                    </div>
                                    <div className="h-px bg-gray-100 my-2" />
                                    <div className="flex justify-between text-base font-bold text-gray-900 items-center">
                                        <div className="flex items-center gap-2">Total Amount:</div>
                                        <span className="text-xl">₱{totalWithTax.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-800">2. Mode of Payment</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {paymentMethods.map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.name)}
                                            className={`py-3 rounded-xl border font-bold text-sm transition-all ${paymentMethod === m.name ? 'bg-pink-50 border-pink-500 text-pink-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                    {paymentMethods.length === 0 && (
                                        <p className="col-span-2 text-center text-xs text-gray-400 py-2 italic font-bold">No active payment methods contact admin</p>
                                    )}
                                </div>
                                
                                {paymentMethod.toLowerCase() === 'gcash' ? (
                                    <div className="mt-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50/50 border border-pink-100/50 shadow-inner">
                                        <div className="text-center space-y-2">
                                            <h4 className="text-sm font-bold text-gray-900">Redirect to PayMongo</h4>
                                            <p className="text-xs text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                                                You will be directed to PayMongo's secure hosted payment page. The customer can complete their transaction there.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative mt-3">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <PhilippinePeso className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            required
                                            placeholder="Amount Received"
                                            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white border ${!isAmountReceivedValid && paymentAmount !== "" ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-400 focus:ring-pink-500'} text-base font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-sans`}
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                        />
                                        {!isAmountReceivedValid && paymentAmount !== "" ? (
                                            <p className="text-[10px] text-rose-500 font-bold mt-1.5 px-1 animate-pulse">Insufficient amount to cover the total bill.</p>
                                        ) : paymentAmount !== "" && (
                                            <div className="mt-2 px-1 flex justify-between items-center bg-emerald-50 py-2 rounded-lg border border-emerald-100 animate-in slide-in-from-top-1">
                                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Change Due:</span>
                                                <span className="text-sm text-emerald-700 font-black">₱{change.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex items-center gap-4">
                                {paymentMethod.toLowerCase() === 'gcash' ? (
                                    <button
                                        type="button"
                                        disabled={!checkoutUrl || generatingQR}
                                        onClick={() => {
                                            if (checkoutUrl) window.open(checkoutUrl, '_blank');
                                        }}
                                        className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition-all text-sm ${(!checkoutUrl || generatingQR) ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200'}`}
                                    >
                                        {generatingQR ? "Preparing Checkout..." : "Proceed to PayMongo"}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="submit"
                                            disabled={!isAmountReceivedValid}
                                            className={`flex-[2] py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm ${isAmountReceivedValid ? 'bg-pink-400 hover:bg-pink-500 text-white shadow-pink-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'}`}
                                        >
                                            Okay
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!isAmountReceivedValid}
                                            className={`flex-[3] py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm border-2 ${isAmountReceivedValid ? 'bg-white border-pink-400 text-pink-500 hover:bg-pink-50' : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}
                                        >
                                            Print Receipt
                                        </button>
                                        {(selectedApt as any)?.customers?.email && (
                                            <button
                                                type="button"
                                                onClick={() => handleSendReceiptEmail(selectedApt)}
                                                disabled={isSendingEmail === selectedApt.id}
                                                className="flex-1 p-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all bg-gray-900 text-white hover:bg-black flex items-center justify-center"
                                                title="Send to Gmail"
                                            >
                                                {isSendingEmail === selectedApt.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Payment Success & Receipt Modal Workflow */}
            {showSuccessModal && paymentSuccessData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col border border-pink-100 overflow-hidden text-center p-6 sm:p-8">
                        
                        {/* STEP 1: PAYMENT SUCCESSFUL MODAL */}
                        {receiptModalStep === 'PAYMENT_SUCCESS' && (
                            <>
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-100">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>

                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Payment Successful!</h3>

                                <p className="text-gray-600 text-xs sm:text-sm mt-3 leading-relaxed">
                                    The payment for,<br />
                                    <span className="font-extrabold text-pink-600 text-base sm:text-lg block my-1">
                                        &quot;{paymentSuccessData.customerName}&quot;
                                    </span>
                                    is successful!
                                </p>

                                <div className="bg-pink-50/50 border border-pink-100/80 rounded-2xl p-3.5 my-4 text-left text-xs space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Payment Method:</span>
                                        <span className="font-bold text-gray-800">{paymentSuccessData.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Total Paid:</span>
                                        <span className="font-extrabold text-pink-600 text-sm">₱{paymentSuccessData.totalPaid.toLocaleString()}</span>
                                    </div>
                                    {paymentSuccessData.paymentMethod.toLowerCase() === 'cash' && (
                                        <div className="flex justify-between items-center pt-1 border-t border-pink-100/50">
                                            <span className="text-gray-500 font-medium">Change:</span>
                                            <span className="font-bold text-emerald-600">₱{paymentSuccessData.change.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-500 text-xs font-medium italic mb-5">
                                    Thank you for booking with us!<br />Come again!
                                </p>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCloseSuccessModal}
                                        className="flex-1 py-3 px-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold transition-all text-xs sm:text-sm shadow-sm active:scale-95"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleTriggerSendReceipt}
                                        className="flex-1 py-3 px-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all text-xs sm:text-sm shadow-lg shadow-pink-500/20 flex items-center justify-center gap-1.5 active:scale-95"
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
                                    OK
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
                                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-4 max-w-[270px] mx-auto">
                                    {receiptErrorMessage || (
                                        <>Something went wrong while sending the receipt.<br />Please try again.</>
                                    )}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setReceiptModalStep('PAYMENT_SUCCESS')}
                                    className="w-full py-3.5 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-pink-500/20 active:scale-95"
                                >
                                    OK
                                </button>
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
                                    onClick={() => setReceiptModalStep('PAYMENT_SUCCESS')}
                                    className="w-full py-3.5 px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-pink-500/20 active:scale-95"
                                >
                                    OK
                                </button>
                            </div>
                        )}
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
