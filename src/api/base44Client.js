/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// 1. Načtení klíčů z .env souboru
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bezpečnostní kontrola - vypíše chybu do konzole, pokud klíče chybí
if (!supabaseUrl || !supabaseKey) {
  console.error("CHYBA: Nenalezeny Supabase klíče v .env souboru! Zkontrolujte název proměnných.");
}

// 2. Vytvoření klienta
export const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Pomocná třída pro práci s tabulkami
class EntityHandler {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // Získání všech záznamů
  async list() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    if (error) throw error;
    return data || [];
  }

  // Filtrace
  async filter(criteria) {
    let query = supabase.from(this.tableName).select('*');
    
    for (const [key, value] of Object.entries(criteria)) {
      query = query.eq(key, value);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Vytvoření záznamu (OPRAVENO: Odstraněno .single())
  async create(itemData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([itemData])
      .select(); // Tady vracíme pole, ne .single(), aby to nepadalo na konfliktech
      
    if (error) throw error;
    
    // Vrátíme první položku z pole, nebo null
    return data && data.length > 0 ? data[0] : null;
  }

  // Aktualizace
  async update(id, itemData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(itemData)
      .eq('id', id)
      .select(); // Taky raději bez .single() pro jistotu

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  // Mazání
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  }
}

// 4. Mapování na strukturu aplikace
export const base44 = {
  // Autentizace přes Supabase
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Získáme i profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // maybeSingle nehodí chybu, když profil neexistuje
        
      return { ...user, ...profile };
    },
    logout: async () => {
      await supabase.auth.signOut();
      window.location.reload();
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signUp: async (email, password, fullName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) throw error;
      return data;
    }
  },
  
  // Dummy funkce pro logování (aby nepadal NavigationTracker)
  appLogs: {
    logUserInApp: async () => {
      return { success: true };
    }
  },
  
  // Entity
  entities: {
    HuntingGround: new EntityHandler('hunting_grounds'),
    GroundMember: new EntityHandler('ground_members'),
    MapPoint: new EntityHandler('map_points'),
    Reservation: new EntityHandler('reservations')
  }
};