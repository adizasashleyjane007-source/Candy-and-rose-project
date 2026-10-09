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
import jsPDF from "jspdf";
import "jspdf-autotable";

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

    // Payment Success & Receipt Workflow Modal States
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [receiptModalStep, setReceiptModalStep] = useState<
        'PAYMENT_SUCCESS' | 'SENDING' | 'RECEIPT_SUCCESS' | 'RECEIPT_ERROR' | 'MISSING_EMAIL'
    >('PAYMENT_SUCCESS');
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

    const handlePrint = (customCash?: number) => {
        const { url } = generateReceiptPDFBlob(customCash);
        if (url) window.open(url, "_blank");
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
        setLoading(true);
        try {
            // Find the billing record
            const allBilling = await Billing.list();
            const record = allBilling.find(b => b.appointment_id === apt.id);
            if (record) {
                const cashReceived = record.cash_received || record.amount;
                setSelectedApt(apt); // Temporarily set to generate PDF
                const { url } = generateReceiptPDFBlob(cashReceived, apt);
                if (url) window.open(url, '_blank');
                setSelectedApt(null);
            } else {
                addNotification("Error", "No billing record found for this appointment.", "billing");
            }
        } catch (error) {
            console.error("Failed to load receipt details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReceiptEmail = async (apt: Appointment) => {
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
        } catch (error) {
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
                setReceiptModalStep('RECEIPT_ERROR');
            }
        } catch (error: any) {
            console.error("Error sending receipt:", error);
            setReceiptModalStep('RECEIPT_ERROR');
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setReceiptModalStep('PAYMENT_SUCCESS');
        setPaymentSuccessData(null);
    };

    const generateReceiptPDFBlob = (customCash?: number, customApt?: Appointment | null) => {
        const apt = customApt || selectedApt;
        if (!apt) return { url: null, doc: null };

        const doc = new jsPDF({
            unit: "mm",
            format: [80, 160] 
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 8;
        let y = 15;

        const pink = [236, 72, 153]; // Pink-500

        // Header
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(salonInfo.name.toUpperCase(), pageWidth / 2, y, { align: "center" });
        y += 6;
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        
        // Wrap address to two lines
        const addressLines = doc.splitTextToSize(salonInfo.address, pageWidth - (margin * 2.5));
        doc.text(addressLines, pageWidth / 2, y, { align: "center" });
        y += (addressLines.length * 3.5);
        
        doc.text(salonInfo.phone, pageWidth / 2, y, { align: "center" });
        y += 7;

        // Divider
        doc.setDrawColor(240);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // Receipt Label
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("SALES INVOICE", margin, y);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`#${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - margin, y, { align: "right" });
        y += 8;

        // Customer Details
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text("CUSTOMER:", margin, y);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(apt.customers?.name || apt.customer_name || "Guest", margin + 18, y);
        y += 5;
        
        doc.setTextColor(80);
        doc.setFont("helvetica", "normal");
        doc.text("STAFF:", margin, y);
        doc.setTextColor(0);
        const assignedStaff = apt.staff?.name || apt.staff_name || cashierName;
        doc.text(assignedStaff, margin + 18, y);
        y += 5;

        doc.setTextColor(80);
        doc.text("DATE:", margin, y);
        doc.setTextColor(0);
        doc.text(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + 18, y);
        y += 8;

        // Service Table header
        doc.setFillColor(255, 241, 242);
        doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
        y += 5;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(pink[0], pink[1], pink[2]);
        doc.text("DESCRIPTION", margin + 2, y);
        doc.text("PRICE", pageWidth - margin - 2, y, { align: "right" });
        y += 7;

        // Helper to draw Peso symbol accurately in PDF (Standard fonts don't support ₱)
        const drawCurrency = (text: string, x: number, currY: number, options: any = {}) => {
            const isRight = options.align === "right";
            const fullText = `P ${text}`;
            const pWidth = doc.getTextWidth("P ");
            const totalWidth = doc.getTextWidth(fullText);
            
            const startX = isRight ? x - totalWidth : x;
            
            // Draw the P
            const oldFont = doc.getFont();
            const oldStyle = doc.getFont().fontStyle;
            doc.text("P", startX, currY);
            
            // Draw the two lines through the P
            const fontSize = doc.getFontSize();
            const lineWidth = fontSize * 0.02;
            doc.setLineWidth(lineWidth);
            doc.setDrawColor(doc.getTextColor());
            
            const lineXStart = startX - 0.1;
            const lineXEnd = startX + (pWidth * 0.45);
            const yOffset1 = fontSize * 0.18;
            const yOffset2 = fontSize * 0.25;
            
            doc.line(lineXStart, currY - yOffset1, lineXEnd, currY - yOffset1);
            doc.line(lineXStart, currY - yOffset2, lineXEnd, currY - yOffset2);
            
            // Draw the rest of the amount
            doc.text(text, startX + pWidth, currY);
        };

        // Service Item
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        const aptPrice = apt.price || 0;
        doc.text(apt.service_name || "Salon Service", margin + 2, y);
        drawCurrency(aptPrice.toLocaleString(), pageWidth - margin - 2, y, { align: "right" });
        y += 8;

        // Calculation divider
        doc.setDrawColor(240);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // Totals
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text("Sub-total:", margin + 2, y);
        doc.setTextColor(0);
        drawCurrency(aptPrice.toLocaleString(), pageWidth - margin - 2, y, { align: "right" });
        y += 5;

        doc.setTextColor(80);
        doc.text("Tax (0%):", margin + 2, y);
        doc.setTextColor(0);
        drawCurrency("0.00", pageWidth - margin - 2, y, { align: "right" });
        y += 8;

        // Final Total
        doc.setFillColor(pink[0], pink[1], pink[2]);
        doc.rect(margin, y, pageWidth - (margin * 2), 9, 'F');
        y += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255);
        doc.text("TOTAL AMOUNT:", margin + 2, y);
        drawCurrency(aptPrice.toLocaleString(), pageWidth - margin - 2, y, { align: "right" });
        y += 12;

        // Cash/Change Logic
        const displayCash = customCash !== undefined ? customCash : (Number(paymentAmount) || aptPrice);
        const displayChange = Math.max(0, displayCash - aptPrice);

        doc.setTextColor(80);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Cash Paid:", margin + 2, y);
        doc.setTextColor(0);
        drawCurrency(displayCash.toLocaleString(), pageWidth - margin - 2, y, { align: "right" });
        y += 6;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(pink[0], pink[1], pink[2]);
        doc.text("CHANGE:", margin + 2, y);
        drawCurrency(displayChange.toLocaleString(), pageWidth - margin - 2, y, { align: "right" });
        y += 15;

        // Thank you footer
        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("Thank you for your visit!", pageWidth / 2, y, { align: "center" });
        y += 4;
        doc.setFontSize(7);
        doc.text("Please visit us again soon.", pageWidth / 2, y, { align: "center" });
        y += 6;
        
        // Website or Socials - REMOVED per user request
        // doc.setFont("helvetica", "bold");
        // doc.setTextColor(pink[0], pink[1], pink[2]);
        // doc.text("www.candyandrosesalon.com", pageWidth / 2, y, { align: "center" });

        return {
            url: doc.output('bloburl').toString(),
            doc: doc
        };
    };

    const formatPrice = (p: number | null | undefined) => p || 0;
    
    // Receipt Calculations
    const apptFee = selectedApt ? formatPrice(selectedApt.price) : 0;
    const tax = 0; 
    const totalWithTax = apptFee + tax;
    const isAmountReceivedValid = parseInt(paymentAmount) >= totalWithTax;
    const change = Math.max(0, (parseInt(paymentAmount) || 0) - totalWithTax);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-pink-50 via-white to-pink-100 overflow-y-auto overflow-x-hidden w-full max-w-full print:hidden">
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
                                                                <button onClick={() => handleViewReceipt(trx)} className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg border border-pink-200 shadow-sm hover:bg-pink-100 font-bold transition-all" title="View PDF">Receipt</button>
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
                                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6 max-w-[270px] mx-auto">
                                    Something went wrong while sending the receipt.<br />Please try again.
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

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\:relative, .print\:relative * { visibility: visible; }
                    .print\:relative {
                        position: absolute;
                        left: 50%;
                        top: 20%;
                        transform: translate(-50%, -20%);
                        width: 400px !important;
                    }
                    .print\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
