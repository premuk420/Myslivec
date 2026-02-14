/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
// Načtení klíčů z .env souboru
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vytvoření klienta
export const supabase = createClient(supabaseUrl, supabaseKey);

// Pomocná třída pro práci s tabulkami
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
    return data;
  }

  // Filtrace (např. body jen pro jednu honitbu)
  async filter(criteria) {
    let query = supabase.from(this.tableName).select('*');
    
    for (const [key, value] of Object.entries(criteria)) {
      query = query.eq(key, value);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Vytvoření záznamu
create: async (itemData) => {
  // 1. Zkusíme data vložit
  const { data, error } = await supabase
    .from('hunting_grounds')
    .insert([itemData])
    .select(); // DŮLEŽITÉ: Smazal jsem .single(), které často zlobí

  // 2. Pokud je chyba, vyhodíme ji
  if (error) {
    console.error("Supabase Error:", error);
    throw error;
  }

  // 3. Pokud se vrátilo pole, vezmeme první prvek, jinak vrátíme null (ale nechybujeme)
  return data && data.length > 0 ? data[0] : null;
},

  // Aktualizace
  async update(id, itemData) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(itemData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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

// Mapování na strukturu, kterou používá vaše aplikace
export const base44 = {
  // Autentizace přes Supabase
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Dotaz na náš profil pro získání jména
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
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
                data: { full_name: fullName } // Toto se zkopíruje triggerem do profiles
            }
        });
        if (error) throw error;
        return data;
    }
  },
  appLogs: {
    logUserInApp: async () => {
      return { success: true }; // Tato funkce teď nic nedělá, ale už neshodí aplikaci
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