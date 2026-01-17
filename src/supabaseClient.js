import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MOCK_DATA = Array.from({ length: 40 }).map((_, i) => ({
  id: `mock-${i}`,
  // Using loremflickr for better reliability and thematic images
  url: `https://loremflickr.com/800/600/space,galaxy?lock=${i}`, 
  description: `美好回忆 #${i + 1} - 我们的点点滴滴`,
  memory_date: new Date(Date.now() - i * 86400000 * 5).toISOString().split('T')[0],
  created_at: new Date().toISOString()
}));

export const getMemories = async () => {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('memory_date', { ascending: true });

    if (error) {
        console.warn('Supabase error, using mock data:', error);
        return MOCK_DATA;
    }
    
    if (!data || data.length === 0) {
      console.warn('No data in Supabase, using mock data.');
      return MOCK_DATA;
    }
    return data;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return MOCK_DATA;
  }
};
