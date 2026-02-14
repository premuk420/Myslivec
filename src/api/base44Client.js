/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// 1. Načtení klíčů z .env souboru
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bezpečnostní kontrola
if (!supabaseUrl || !supabaseKey) {
  console.error("CHYBA: Nenalezeny Supabase klíče v .env souboru!");
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

  // === TUTO FUNKCI JSME PŘIDALI ===
  // Získání jednoho záznamu podle ID
  async get(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle(); // maybeSingle je bezpečnější než single (nehází 406)
      
    if (error) throw error;
    return data;
  }
  // ================================

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

  // Vytvoření záznamu
  async create(itemData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([itemData])
      .select();
      
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  // Aktualizace
  async update(id, itemData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(itemData)
      .eq('id', id)
      .select();

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
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
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
  
  appLogs: {
    logUserInApp: async () => { return { success: true }; }
  },
  
  entities: {
    HuntingGround: new EntityHandler('hunting_grounds'),
    GroundMember: new EntityHandler('ground_members'),
    MapPoint: new EntityHandler('map_points'),
    Reservation: new EntityHandler('reservations')
  }
};