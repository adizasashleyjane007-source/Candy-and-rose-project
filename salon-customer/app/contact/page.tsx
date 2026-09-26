'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Mail, MapPin, Phone, Send, Sparkles } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { supabase, getSalonInfo, defaultSalonInfo, type SalonInfo } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function ContactPage() {
  const { user, profile } = useAuth();
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(defaultSalonInfo);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getSalonInfo().then(setSalonInfo);
    // Pre-fill if logged in
    if (profile?.full_name || profile?.name) {
      const names = (profile.full_name || profile.name || '').split(' ');
      setFirstName(names[0] || '');
      setLastName(names.slice(1).join(' ') || '');
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user, profile]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const fullName = `${firstName} ${lastName}`.trim() || 'Guest';

    try {
      await supabase.from('messages').insert({
        name: fullName,
        email: email,
        subject: subject || 'General Inquiry',
        message: message,
      });

      await supabase.from('notifications').insert({
        title: `New Message: ${subject || 'General Inquiry'} from ${fullName}`,
        message: message,
        type: 'customer',
        is_read: false,
      });

      setSent(true);
      setFirstName('');
      setLastName('');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Failed to send contact message:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SalonLayout>
      <main className="bg-[#FAF8F8] min-h-screen pb-32 overflow-x-hidden font-sans">
        
        {/* HERO SECTION */}
        <section className="relative px-6 pt-24 pb-16 lg:pt-36 lg:pb-20 text-center animate-fade-in-up">
          <div className="mx-auto max-w-4xl relative">
            <h1 className="font-brand text-5xl sm:text-6xl lg:text-7xl font-medium text-zinc-900 tracking-tight leading-[1.1]">
              Get in <span className="font-brand italic font-normal text-pink-500">Touch</span>
            </h1>
            
            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-10 sm:right-20 text-pink-300 animate-pulse hidden sm:block">
              <Sparkles size={24} strokeWidth={1.5} />
            </div>
            
            <svg className="mx-auto mt-8 w-24 text-pink-300" viewBox="0 0 100 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 10C25 2 75 2 99 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </section>

        {/* MAIN CONTACT SECTION */}
        <section className="px-4 sm:px-6 lg:px-10 max-w-[90rem] mx-auto animate-fade-in delay-200">
          <div className="bg-white/80 rounded-[2.5rem] border border-pink-100/60 shadow-[0_20px_60px_-15px_rgba(244,167,187,0.15)] p-6 sm:p-10 lg:p-14 overflow-hidden">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-10 xl:gap-16 items-start">
              
              {/* LEFT: Contact Information */}
              <div className="flex flex-col space-y-12 animate-fade-in-up delay-300">
                <div>
                  <h3 className="font-brand text-2xl mb-8 text-zinc-900">Studio Details</h3>
                  
                  <div className="space-y-8">
                    {/* Phone */}
                    <div className="group flex items-start gap-5 transition-transform duration-300 hover:translate-x-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-500 transition-transform duration-300 group-hover:scale-110 group-hover:bg-pink-100">
                        <Phone size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400 mb-1.5">Phone</p>
                        <p className="text-[15px] font-medium text-zinc-700">{salonInfo.phone}</p>
                      </div>
                    </div>
                    
                    {/* Email */}
                    <div className="group flex items-start gap-5 transition-transform duration-300 hover:translate-x-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-500 transition-transform duration-300 group-hover:scale-110 group-hover:bg-pink-100">
                        <Mail size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400 mb-1.5">Email</p>
                        <p className="text-[15px] font-medium text-zinc-700 break-all">{salonInfo.email}</p>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="group flex items-start gap-5 transition-transform duration-300 hover:translate-x-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-500 transition-transform duration-300 group-hover:scale-110 group-hover:bg-pink-100">
                        <MapPin size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400 mb-1.5">Location</p>
                        <p className="text-[15px] font-medium leading-relaxed text-zinc-700 pr-4">{salonInfo.address}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER: Image */}
              <div className="h-full min-h-[400px] lg:min-h-full rounded-2xl overflow-hidden relative shadow-lg animate-fade-in-up delay-200">
                <img 
                  src="/images/contactpage.jpg" 
                  alt="Candy & Rose Studio" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
                />
              </div>

              {/* RIGHT: Contact Form */}
              <div className="animate-fade-in-up delay-300">
                {sent ? (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center px-4 animate-fade-in">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500 shadow-sm">
                      <Check size={28} strokeWidth={1.5} />
                    </div>
                    <h2 className="font-brand text-3xl sm:text-4xl text-zinc-900 mb-4">Message Received</h2>
                    <p className="text-[15px] leading-relaxed text-zinc-600 mb-8 max-w-xs mx-auto">
                      Thank you for reaching out. We will get back to you shortly.
                    </p>
                    <button 
                      onClick={() => setSent(false)} 
                      className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink-500 hover:text-pink-600 transition-colors border-b border-pink-200 pb-1"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="flex flex-col h-full space-y-8 lg:space-y-10">
                    <h3 className="font-brand text-2xl text-zinc-900 mb-2">Send a Message</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {/* First Name */}
                      <div className="relative group">
                        <input 
                          required 
                          id="firstName"
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)} 
                          className="w-full bg-transparent border-b border-zinc-200 py-3 text-[15px] text-zinc-900 placeholder:text-transparent outline-none focus:border-pink-500 transition-colors peer"
                          placeholder="First Name *" 
                        />
                        <label htmlFor="firstName" className="absolute left-0 top-3 text-[15px] text-zinc-400 cursor-text transition-all peer-focus:-top-4 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-pink-500 peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:text-zinc-500">
                          First Name *
                        </label>
                      </div>

                      {/* Last Name */}
                      <div className="relative group">
                        <input 
                          required 
                          id="lastName"
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)} 
                          className="w-full bg-transparent border-b border-zinc-200 py-3 text-[15px] text-zinc-900 placeholder:text-transparent outline-none focus:border-pink-500 transition-colors peer"
                          placeholder="Last Name *" 
                        />
                        <label htmlFor="lastName" className="absolute left-0 top-3 text-[15px] text-zinc-400 cursor-text transition-all peer-focus:-top-4 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-pink-500 peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:text-zinc-500">
                          Last Name *
                        </label>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="relative group">
                      <input 
                        required 
                        type="email" 
                        id="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full bg-transparent border-b border-zinc-200 py-3 text-[15px] text-zinc-900 placeholder:text-transparent outline-none focus:border-pink-500 transition-colors peer"
                        placeholder="Email *" 
                      />
                      <label htmlFor="email" className="absolute left-0 top-3 text-[15px] text-zinc-400 cursor-text transition-all peer-focus:-top-4 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-pink-500 peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:text-zinc-500">
                        Email Address *
                      </label>
                    </div>

                    {/* Subject */}
                    <div className="relative group">
                      <input 
                        id="subject"
                        value={subject} 
                        onChange={(e) => setSubject(e.target.value)} 
                        className="w-full bg-transparent border-b border-zinc-200 py-3 text-[15px] text-zinc-900 placeholder:text-transparent outline-none focus:border-pink-500 transition-colors peer"
                        placeholder="Subject" 
                      />
                      <label htmlFor="subject" className="absolute left-0 top-3 text-[15px] text-zinc-400 cursor-text transition-all peer-focus:-top-4 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-pink-500 peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:text-zinc-500">
                        Subject
                      </label>
                    </div>

                    {/* Message */}
                    <div className="relative group flex-1">
                      <textarea 
                        required 
                        id="message"
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        rows={3} 
                        className="w-full resize-none bg-transparent border-b border-zinc-200 py-3 text-[15px] text-zinc-900 placeholder:text-transparent outline-none focus:border-pink-500 transition-colors peer"
                        placeholder="Message *" 
                      />
                      <label htmlFor="message" className="absolute left-0 top-3 text-[15px] text-zinc-400 cursor-text transition-all peer-focus:-top-4 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-pink-500 peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:text-zinc-500">
                        Message *
                      </label>
                    </div>

                    <button 
                      disabled={busy} 
                      className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full bg-zinc-950 px-8 py-4.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-xl shadow-zinc-950/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-zinc-950/30 active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-xl"
                    >
                      {busy ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
              
            </div>
          </div>
        </section>
        
      </main>
    </SalonLayout>
  );
}
