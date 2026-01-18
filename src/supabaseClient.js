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

export const deleteMemory = async (id, url) => {
  try {
    // 1. Delete from database
    const { error: dbError } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // 2. Delete from storage (if it's not a mock url)
    if (url && !url.includes('loremflickr.com')) {
       const urlObj = new URL(url);
       const pathParts = urlObj.pathname.split('/');
       // Assuming structure: /storage/v1/object/public/photos/filename
       const fileName = pathParts[pathParts.length - 1];
       
       if (fileName) {
           const { error: storageError } = await supabase.storage
            .from('photos')
            .remove([fileName]);
           
           if (storageError) console.warn('Storage delete error:', storageError);
       }
    }
    return true;
  } catch (err) {
    console.error('Delete failed:', err);
    throw err;
  }
};
