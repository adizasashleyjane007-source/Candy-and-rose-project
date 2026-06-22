"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, Calendar, Clock, User, Scissors, Check, 
  Send, Phone, Mail, Award, MessageSquare, 
  ShieldAlert, Sparkles, Loader2, Ban, DollarSign, Info
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Appointments, Customers, Services, NotificationsDB } from "@/lib/db";

interface NotificationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: any;
  onNotificationUpdated?: () => void;
}

export default function NotificationChatModal({ 
  isOpen, 
  onClose, 
  notification,
  onNotificationUpdated 
}: NotificationChatModalProps) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'details'>('chat');
  
  // Chat messaging states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeTab]);

  useEffect(() => {
    if (!isOpen || !notification) return;
    
    const fetchData = async () => {
      setLoading(true);
      setActiveTab('chat'); // Reset to chat tab when new notification opens
      try {
        const supabase = createClient();
        let fetchedApt = null;
        let fetchedCust = null;
        let fetchedSvc = null;
        
        let aptId = "";
        
        // 1. Try to get Appointment ID from message (format: "ID:<uuid>")
        if (notification.message?.startsWith("ID:")) {
          aptId = notification.message.replace("ID:", "").trim();
        } else if (notification.message && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notification.message.trim())) {
          aptId = notification.message.trim();
        }
        
        if (aptId) {
          try {
            fetchedApt = await Appointments.getById(aptId);
          } catch (e) {
            console.log("Could not fetch appointment by ID direct, attempting manual parse");
          }
        }
        
        // 2. Parse text contents if ID is not available or appointment fetch failed
        let parsedCustomerName = "";
        let parsedServiceName = "";
        
        if (!fetchedApt) {
          const msg = notification.message || "";
          const title = notification.title || "";
          
          if (title.startsWith("New Appointment from ")) {
            parsedCustomerName = title.replace("New Appointment from ", "").trim();
          } else if (title.startsWith("New Message: ")) {
            const fromIndex = title.indexOf(" from ");
            if (fromIndex !== -1) {
              parsedCustomerName = title.substring(fromIndex + 6).trim();
            }
          }
          
          if (msg.startsWith("Added ") && msg.includes(" for ")) {
            parsedServiceName = msg.substring(6, msg.indexOf(" for ")).trim();
            parsedCustomerName = msg.substring(msg.indexOf(" for ") + 5).trim();
          } else if (msg.startsWith("Created booking with ") && msg.includes(" for ")) {
            parsedServiceName = msg.substring(21, msg.indexOf(" for ")).trim();
            parsedCustomerName = msg.substring(msg.indexOf(" for ") + 5).trim();
          }
        }
        
        // Match customer from DB
        if (fetchedApt?.customer_id) {
          const { data } = await supabase.from("customers").select("*").eq("id", fetchedApt.customer_id).single();
          fetchedCust = data;
        } else if (parsedCustomerName) {
          const { data } = await supabase.from("customers")
            .select("*")
            .ilike("name", `%${parsedCustomerName}%`)
            .limit(1);
          if (data && data.length > 0) fetchedCust = data[0];
        }
        
        // Match service from DB
        if (fetchedApt?.service_id) {
          const { data } = await supabase.from("services").select("*").eq("id", fetchedApt.service_id).single();
          fetchedSvc = data;
        } else if (parsedServiceName) {
          const { data } = await supabase.from("services")
            .select("*")
            .ilike("name", `%${parsedServiceName}%`)
            .limit(1);
          if (data && data.length > 0) fetchedSvc = data[0];
        }
        
        // Match appointment if we only have customer/service names
        if (!fetchedApt && fetchedCust) {
          const { data } = await supabase.from("appointments")
            .select(`
              *,
              customers(name, email, phone),
              staff(name),
              services(name, price, duration)
            `)
            .eq("customer_id", fetchedCust.id)
            .order("appointment_date", { ascending: false })
            .limit(1);
          if (data && data.length > 0) fetchedApt = data[0];
        }
        
        // Enriched custom stats if customer is available
        if (fetchedCust) {
          const { data: apts } = await supabase.from("appointments").select("price, status").eq("customer_id", fetchedCust.id);
          const completed = (apts || []).filter((a: any) => a.status === "Completed");
          const totalSpent = completed.reduce((sum: number, a: any) => sum + (Number(a.price) || 0), 0);
          fetchedCust = {
            ...fetchedCust,
            visits: (apts || []).length,
            total_spent: totalSpent
          };
        }
        
        setAppointment(fetchedApt);
        setCustomer(fetchedCust || (fetchedApt ? { name: fetchedApt.customer_name } : { name: parsedCustomerName || "Walk-in Guest" }));
        setService(fetchedSvc || (fetchedApt ? { name: fetchedApt.service_name, price: fetchedApt.price } : null));
        
        // 3. Build chat history
        const initialMessages = [];
        
        initialMessages.push({
          id: "system-1",
          sender: "system",
          text: `Notification Chat: ${notification.title}`,
          time: new Date(notification.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        let clientMsg = notification.message || "I'd like to check about my salon visit.";
        if (clientMsg.startsWith("ID:")) {
          clientMsg = `Hello! I would like to book a session for ${fetchedApt?.service_name || "salon service"}. (Ref: ${fetchedApt?.id?.slice(0,8)})`;
        }
        
        initialMessages.push({
          id: "client-1",
          sender: "client",
          senderName: fetchedCust?.name || fetchedApt?.customer_name || parsedCustomerName || "Client",
          text: clientMsg,
          time: new Date(notification.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        
        if (fetchedApt?.notes) {
          initialMessages.push({
            id: "client-notes",
            sender: "client",
            senderName: fetchedCust?.name || fetchedApt?.customer_name || "Client",
            text: `Note/Instructions: "${fetchedApt.notes}"`,
            time: new Date(fetchedApt.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
        
        setChatMessages(initialMessages);
        
        if (!notification.is_read) {
          await NotificationsDB.markRead(notification.id);
          if (onNotificationUpdated) onNotificationUpdated();
        }
        
      } catch (err) {
        console.error("Error setting up notification chat modal:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, notification]);

  if (!isOpen || !notification) return null;

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;
    
    setIsSending(true);
    const textToSend = replyText;
    setReplyText("");
    
    try {
      const adminMsgId = `admin-${Date.now()}`;
      setChatMessages(prev => [...prev, {
        id: adminMsgId,
        sender: "admin",
        senderName: "Admin",
        text: textToSend,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      if (customer?.email) {
        try {
          await fetch('/api/appointment-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customer.email,
              customerName: customer.name,
              date: appointment?.appointment_date || new Date().toISOString().split('T')[0],
              time: appointment?.appointment_time || "12:00",
              service: service?.name || appointment?.service_name || "Salon Service",
              price: service?.price || appointment?.price || 0,
              staff: appointment?.staff_name || "Professional",
              checkoutUrl: "",
              customMessage: textToSend
            })
          });
        } catch (e) {
          console.warn("Could not trigger email response API:", e);
        }
      }
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `client-reply-${Date.now()}`,
          sender: "client",
          senderName: customer?.name || "Client",
          text: "Thank you for the message. I will check this!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 1500);

    } catch (error) {
      console.error("Failed to send reply", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setReplyText(text);
  };

  const handleUpdateStatus = async (newStatus: 'Scheduled' | 'Cancelled' | 'Completed') => {
    if (!appointment?.id) return;
    
    setIsProcessingAction(true);
    try {
      await Appointments.update(appointment.id, { status: newStatus });
      setAppointment((prev: any) => ({ ...prev, status: newStatus }));
      
      setChatMessages(prev => [...prev, {
        id: `system-status-${Date.now()}`,
        sender: "system",
        text: `Booking status changed to ${newStatus}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      window.dispatchEvent(new Event("appointmentsUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
      if (onNotificationUpdated) onNotificationUpdated();
      
    } catch (err) {
      console.error("Failed to update status in chat view:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[370px] sm:w-[410px] h-[520px] max-h-[85vh] bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-pink-100/70 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
      
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-pink-50/10">
          <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-3" />
          <p className="text-gray-400 font-bold text-xs tracking-wider uppercase">Loading...</p>
        </div>
      ) : (
        <>
          {/* header Section */}
          <div className="bg-gradient-to-r from-pink-50/50 via-white to-pink-50/20 px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-xs border border-pink-600 shadow-sm shrink-0">
                  {customer?.name ? customer.name.slice(0, 2).toUpperCase() : "CL"}
                </div>
                <div className="min-w-0 flex items-center h-full">
                  <h3 className="font-bold text-sm text-gray-900 leading-tight truncate max-w-[180px] sm:max-w-[210px]">{customer?.name || "Client"}</h3>
                </div>
              </div>
              
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-pink-100/50 rounded-full text-gray-400 hover:text-gray-900 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs mt-2">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat' 
                    ? "bg-white text-pink-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
              <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-1.5 rounded-md font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'details' 
                    ? "bg-white text-pink-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                Details
                {appointment && (
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping"></span>
                )}
              </button>
            </div>
          </div>

          {/* Body Section */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50/20">
            {activeTab === 'chat' ? (
              /* TAB 1: Chat UI */
              <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Scrollable messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
                  {chatMessages.map((msg) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={msg.id} className="flex justify-center my-1.5">
                          <span className="px-2.5 py-0.5 bg-pink-50 text-pink-600 text-[9px] font-bold tracking-wider uppercase rounded-full border border-pink-100/50">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }
                    
                    const isAdmin = msg.sender === "admin";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"} items-end gap-2`}>
                        {!isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center border border-pink-200 shrink-0 text-[10px] font-black text-pink-600 uppercase">
                            {msg.senderName?.slice(0, 2) || "CL"}
                          </div>
                        )}
                        <div className="flex flex-col max-w-[75%]">
                          <span className={`text-[8px] font-bold text-gray-400 px-1 mb-0.5 ${isAdmin ? "text-right" : "text-left"}`}>
                            {msg.senderName || "Customer"}
                          </span>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isAdmin 
                              ? "bg-pink-500 text-white rounded-br-none" 
                              : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                          }`}>
                            {msg.text}
                          </div>
                          <span className={`text-[8px] font-medium text-gray-400 mt-0.5 px-1 ${isAdmin ? "text-right" : "text-left"}`}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies & Message Input Form */}
                <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                  {/* Quick responses */}
                  <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar">
                    <button 
                      onClick={() => handleQuickReply("Your booking is successfully confirmed! See you at the salon!")}
                      className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors border border-pink-100"
                    >
                      Confirm Booking
                    </button>
                    <button 
                      onClick={() => handleQuickReply("Thank you for choosing Candy Salon! Feel free to ask if you have any requests.")}
                      className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors border border-pink-100"
                    >
                      Welcome Message
                    </button>
                    <button 
                      onClick={() => handleQuickReply("We apologize, but this slot is fully booked. Would another timing work for you?")}
                      className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 text-[10px] font-bold rounded-full whitespace-nowrap transition-colors border border-pink-100"
                    >
                      Fully Booked
                    </button>
                  </div>

                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a chat reply..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-xs font-semibold"
                    />
                    <button 
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="px-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* TAB 2: Details view */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Customer Info Card */}
                <div className="bg-white p-4 rounded-xl border border-pink-100/30 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client Profile</span>
                  </div>
                  
                  <div className="text-xs space-y-1.5 pt-1 border-t border-gray-50">
                    <p className="font-bold text-gray-900">{customer?.name || "Guest"}</p>
                    {customer?.email && (
                      <div className="flex items-center gap-1.5 text-gray-600 truncate">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer?.phone && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Award className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>Tier: <span className="font-bold text-pink-600">{customer?.membership_type || "Standard"}</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-center">
                    <div className="bg-pink-50/20 py-1.5 rounded-lg">
                      <span className="text-[8px] text-gray-400 font-bold uppercase block">Visits</span>
                      <span className="text-xs font-black text-gray-800">{customer?.visits ?? 0}</span>
                    </div>
                    <div className="bg-pink-50/20 py-1.5 rounded-lg">
                      <span className="text-[8px] text-gray-400 font-bold uppercase block">Total Spent</span>
                      <span className="text-xs font-black text-gray-800">₱{(customer?.total_spent ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Service booked Card */}
                <div className="bg-white p-4 rounded-xl border border-pink-100/30 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booked Service</span>
                  </div>
                  
                  <div className="text-xs space-y-1.5 pt-1 border-t border-gray-50">
                    <p className="font-bold text-gray-900">{service?.name || appointment?.service_name || "Custom Salon Treatment"}</p>
                    <div className="flex justify-between text-gray-600 text-[11px]">
                      <span>Category: <span className="font-bold text-gray-800">{service?.category || "Services"}</span></span>
                      <span>Duration: <span className="font-bold text-gray-800">{service?.duration || appointment?.duration || "N/A"}</span></span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-gray-500">Service Price:</span>
                      <span className="font-bold text-pink-600 text-sm">₱{Number(service?.price || appointment?.price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Appointment Schedule & Actions Card */}
                {appointment ? (
                  <div className="bg-white p-4 rounded-xl border border-pink-100/30 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-pink-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booking Schedule</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                        appointment.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        appointment.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-pink-50 text-pink-600 border-pink-100'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-50">
                      <div>
                        <span className="text-[8px] text-gray-400 font-bold block uppercase">Date</span>
                        <span className="font-bold text-gray-800">{appointment.appointment_date || appointment.date}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400 font-bold block uppercase">Time Slot</span>
                        <span className="font-bold text-gray-800">
                          {appointment.appointment_time?.substring(0, 5) || appointment.time}
                        </span>
                      </div>
                    </div>

                    {appointment.staff_name && (
                      <div className="text-xs">
                        <span className="text-[8px] text-gray-400 font-bold block uppercase">Assigned Staff</span>
                        <span className="font-bold text-gray-800">{appointment.staff_name}</span>
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] leading-relaxed text-gray-500 italic">
                        "{appointment.notes}"
                      </div>
                    )}

                    {/* Quick Status Action Controls */}
                    {appointment.status === 'Pending' && (
                      <div className="pt-2 flex gap-2">
                        <button
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateStatus('Scheduled')}
                          className="flex-1 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                        </button>
                        <button
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateStatus('Cancelled')}
                          className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3 h-3" />} Reject
                        </button>
                      </div>
                    )}

                    {appointment.status === 'Scheduled' && (
                      <div className="pt-2">
                        <button
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateStatus('Completed')}
                          className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3 h-3" />} Mark as Completed
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-xs text-amber-800">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">No linked booking record</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">This notification is not linked to a specific appointment ID in the database.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
