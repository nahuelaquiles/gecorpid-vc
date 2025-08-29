import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

const { supabaseUrl, supabaseServiceRole } = getEnv();

/** Cliente de Supabase para usar en el servidor con la clave de servicio. */
export const supabaseAdmin = createClient(
  supabaseUrl ?? '',
  supabaseServiceRole ?? '',
  {
    auth: { persistSession: false },
  },
);
