import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

const { supabaseUrl, supabaseAnonKey } = getEnv();

/** Cliente de Supabase para usar en el navegador con la anon key. */
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
);
