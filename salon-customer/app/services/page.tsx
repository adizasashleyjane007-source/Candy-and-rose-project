'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, Plus } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading, ServiceCard, BookingPrompt } from '@/components/salon-ui';
import { supabase, type Service } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const categories = ['All', 'Hair', 'Nails', 'Facials', 'Spa', 'Makeup'];

const fallback: Service[] = [
  { id: '1', name: 'Classic Haircut & Style', description: 'Precision cut tailored to your face shape, finished with a blow-dry style.', category: 'Hair', duration_min: 60, price: 45, image_url: 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', created_at: '' },
  { id: '2', name: 'Hair Coloring & Highlights', description: 'Full-color or balayage highlights using premium ammonia-free dyes.', category: 'Hair', duration_min: 120, price: 120, image_url: 'https://images.pexels.com/photos/3993453/pexels-photo-3993453.jpeg', created_at: '' },
  { id: '3', name: 'Manicure & Gel Polish', description: 'Shape, buff, and long-lasting gel polish for flawless nails.', category: 'Nails', duration_min: 45, price: 35, image_url: 'https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg', created_at: '' },
  { id: '4', name: 'Luxury Pedicure Spa', description: 'Soak, exfoliate, and massage with a paraffin finish.', category: 'Nails', duration_min: 60, price: 55, image_url: 'https://images.pexels.com/photos/3997389/pexels-photo-3997389.jpeg', created_at: '' },
  { id: '5', name: 'Signature Facial', description: 'Deep-cleanse, exfoliate, and hydrate for a radiant glow.', category: 'Facials', duration_min: 60, price: 65, image_url: 'https://images.pexels.com/photos/3997981/pexels-photo-3997981.jpeg', created_at: '' },
  { id: '6', name: 'Aromatherapy Body Massage', description: 'Full-body relaxation massage with essential oils.', category: 'Spa', duration_min: 60, price: 80, image_url: 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg', created_at: '' },
];

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>(fallback);
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Service[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    supabase.from('services').select('*').order('category').then(({ data }) => {
      if (data?.length) setServices(data as Service[]);
    });
  }, []);

  const shown = useMemo(
    () => category === 'All' ? services : services.filter((s) => s.category === category),
    [category, services]
  );

  const toggle = (service: Service) =>
    setSelected((cur) =>
      cur.some((s) => s.id === service.id)
        ? cur.filter((s) => s.id !== service.id)
        : [...cur, service]
    );

  const total = selected.reduce((sum, s) => sum + Number(s.price), 0);
  const duration = selected.reduce((sum, s) => sum + s.duration_min, 0);

  const confirmBooking = async () => {
    if (!user || selected.length === 0) return;
    const apptDate = new Date();
    apptDate.setDate(apptDate.getDate() + 3);
    apptDate.setHours(10, 0, 0, 0);

    const { data: appt } = await supabase.from('appointments').insert({
      user_id: user.id,
      appointment_date: apptDate.toISOString(),
      status: 'confirmed',
      total_price: total,
    }).select().single();

    if (appt) {
      await supabase.from('appointment_services').insert(
        selected.map((s) => ({
          appointment_id: appt.id,
          service_id: s.id,
          price_at_booking: s.price,
        }))
      );
      setSelected([]);
      setPromptOpen(false);
      window.dispatchEvent(new CustomEvent('close-auth'));
      alert('Appointment confirmed! Check your profile for details.');
    }
  };

  return (
    <SalonLayout>
      <main>
        <section className="bg-pink-50 px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="The menu" title="Find your next favorite ritual."
              description="Every service is thoughtfully designed, beautifully executed, and always centered around you." />
            <div className="mt-12 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((item) => (
                <button key={item} onClick={() => setCategory(item)}
                  className={`whitespace-nowrap rounded-full px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${category === item ? 'bg-foreground text-white' : 'bg-white text-neutral-500 hover:text-primary'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <p className="text-sm text-neutral-500">{shown.length} treatments available</p>
              {user && (
                <button onClick={() => setShowAdd(!showAdd)}
                  className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors hover:border-primary hover:text-primary">
                  <Plus size={15} /> Add a service
                </button>
              )}
            </div>

            {user && showAdd && <AddServiceForm onAdded={() => setShowAdd(false)} />}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((service) => (
                <ServiceCard key={service.id} service={service}
                  selected={selected.some((s) => s.id === service.id)}
                  onSelect={toggle} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {selected.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center justify-between rounded-2xl bg-foreground p-4 text-white shadow-2xl shadow-black/30 sm:px-6">
          <div>
            <p className="text-sm font-semibold">Your ritual · {selected.length} service{selected.length > 1 ? 's' : ''}</p>
            <p className="mt-1 flex items-center gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1"><Clock3 size={13} /> {duration} min</span>
              <span>${total.toFixed(0)}</span>
            </p>
          </div>
          <button onClick={() => user ? setPromptOpen(true) : window.dispatchEvent(new CustomEvent('open-auth'))}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-white">
            {user ? 'Confirm booking' : 'Sign in to book'} <ArrowRight size={15} />
          </button>
        </div>
      )}

      {promptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl animate-scale-in">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-primary">
              <CalendarDays size={28} />
            </div>
            <h2 className="font-serif text-2xl">Confirm your booking?</h2>
            <p className="mt-3 text-sm text-neutral-500">
              {selected.length} service{selected.length > 1 ? 's' : ''} · ${total.toFixed(0)} · {duration} min
            </p>
            <div className="mt-7 flex gap-3">
              <button onClick={() => setPromptOpen(false)}
                className="flex-1 rounded-full border border-neutral-200 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50">
                Cancel
              </button>
              <button onClick={confirmBooking}
                className="flex-1 rounded-full bg-primary py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-600">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </SalonLayout>
  );
}

function AddServiceForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hair');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data } = await supabase.from('services').insert({
      name,
      category,
      price: parseFloat(price) || 0,
      duration_min: parseInt(duration) || 60,
      description,
    }).select().single();
    setBusy(false);
    if (data) {
      setName(''); setPrice(''); setDuration(''); setDescription('');
      onAdded();
      window.location.reload();
    }
  };

  return (
    <div className="mb-10 rounded-2xl border border-pink-200 bg-pink-50 p-6">
      <h3 className="mb-4 font-serif text-xl">Add a custom service</h3>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary">
          {categories.slice(1).map((c) => <option key={c}>{c}</option>)}
        </select>
        <input required type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" />
        <input required type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (min)"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" />
        <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2}
          className="resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary sm:col-span-2" />
        <button disabled={busy}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60 sm:col-span-2">
          <Plus size={15} /> {busy ? 'Adding...' : 'Add service'}
        </button>
      </form>
    </div>
  );
}
