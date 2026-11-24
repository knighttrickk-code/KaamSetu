// Optional Supabase client. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a
// .env file to switch on real phone/email OTP. Without them the app runs in demo mode.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

export async function sendOtp({ phone, email }) {
  if (!supabase) return { demo: true };
  const { error } = phone
    ? await supabase.auth.signInWithOtp({ phone: `+91${phone}` })
    : await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return { demo: false };
}

export async function verifyOtp({ phone, email, token }) {
  if (!supabase) {
    if (token !== '123456') throw new Error('Wrong OTP. In demo mode use 123456.');
    return { demo: true };
  }
  const { data, error } = phone
    ? await supabase.auth.verifyOtp({ phone: `+91${phone}`, token, type: 'sms' })
    : await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return { demo: false, authUserId: data.user?.id };
}
