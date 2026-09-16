// Lophera Store — configuração pública do Supabase
// A publishable key pode ficar no front-end. NUNCA coloque a Secret key aqui.
const LOPHERA_SUPABASE_URL = "https://zngimouhumgjcvwsnvkv.supabase.co";
const LOPHERA_SUPABASE_KEY = "sb_publishable_MF5TQN28QwMUFewXEUp9qw_l4MkNU0T";
const supabaseClient = window.supabase.createClient(LOPHERA_SUPABASE_URL, LOPHERA_SUPABASE_KEY);
