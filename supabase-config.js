// supabase-config.js
// --- DO NOT SHARE your service_role key anywhere. anon key is safe for frontend reads/writes.

export const SUPABASE_URL = "https://xovlyrrptucywtwuqjfg.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvdmx5cnJwdHVjeXd0d3VxamZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMTA5NjksImV4cCI6MjA3OTg4Njk2OX0.XF130v5J3sf4W9Fxum6LVOjTSkxn9KHOyD6PpIz_nxE";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
