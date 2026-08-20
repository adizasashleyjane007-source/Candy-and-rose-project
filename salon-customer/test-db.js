const { createClient } = require('@supabase/supabase-js');
const url = 'https://uswenkzmczuglebopzwx.supabase.co';
const key = 'sb_publishable_fd_uvyBBIAQ3x7qwAjXYMw_p1YyWjLD';
const supabase = createClient(url, key);

async function test() {
  try {
    const { data, error, status, statusText } = await supabase
      .from("customers")
      .select("*")
      .eq("email", "arvinadizas159@gmail.com")
      .maybeSingle();
    console.log("Status:", status, statusText);
    console.log("Error:", error);
    console.log("Data:", data);
  } catch (e) {
    console.error(e);
  }
}
test();
