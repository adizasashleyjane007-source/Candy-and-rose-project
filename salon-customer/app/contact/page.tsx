'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Phone, Mail, MapPin, Clock, Facebook, Instagram } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase, getSalonInfo, defaultSalonInfo, type SalonInfo } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function ContactPage() {
  const { user, profile } = useAuth();
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(defaultSalonInfo);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getSalonInfo().then(setSalonInfo);
    if (profile?.full_name || profile?.name) {
      setFullName(profile.full_name || profile.name || '');
    }
    if (user?.email) {
      setEmail(user.email);
    }
    if (profile?.phone) {
      setPhone(profile.phone);
    }
  }, [user, profile]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const nameToSubmit = fullName.trim() || 'Guest';
    const subjectLine = service.trim() ? `Inquiry for ${service.trim()}` : 'General Inquiry';
    const combinedMessage = [
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      service.trim() ? `Interested Service: ${service.trim()}` : null,
      message.trim()
    ].filter(Boolean).join('\n\n');

    try {
      await supabase.from('messages').insert({
        name: nameToSubmit,
        email: email,
        subject: subjectLine,
        message: combinedMessage,
      });

      await supabase.from('notifications').insert({
        title: `New Message: ${subjectLine} from ${nameToSubmit}`,
        message: combinedMessage,
        type: 'customer',
        is_read: false,
      });

      setSent(true);
      setFullName('');
      setEmail('');
      setService('');
      setPhone('');
      setMessage('');
    } catch (err) {
      console.error('Failed to send contact message:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SalonLayout>
      <main className="bg-[#FAF8F8] min-h-screen pt-6 sm:pt-8 lg:pt-12 pb-14 lg:pb-18 px-4 sm:px-6 lg:px-8 overflow-x-hidden font-sans text-zinc-900">
        
        {/* SECTION 1: CONTACT INFO + FORM */}
        <section className="max-w-6xl mx-auto mb-14 lg:mb-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            
            {/* LEFT: CONTACT INFORMATION PANEL (~40%) */}
            <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-sm p-6 sm:p-8 lg:p-9 flex flex-col justify-between shadow-sm">
              <div>
                <h2 className="font-sans text-2xl sm:text-[30px] text-zinc-950 font-medium mb-3 tracking-normal">
                  Contact Information
                </h2>
                <p className="text-zinc-600 text-sm leading-relaxed mb-6 lg:mb-8 font-normal">
                  Feel free to reach out to us for appointments, inquiries, or any questions about our salon services. We're here to make your beauty experience as comfortable and welcoming as possible.
                </p>

                <div className="space-y-5 lg:space-y-6">
                  {/* Location */}
                  <div className="flex items-start gap-4 group">
                    <div className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                      <MapPin className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-medium uppercase tracking-wider text-zinc-400 mb-0.5">Location</h3>
                      <p className="text-[15px] font-normal text-zinc-900 leading-snug">{salonInfo.address || 'Blk and Lot, Dasmarinas Cavite'}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4 group">
                    <div className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                      <Mail className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-medium uppercase tracking-wider text-zinc-400 mb-0.5">Email</h3>
                      <p className="text-[15px] font-normal text-zinc-900 break-all">{salonInfo.email || 'candyandroses@gmail.com'}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4 group">
                    <div className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                      <Phone className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-medium uppercase tracking-wider text-zinc-400 mb-0.5">Phone</h3>
                      <p className="text-[15px] font-normal text-zinc-900">{salonInfo.phone || '09123456789'}</p>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="flex items-start gap-4 group">
                    <div className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                      <Clock className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-medium uppercase tracking-wider text-zinc-400 mb-0.5">Operating Hours</h3>
                      <div className="text-[15px] font-normal text-zinc-900 space-y-0.5">
                        <p>Mon – Fri: 08:00 AM to 09:00 PM</p>
                        <p>Sat: 09:00 AM to 06:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SOCIAL MEDIA ICONS */}
              <div className="pt-6 mt-6 lg:pt-8 lg:mt-8 border-t border-zinc-100 flex items-center gap-3">
                <a 
                  href="https://www.facebook.com/profile.php?id=61576903201744" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-800 hover:bg-pink-500 hover:border-pink-500 hover:text-white transition-all duration-300"
                >
                  <Facebook className="w-4 h-4" strokeWidth={1.75} />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-800 hover:bg-pink-500 hover:border-pink-500 hover:text-white transition-all duration-300"
                >
                  <Instagram className="w-4 h-4" strokeWidth={1.75} />
                </a>
              </div>
            </div>

            {/* RIGHT: HAVE A QUESTION? FORM (~60% OPEN & MINIMAL MATCHING REFERENCE) */}
            <div className="lg:col-span-7 flex flex-col justify-between h-full pt-1">
              <div>
                <h2 className="font-sans text-2xl sm:text-[30px] text-zinc-950 font-medium mb-2 tracking-normal">
                  Have a Question?
                </h2>
                
                <div className="h-px w-full bg-zinc-200/80 my-3.5" />

                {/* Business Hours Banner */}
                <p className="text-xs sm:text-sm text-zinc-700 mb-5 lg:mb-6 font-normal">
                  <span className="font-medium text-pink-500">Business Hours:</span>{' '}
                  <span className="text-zinc-800"><span className="font-medium text-zinc-900">Mon – Fri:</span> 08.00 AM To 09.00 PM &nbsp;<span className="font-medium text-zinc-900">Sat:</span> 09.00 AM To 06.00 PM</span>
                </p>
              </div>

              {sent ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 text-white">
                    <Check size={20} strokeWidth={2} />
                  </div>
                  <h3 className="font-sans text-2xl text-zinc-950 font-medium mb-2">Message Received</h3>
                  <p className="text-sm text-zinc-600 mb-6 max-w-sm font-normal">
                    Thank you for contacting Candy & Rose. We have received your inquiry and will get back to you shortly.
                  </p>
                  <button 
                    onClick={() => setSent(false)} 
                    className="text-xs font-medium uppercase tracking-widest text-zinc-950 hover:text-pink-500 transition-colors border-b border-zinc-950 hover:border-pink-500 pb-0.5"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-5 lg:space-y-6">
                  {/* Row 1: Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <input 
                        type="text"
                        required 
                        placeholder="Your Name"
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        className="w-full bg-white border border-zinc-200/90 rounded-none px-4 py-3 text-sm font-normal text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-pink-400 transition-colors shadow-none"
                      />
                    </div>
                    <div>
                      <input 
                        type="email"
                        required 
                        placeholder="Email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full bg-white border border-zinc-200/90 rounded-none px-4 py-3 text-sm font-normal text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-pink-400 transition-colors shadow-none"
                      />
                    </div>
                  </div>

                  {/* Row 2: Service & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <input 
                        type="text"
                        placeholder="What Service You Want?"
                        value={service} 
                        onChange={(e) => setService(e.target.value)} 
                        className="w-full bg-white border border-zinc-200/90 rounded-none px-4 py-3 text-sm font-normal text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-pink-400 transition-colors shadow-none"
                      />
                    </div>
                    <div>
                      <input 
                        type="tel"
                        placeholder="Phone"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full bg-white border border-zinc-200/90 rounded-none px-4 py-3 text-sm font-normal text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-pink-400 transition-colors shadow-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Message */}
                  <div className="flex-1 flex flex-col min-h-[120px]">
                    <textarea 
                      required 
                      rows={4}
                      placeholder="Message"
                      value={message} 
                      onChange={(e) => setMessage(e.target.value)} 
                      className="w-full flex-1 bg-white border border-zinc-200/90 rounded-none px-4 py-3 text-sm font-normal text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-pink-400 transition-colors resize-none shadow-none"
                    />
                  </div>

                  {/* Row 4: Submit Button */}
                  <div className="pt-1">
                    <button 
                      type="submit"
                      disabled={busy} 
                      className="inline-flex items-center justify-center rounded-none bg-zinc-950 px-9 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-pink-500 disabled:opacity-60"
                    >
                      {busy ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* SECTION 2: VISIT OUR SALON */}
        <section className="max-w-6xl mx-auto">
          {/* Centered Heading with subtle pink accent line */}
          <div className="text-center mb-6 lg:mb-8">
            <h2 className="font-sans text-2xl sm:text-3xl text-zinc-950 font-medium tracking-normal">
              Visit Our Salon
            </h2>
            <div className="w-10 h-0.5 bg-pink-400 mx-auto mt-2.5 rounded-full" />
          </div>

          {/* Side-by-side Images on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="w-full h-[280px] sm:h-[340px] lg:h-[380px] border border-zinc-200/80 rounded-sm overflow-hidden shadow-sm">
              <img 
                src="/images/contactpage-pic.jpg" 
                alt="Candy & Rose Salon Interior 1" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full h-[280px] sm:h-[340px] lg:h-[380px] border border-zinc-200/80 rounded-sm overflow-hidden shadow-sm">
              <img 
                src="/images/contact2.jpg" 
                alt="Candy & Rose Salon Interior 2" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

      </main>
    </SalonLayout>
  );
}
