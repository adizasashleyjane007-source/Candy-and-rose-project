import Link from 'next/link';
import { CheckCircle2, CalendarHeart } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize a Server-only client to bypass RLS since the customer's phone isn't logged in
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function SuccessPage(props: any) {
  let appointmentId = null;
  if (props.searchParams) {
      // In newer Next.js versions, searchParams acts like a Promise
      const params = await props.searchParams;
      appointmentId = params?.ref;
  }

  // Fallback: If webhook fails, or user is doing dev testing without Ngrok, we finalize here!
  if (appointmentId) {
      const { data: apt } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      // Only perform the update if it hasn't somehow already been marked completed by the webhook
      if (apt && apt.status !== 'Completed') {
        const { error: aptError } = await supabase
          .from('appointments')
          .update({ status: 'Completed', source: 'PayMongo' })
          .eq('id', appointmentId); 
          
        if (!aptError) {
          const { error: billingError } = await supabase
            .from('billing')
            .insert({
              appointment_id: appointmentId,
              customer_id: apt.customer_id,
              amount: apt.price || 0,
              payment_method: 'GCash',
              status: 'Completed',
              notes: `Online Payment for ${apt.service_name || 'service'}`
            });

            if (billingError) console.error("Success Page Billing Insert Error:", JSON.stringify(billingError, null, 2));
        }
      }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden">
      {/* Decorative pink ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 bg-[#0a0a0a] border border-pink-500/20 p-10 rounded-3xl shadow-2xl shadow-pink-500/5 backdrop-blur-xl max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="relative">
             <div className="absolute inset-0 bg-pink-500 rounded-full animate-ping opacity-20"></div>
             <div className="bg-pink-500/10 p-5 rounded-full relative z-10 border border-pink-500/30">
               <CheckCircle2 className="w-16 h-16 text-pink-400" />
             </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-3 tracking-tight text-white">Payment Received!</h1>
        <p className="text-zinc-400 mb-8 text-lg">
          See you at <span className="text-pink-400 font-semibold tracking-wide">Candy & Rose</span> soon.
        </p>
        
        <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5 flex items-center justify-center gap-3">
            <CalendarHeart className="w-6 h-6 text-pink-400 shrink-0" />
            <span className="text-sm text-zinc-300 leading-relaxed text-left">
              Your appointment has been successfully marked as <span className="text-white font-medium">Paid</span>.
            </span>
        </div>

        <Link 
          href="/appointment" 
          className="flex items-center justify-center w-full py-4 px-6 rounded-full bg-white text-black font-semibold hover:bg-pink-50 hover:text-pink-600 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(255,192,203,0.15)] group"
        >
          Back to Appointments
        </Link>
      </div>
    </div>
  );
}
