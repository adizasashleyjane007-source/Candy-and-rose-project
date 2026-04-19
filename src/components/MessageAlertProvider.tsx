"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Calendar, MapPin, Clock, User, Check, X as CloseIcon, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { Appointments, NotificationsDB } from "@/lib/db";

export default function MessageAlertProvider() {
  const [notification, setNotification] = useState<any>(null);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    console.log("DEBUG: MessageAlertProvider subscribing to notifications...");
    
    // Subscribe to INSERT on notifications table
    const channel = supabase
      .channel('salon-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          const newNotif = payload.new;
          console.log("DEBUG: MessageAlertProvider received payload:", payload);
          
          if (newNotif.type === 'customer') {
            setNotification(newNotif);
            
            // Dispatch event for components that need to refresh
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("notificationsUpdated"));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`DEBUG: MessageAlertProvider subscription status: ${status}`);
      });

    return () => {
      console.log("DEBUG: Cleaning up MessageAlertProvider subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = async (action: 'accept' | 'decline' | 'view') => {
    if (!notification) return;
    setIsProcessing(true);

    try {
      if (notification.type === 'appointment' && appointmentDetails) {
        if (action === 'accept') {
          await Appointments.update(appointmentDetails.id, { status: 'Scheduled' });
          // Dispatch event to refresh the appointment page if we are on it
          window.dispatchEvent(new Event("appointmentsUpdated"));
        } else if (action === 'decline') {
          await Appointments.update(appointmentDetails.id, { status: 'Cancelled' });
        }
        
        // Mark notification as read
        await NotificationsDB.markRead(notification.id);
        window.dispatchEvent(new Event("notificationsUpdated"));
      }

      if (action === 'view') {
        if (notification.type === 'customer') {
          router.push('/notifications');
        } else {
          router.push('/appointment');
        }
      }

      // Close modal
      setNotification(null);
      setAppointmentDetails(null);
    } catch (err) {
      console.error("Action failed:", err);
      alert("Failed to process action. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!notification) return null;

  const isAppointment = notification.type === 'appointment';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-[0_20px_70px_rgba(0,0,0,0.3)] border border-pink-100/50 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header Gradient */}
            <div className={`h-2 w-full bg-gradient-to-r ${isAppointment ? 'from-pink-500 via-rose-400 to-pink-600' : 'from-pink-400 to-pink-600'}`} />
            
            <div className="p-8">
                {/* Header Section */}
                <div className="flex items-center gap-5 mb-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isAppointment ? 'bg-rose-50' : 'bg-pink-50'}`}>
                        {isAppointment ? (
                          <Calendar className="w-7 h-7 text-rose-500 animate-bounce" />
                        ) : (
                          <Mail className="w-7 h-7 text-pink-500 animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                          {isAppointment ? 'Booking Request' : 'New Client Message'}
                        </h3>
                        <p className="text-sm font-bold text-pink-500 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></span>
                           {isAppointment ? 'Approval Required' : 'Direct Inquiry'}
                        </p>
                    </div>
                </div>

                {isAppointment && appointmentDetails ? (
                  /* Appointment Approval UI */
                  <div className="space-y-4 mb-8">
                      <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 space-y-4">
                          <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                                  <User className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Customer</span>
                                  <span className="text-lg font-bold text-gray-800">{appointmentDetails.customer_name}</span>
                                  {appointmentDetails.customers?.phone && (
                                    <span className="text-xs font-medium text-gray-500 block flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3" /> {appointmentDetails.customers.phone}
                                    </span>
                                  )}
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Service</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                                  <span className="text-sm font-bold text-gray-800">{appointmentDetails.service_name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Time</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-pink-400" />
                                  <span className="text-sm font-bold text-gray-800">{appointmentDetails.appointment_time?.substring(0, 5)}</span>
                                </div>
                            </div>
                          </div>

                          <div className="pt-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Appointment Date</span>
                              <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                                  <Calendar className="w-4 h-4 text-pink-500" />
                                  <span className="text-sm font-black text-gray-900">
                                    {new Date(appointmentDetails.appointment_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {appointmentDetails.notes && (
                        <div className="px-6 py-4 bg-pink-50/30 border border-pink-100/50 rounded-2xl">
                           <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block mb-1">Notes from Client</span>
                           <p className="text-xs italic text-gray-600 leading-relaxed font-medium">"{appointmentDetails.notes}"</p>
                        </div>
                      )}
                  </div>
                ) : (
                  /* Standard Message UI */
                  <div className="bg-pink-50/50 border border-pink-100/50 rounded-3xl p-6 space-y-4 mb-8">
                      <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Inquiry Subject</span>
                          <span className="text-lg font-bold text-gray-800 leading-tight block">
                            {notification.title?.replace('New Message: ', '').split(' from ')[0] || notification.title || 'N/A'}
                          </span>
                      </div>
                      <div className="pt-4 border-t border-pink-100/50 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-pink-100 shadow-sm">
                            <User className="w-4 h-4 text-pink-500" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">From Client</span>
                            <span className="text-sm font-black text-gray-900">{notification.title?.split(' from ')[1] || 'Unknown'}</span>
                          </div>
                      </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-4">
                    {isAppointment ? (
                      <>
                        <button 
                          disabled={isProcessing}
                          onClick={() => handleAction('decline')} 
                          className="flex-1 px-4 py-4 rounded-2xl border-2 border-gray-100 text-gray-400 font-bold hover:bg-gray-50 hover:text-gray-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                          <CloseIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Decline
                        </button>
                        <button 
                          disabled={isProcessing}
                          onClick={() => handleAction('accept')} 
                          className="flex-[2] px-4 py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black shadow-lg shadow-pink-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Check className="w-5 h-5" />
                              Accept Booking
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => setNotification(null)} 
                          className="flex-1 px-4 py-4 rounded-2xl border-2 border-gray-100 text-gray-400 font-bold hover:bg-gray-50 transition-all"
                        >
                          Later
                        </button>
                        <button 
                          onClick={() => handleAction('view')} 
                          className="flex-[2] px-4 py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black shadow-lg shadow-pink-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                          View Message
                        </button>
                      </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}

