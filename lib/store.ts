import { supabase } from './supabase';

export interface Bar {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  capacity: number;
  owner_name: string;
  open_hours: string;
  tags: string[];
  created_at: string;
}

export interface Checkin {
  id: string;
  bar_id: string;
  nickname: string;
  gender: 'male' | 'female';
  checked_in_at: string;
  is_active: boolean;
}

export const store = {
  async getBars(): Promise<Bar[]> {
    const { data, error } = await supabase.from('bars').select('*').order('created_at');
    if (error) throw error;
    return data ?? [];
  },

  async getBarsWithStats() {
    const bars = await this.getBars();
    const stats = await Promise.all(bars.map((b) => this.getBarStats(b.id)));
    return bars.map((bar, i) => ({ ...bar, stats: stats[i] }));
  },

  async getBarStats(barId: string): Promise<{ male: number; female: number }> {
    const { data, error } = await supabase
      .from('checkins')
      .select('gender')
      .eq('bar_id', barId)
      .eq('is_active', true);
    if (error) throw error;
    const male = data?.filter((c) => c.gender === 'male').length ?? 0;
    const female = data?.filter((c) => c.gender === 'female').length ?? 0;
    return { male, female };
  },

  async addBar(bar: Omit<Bar, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('bars').insert(bar).select().single();
    if (error) throw error;
    return data as Bar;
  },

  async addCheckin(checkin: Omit<Checkin, 'id' | 'checked_in_at' | 'is_active'>) {
    const { data, error } = await supabase
      .from('checkins')
      .insert({ ...checkin, is_active: true })
      .select()
      .single();
    if (error) throw error;
    return data as Checkin;
  },

  async checkout(checkinId: string): Promise<boolean> {
    const { error } = await supabase
      .from('checkins')
      .update({ is_active: false })
      .eq('id', checkinId);
    if (error) throw error;
    return true;
  },
};
