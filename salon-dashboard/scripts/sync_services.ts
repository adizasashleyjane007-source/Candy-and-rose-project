import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uswenkzmczuglebopzwx.supabase.co',
  'sb_publishable_fd_uvyBBIAQ3x7qwAjXYMw_p1YyWjLD'
);

const getRoleForCategory = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("nail") || cat.includes("manicure") || cat.includes("pedicure")) return "Nail Technician";
    if (cat.includes("hair") || cat.includes("cut") || cat.includes("color")) return "Senior Stylist";
    if (cat.includes("massage") || cat.includes("spa")) return "Therapist";
    if (cat.includes("makeup") || cat.includes("face")) return "Makeup Artist";
    return "General Staff";
};

type ServiceInput = {
    name: string;
    category: string;
    price: number;
    duration: string;
};

const customerServices: ServiceInput[] = [
    // HAIRCUT & STYLING
    { name: "Men & Women Haircut", category: "HAIRCUT & STYLING", price: 150, duration: "30 mins" },
    { name: "Kids", category: "HAIRCUT & STYLING", price: 150, duration: "30 mins" },
    { name: "Hair Blow", category: "HAIRCUT & STYLING", price: 200, duration: "30 mins" },
    { name: "Hair Iron — Straight", category: "HAIRCUT & STYLING", price: 300, duration: "30 mins" },
    { name: "Hair Iron — Curl", category: "HAIRCUT & STYLING", price: 400, duration: "30 mins" },
    { name: "Hair & Make-up", category: "HAIRCUT & STYLING", price: 1000, duration: "60 mins" },

    // HAIR CARE
    { name: "Hair Spa", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Hair Spa - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Hair Spa - Long", category: "HAIR CARE", price: 399, duration: "60 mins" },
    { name: "Deep Repair (Cream Based)", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Deep Repair - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Deep Repair - Long", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "LPP", category: "HAIR CARE", price: 499, duration: "60 mins" },
    { name: "LPP - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "LPP - Long", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Scalp Treatment", category: "HAIR CARE", price: 399, duration: "60 mins" },
    { name: "Scalp Treatment Classic - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Scalp Treatment Classic - Long", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Scalp Treatment Organic - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Scalp Treatment Organic - Long", category: "HAIR CARE", price: 499, duration: "60 mins" },
    { name: "Brazilian", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Brazilian - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Brazilian - Long", category: "HAIR CARE", price: 799, duration: "60 mins" },
    { name: "Brazilian Organic", category: "HAIR CARE", price: 1500, duration: "60 mins" },
    { name: "Brazilian Organic - Medium", category: "HAIR CARE", price: 0, duration: "60 mins" },
    { name: "Brazilian Organic - Long", category: "HAIR CARE", price: 0, duration: "60 mins" },

    // TREATMENTS & SERVICES
    { name: "Hair Color", category: "TREATMENTS & SERVICES", price: 499, duration: "60 mins" },
    { name: "Hair Color - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Hair Color - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Highlight", category: "TREATMENTS & SERVICES", price: 499, duration: "60 mins" },
    { name: "Highlight - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Highlight - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Hair Perming", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Hair Perming - Base price", category: "TREATMENTS & SERVICES", price: 699, duration: "60 mins" },
    { name: "Hair Perming - Medium", category: "TREATMENTS & SERVICES", price: 999, duration: "60 mins" },
    { name: "Hair Perming - Long", category: "TREATMENTS & SERVICES", price: 1500, duration: "60 mins" },
    { name: "Hair Reborn", category: "TREATMENTS & SERVICES", price: 799, duration: "60 mins" },
    { name: "Hair Reborn - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Hair Reborn - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Cellophane", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Cellophane - Medium", category: "TREATMENTS & SERVICES", price: 499, duration: "60 mins" },
    { name: "Cellophane - Long", category: "TREATMENTS & SERVICES", price: 699, duration: "60 mins" },
    { name: "Brazillian", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Brazillian - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Brazillian - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Rebond (Organic)", category: "TREATMENTS & SERVICES", price: 999, duration: "60 mins" },
    { name: "Rebond (Organic) - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Rebond (Organic) - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Hair Botox", category: "TREATMENTS & SERVICES", price: 999, duration: "60 mins" },
    { name: "Hair Botox - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Hair Botox - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Protein Straight Bond", category: "TREATMENTS & SERVICES", price: 2500, duration: "60 mins" },
    { name: "Protein Straight Bond - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Protein Straight Bond - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Wyres Opti Straight Bond", category: "TREATMENTS & SERVICES", price: 2800, duration: "60 mins" },
    { name: "Wyres Opti Straight Bond - Medium", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },
    { name: "Wyres Opti Straight Bond - Long", category: "TREATMENTS & SERVICES", price: 0, duration: "60 mins" },

    // NAIL ART
    // Basic Nail Art
    { name: "Nail Art: French Tip", category: "NAIL ART", price: 200, duration: "30 mins" },
    { name: "Nail Art: French Tip (Per Nail)", category: "NAIL ART", price: 20, duration: "10 mins" },
    { name: "Nail Art: Glitter Finish", category: "NAIL ART", price: 100, duration: "30 mins" },
    { name: "Nail Art: Glitter Finish (Per Nail)", category: "NAIL ART", price: 10, duration: "10 mins" },
    { name: "Nail Art: Cat Eye", category: "NAIL ART", price: 100, duration: "30 mins" },
    { name: "Nail Art: Cat Eye (Per Nail)", category: "NAIL ART", price: 10, duration: "10 mins" },
    { name: "Nail Art: Dots / Lines / Woble", category: "NAIL ART", price: 100, duration: "30 mins" },
    { name: "Nail Art: Dots / Lines / Woble (Per Nail)", category: "NAIL ART", price: 10, duration: "10 mins" },
    
    // Classic Nail Art
    { name: "Nail Art: Marble", category: "NAIL ART", price: 250, duration: "30 mins" },
    { name: "Nail Art: Marble (Per Nail)", category: "NAIL ART", price: 25, duration: "10 mins" },
    { name: "Nail Art: Ombre", category: "NAIL ART", price: 300, duration: "30 mins" },
    { name: "Nail Art: Ombre (Per Nail)", category: "NAIL ART", price: 30, duration: "10 mins" },
    { name: "Nail Art: Hand Paint (Simple)", category: "NAIL ART", price: 200, duration: "30 mins" },
    { name: "Nail Art: Hand Paint (Simple) (Per Nail)", category: "NAIL ART", price: 20, duration: "10 mins" },
    { name: "Nail Art: Paint Glitter", category: "NAIL ART", price: 150, duration: "30 mins" },
    { name: "Nail Art: Paint Glitter (Per Nail)", category: "NAIL ART", price: 15, duration: "10 mins" },

    // Advance Nail Art
    { name: "Nail Art: 3D Nail Art", category: "NAIL ART", price: 500, duration: "30 mins" },
    { name: "Nail Art: 3D Nail Art (Per Nail)", category: "NAIL ART", price: 50, duration: "10 mins" },
    { name: "Nail Art: Chrome", category: "NAIL ART", price: 250, duration: "30 mins" },
    { name: "Nail Art: Chrome (Per Nail)", category: "NAIL ART", price: 25, duration: "10 mins" },
    { name: "Nail Art: Foil Art", category: "NAIL ART", price: 200, duration: "30 mins" },
    { name: "Nail Art: Foil Art (Per Nail)", category: "NAIL ART", price: 20, duration: "10 mins" },
    { name: "Nail Art: Hand Paint (Intri)", category: "NAIL ART", price: 500, duration: "30 mins" },
    { name: "Nail Art: Hand Paint (Intri) (Per Nail)", category: "NAIL ART", price: 50, duration: "10 mins" },
    { name: "Nail Art: Mermaid / Embossed", category: "NAIL ART", price: 300, duration: "30 mins" },
    { name: "Nail Art: Mermaid / Embossed (Per Nail)", category: "NAIL ART", price: 30, duration: "10 mins" },

    // Stones
    { name: "Nail Art: Simple Cuticle", category: "NAIL ART", price: 100, duration: "30 mins" },
    { name: "Nail Art: Simple Cuticle (Per Nail)", category: "NAIL ART", price: 10, duration: "10 mins" },
    { name: "Nail Art: Full Nail", category: "NAIL ART", price: 950, duration: "30 mins" },
    { name: "Nail Art: Full Nail (Per Nail)", category: "NAIL ART", price: 100, duration: "10 mins" },
    { name: "Nail Art: ¾ Coverage", category: "NAIL ART", price: 750, duration: "30 mins" },
    { name: "Nail Art: ¾ Coverage (Per Nail)", category: "NAIL ART", price: 80, duration: "10 mins" },
    { name: "Nail Art: ½ Coverage", category: "NAIL ART", price: 450, duration: "30 mins" },
    { name: "Nail Art: ½ Coverage (Per Nail)", category: "NAIL ART", price: 50, duration: "10 mins" },
    { name: "Nail Art: ¼ Coverage", category: "NAIL ART", price: 250, duration: "30 mins" },
    { name: "Nail Art: ¼ Coverage (Per Nail)", category: "NAIL ART", price: 30, duration: "10 mins" },
    { name: "Nail Art: Scatter", category: "NAIL ART", price: 200, duration: "30 mins" },
    { name: "Nail Art: Scatter (Per Nail)", category: "NAIL ART", price: 20, duration: "10 mins" },
    { name: "Nail Art: Charm", category: "NAIL ART", price: 100, duration: "30 mins" },
    { name: "Nail Art: Charm (Per Nail)", category: "NAIL ART", price: 10, duration: "10 mins" },

    // ADDITIONAL SERVICES
    { name: "Soft Gel Removal", category: "ADDITIONAL SERVICES", price: 200, duration: "30 mins" },
    { name: "Gel Removal", category: "ADDITIONAL SERVICES", price: 100, duration: "30 mins" },
];

async function sync() {
    console.log("Fetching existing services...");
    const { data: existingServices, error } = await supabase.from('services').select('*');
    if (error) {
        console.error("Failed to fetch existing services", error);
        return;
    }

    // Prepare a set of expected service names for quick lookup
    const expectedServiceNames = new Set(customerServices.map(s => s.name.toLowerCase()));

    // Iterate existing services
    for (const service of existingServices) {
        const isExpected = expectedServiceNames.has(service.name.toLowerCase());
        
        if (!isExpected) {
            console.log(`Deleting extra service: ${service.name}`);
            const { error: delError } = await supabase.from('services').delete().eq('id', service.id);
            if (delError) {
                console.log(`Failed to delete (likely referenced). Setting status to Inactive for: ${service.name}`);
                await supabase.from('services').update({ status: 'Inactive' }).eq('id', service.id);
            }
        }
    }

    // Now upsert customer services
    for (const cs of customerServices) {
        const existing = existingServices.find((s: any) => s.name.toLowerCase() === cs.name.toLowerCase());
        
        const payload = {
            name: cs.name,
            category: cs.category,
            price: cs.price,
            duration: cs.duration,
            required_role: getRoleForCategory(cs.category),
            status: 'Active'
        };

        if (existing) {
            console.log(`Updating existing service: ${cs.name}`);
            await supabase.from('services').update(payload).eq('id', existing.id);
        } else {
            console.log(`Creating new service: ${cs.name}`);
            await supabase.from('services').insert(payload);
        }
    }
    console.log("Sync complete!");
}

sync().catch(console.error);
