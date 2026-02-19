import { createClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';
import 'react-native-url-polyfill/auto';

const PUBLIC_SUPABASE_URL="https://aqefbkyrcvzticcwoglv.supabase.co"
const PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="sb_publishable_n9kzSzHqg5nYMy8jH0MX6Q_sgHVXNCi"

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})