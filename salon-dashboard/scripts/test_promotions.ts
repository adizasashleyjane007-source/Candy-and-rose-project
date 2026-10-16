import { getManilaToday, formatMonthYear, getPromotionDateRange, isPromotionCurrentlyValid, isPromotionForCurrentMonth, isPromotionInMonth } from "../src/lib/promotions-utils";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uswenkzmczuglebopzwx.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_fd_uvyBBIAQ3x7qwAjXYMw_p1YyWjLD";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log("==========================================");
  console.log("RUNNING PROMOTIONS PRESERVATION & SYNC TESTS");
  console.log("==========================================");

  const manilaToday = getManilaToday();
  console.log(`Current Manila Date: ${manilaToday.dateStr} (${manilaToday.formattedMonthYear})`);

  let allPassed = true;
  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
    } else {
      console.error(`❌ FAIL: ${msg}`);
      allPassed = false;
    }
  }

  // --- Fetch all promotions from Supabase ---
  const { data: allPromotions, error } = await supabase
    .from("promotions")
    .select("*")
    .order("id", { ascending: false });

  if (error || !allPromotions) {
    console.error("Failed to fetch promotions from Supabase:", error);
    return;
  }

  console.log(`Total database promotions: ${allPromotions.length}`);

  // Requirement 1 & 4: Preserve all past and historical promotions in salon-dashboard
  // When selectedMonthFilter is "ALL", all promotions must be preserved and visible
  const dashboardAllFilter = allPromotions.filter(p => isPromotionInMonth(p, "ALL"));
  assert(dashboardAllFilter.length === allPromotions.length, `Dashboard 'ALL' filter preserves ALL ${allPromotions.length} historical, past, and current promotions`);

  // Test dashboard monthly organization:
  const dashboardOctFilter = allPromotions.filter(p => isPromotionInMonth(p, "2026-10"));
  console.log(`Dashboard promotions filtered by October 2026: ${dashboardOctFilter.length}`);
  assert(dashboardOctFilter.length === 4, "Dashboard October 2026 filter shows exactly the 4 October promotions");

  const dashboardNovFilter = allPromotions.filter(p => isPromotionInMonth(p, "2026-11"));
  console.log(`Dashboard promotions filtered by November 2026: ${dashboardNovFilter.length}`);
  assert(dashboardNovFilter.length === 1 && dashboardNovFilter[0].name === "mega 10", "Dashboard November 2026 filter shows future November promotion 'mega 10'");

  const dashboardUnassignedFilter = allPromotions.filter(p => isPromotionInMonth(p, "UNASSIGNED"));
  console.log(`Dashboard promotions with unassigned month: ${dashboardUnassignedFilter.length}`);
  assert(dashboardUnassignedFilter.length === 10, "Dashboard preserves all 10 historical unassigned promotions");

  // Requirement 2: Display only the current month's promotional packages in salon-customer
  const customerPromotions = allPromotions.filter(p => isPromotionForCurrentMonth(p, manilaToday));
  console.log(`Customer promotions displayed for October 2026: ${customerPromotions.length}`);
  customerPromotions.forEach(p => {
    console.log(`  - ${p.name} | Month: ${formatMonthYear(p.start_date || p.date)} | Price: ₱${p.price} | Status: ${p.status}`);
  });

  assert(customerPromotions.length === 4, "Customer page displays ONLY the 4 packages assigned to the current month (October 2026)");
  assert(customerPromotions.every(p => {
    const { monthStr } = getPromotionDateRange(p);
    return monthStr === "2026-10" && (p.status?.toLowerCase() === "available" || p.status?.toLowerCase() === "active");
  }), "All customer-facing packages are active and strictly assigned to October 2026");
  assert(!customerPromotions.some(p => p.name === "mega 10"), "Future November package 'mega 10' is NOT displayed in October");
  assert(!customerPromotions.some(p => !p.date && !p.start_date), "Unassigned historical promotions are NOT displayed in customer active packages");

  // Requirement 2: Automatic switch when month changes to November 2026 in Manila
  const novemberManila: typeof manilaToday = {
    year: 2026,
    month: 11,
    day: 1,
    dateStr: "2026-11-01",
    monthStr: "2026-11",
    formattedMonthYear: "November 2026"
  };
  const customerNovPromotions = allPromotions.filter(p => isPromotionForCurrentMonth(p, novemberManila));
  console.log(`Customer promotions displayed automatically when November begins: ${customerNovPromotions.length}`);
  customerNovPromotions.forEach(p => {
    console.log(`  - ${p.name} | Month: ${formatMonthYear(p.start_date || p.date)} | Price: ₱${p.price}`);
  });
  assert(customerNovPromotions.length === 1 && customerNovPromotions[0].name === "mega 10", "When November begins, customer page automatically displays November package ('mega 10') without manual intervention");
  assert(!customerNovPromotions.some(p => p.name.includes("Mega Promo")), "October packages automatically disappear when November begins");

  // Requirement 2: Empty state when a month has no promotions assigned (e.g. December 2026)
  const decemberManila: typeof manilaToday = {
    year: 2026,
    month: 12,
    day: 1,
    dateStr: "2026-12-01",
    monthStr: "2026-12",
    formattedMonthYear: "December 2026"
  };
  const customerDecPromotions = allPromotions.filter(p => isPromotionForCurrentMonth(p, decemberManila));
  assert(customerDecPromotions.length === 0, "When month has no assigned promotions (December 2026), 0 promotions are returned (triggers empty state)");

  // Past promotion exclusion test (e.g. September 2026 promotion checked in October 2026)
  const pastSepPromo = {
    name: "Past September Promo",
    date: "2026-09-01",
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "Available"
  };
  assert(!isPromotionForCurrentMonth(pastSepPromo, manilaToday), "Past September promotion is excluded from customer display in October");

  // Year change transition (2026-12-31 to 2027-01-01)
  const jan2027Manila: typeof manilaToday = {
    year: 2027,
    month: 1,
    day: 1,
    dateStr: "2027-01-01",
    monthStr: "2027-01",
    formattedMonthYear: "January 2027"
  };
  const decPromo = {
    name: "Holiday 2026",
    date: "2026-12-01",
    start_date: "2026-12-01",
    end_date: "2026-12-31",
    status: "Available"
  };
  const janPromo = {
    name: "New Year 2027",
    date: "2027-01-01",
    start_date: "2027-01-01",
    end_date: "2027-01-31",
    status: "Available"
  };
  assert(!isPromotionForCurrentMonth(decPromo, jan2027Manila), "Dec 2026 promo is excluded when year rolls to Jan 2027");
  assert(isPromotionForCurrentMonth(janPromo, jan2027Manila), "Jan 2027 promo becomes active when year rolls to Jan 2027");

  console.log("\n==========================================");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  } else {
    console.error("❌ SOME TESTS FAILED!");
  }
  console.log("==========================================");
}

runTests().catch(console.error);
