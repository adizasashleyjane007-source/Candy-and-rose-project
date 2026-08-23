'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, Plus, Sparkles } from 'lucide-react';
import SalonLayout from '@/components/salon-layout';
import { SectionHeading, ServiceCard } from '@/components/salon-ui';
import { BookingModal } from '@/components/booking-modal';
import { supabase, type Service, type Staff, parseDurationToMinutes } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const DEFAULT_CATEGORIES = ['Hair', 'Nails', 'Facials', 'Spa', 'Massage', 'Makeup'];

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Service[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    supabase.from('services').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) {
        setServices(data as Service[]);
      }
    });
    supabase.from('staff').select('*').then(({ data }) => {
      if (data) {
        setStaffList(data as Staff[]);
      }
    });
  }, []);

  const categories = useMemo(() => {
    const rawCategories = services.map((s) => s.category?.trim()).filter(Boolean) as string[];
    const normalized = Array.from(new Set(rawCategories.map((c) => {
      const trimmed = c.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })));
    const list = normalized.length > 0 ? normalized : DEFAULT_CATEGORIES;
    return ['All', ...list];
  }, [services]);

  const shown = useMemo(
    () => category === 'All' ? services : services.filter((s) => {
      if (!s.category) return false;
      const normalizedSvcCat = s.category.trim().charAt(0).toUpperCase() + s.category.trim().slice(1).toLowerCase();
      return normalizedSvcCat === category;
    }),
    [category, services]
  );

  const toggle = (service: Service) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth'));
      return;
    }
    setSelected((cur) => {
      const exists = cur.some((s) => s.id === service.id);
      if (exists) return cur.filter((s) => s.id !== service.id);
      if (cur.length >= 2) {
        alert("You can only select up to 2 services.");
        return cur;
      }
      return [...cur, service];
    });
  };

  const total = selected.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const duration = selected.reduce((sum, s) => sum + (s.duration_min || parseDurationToMinutes(s.duration)), 0);

  return (
    <SalonLayout>
      <main className="bg-white">
        <section className="bg-gradient-to-b from-pink-50/70 to-white px-6 py-20 lg:px-10 border-b border-zinc-100">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="OUR SERVICE MENU"
              title="Find Your Next Favorite Ritual"
              description="Every service is thoughtfully designed, beautifully executed, and centered around your natural radiance."
            />
            <div className="mt-10 flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`whitespace-nowrap rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                    category === item
                      ? 'bg-zinc-950 text-white shadow-md'
                      : 'bg-white text-zinc-600 hover:text-pink-600 border border-zinc-200/80 hover:border-pink-300'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {shown.length} treatments available
              </p>
              {user && (
                <button
                  onClick={() => setShowAdd(!showAdd)}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-800 transition-colors hover:border-pink-600 hover:text-pink-600"
                >
                  <Plus size={15} /> Add a service
                </button>
              )}
            </div>

            {user && showAdd && <AddServiceForm onAdded={() => setShowAdd(false)} />}

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((service) => {
                const assignedStaff = staffList.find((st) => st.role === service.required_role);
                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    selected={selected.some((s) => s.id === service.id)}
                    onSelect={toggle}
                    assignedStaffName={assignedStaff?.name}
                  />
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Floating Bottom Bar when services are selected */}
      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center justify-between rounded-3xl bg-zinc-950 p-5 text-white shadow-2xl shadow-black/50 sm:px-8 border border-zinc-800 animate-scale-in">
          <div>
            <p className="text-sm font-bold text-white">{selected.length} Service{selected.length > 1 ? 's' : ''} Selected</p>
            <p className="mt-1 flex items-center gap-3 text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1 text-pink-400"><Clock3 size={14} /> {duration} min</span>
              <span className="font-serif text-sm font-bold text-white">₱{total.toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={() => setBookingModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-pink-500 shadow-lg shadow-pink-600/40 active:scale-95 cursor-pointer"
          >
            Continue <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Booking Date & Time Modal */}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialServices={selected}
        onBookingSuccess={() => setSelected([])}
      />
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
      duration: `${parseInt(duration) || 60} mins`,
      description,
      status: 'Active',
    }).select().single();
    setBusy(false);
    if (data) {
      setName(''); setPrice(''); setDuration(''); setDescription('');
      onAdded();
      window.location.reload();
    }
  };

  return (
    <div className="mb-10 rounded-3xl border border-pink-200 bg-pink-50/60 p-6 sm:p-8">
      <h3 className="mb-4 font-serif text-xl font-medium text-zinc-900">Add Custom Service</h3>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs outline-none focus:border-pink-600" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs outline-none focus:border-pink-600">
          {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input required type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (₱)"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs outline-none focus:border-pink-600" />
        <input required type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (min)"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs outline-none focus:border-pink-600" />
        <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2}
          className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs outline-none focus:border-pink-600 sm:col-span-2" />
        <button disabled={busy}
          className="flex items-center justify-center gap-2 rounded-full bg-zinc-950 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-pink-600 transition-colors disabled:opacity-60 sm:col-span-2">
          <Plus size={15} /> {busy ? 'Adding...' : 'Add Service'}
        </button>
      </form>
    </div>
  );
}
