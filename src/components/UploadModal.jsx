import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

export default function UploadModal({ onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !date) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Insert into Database
      const { error: dbError } = await supabase
        .from('memories')
        .insert([{
            url: publicUrl,
            description: desc,
            memory_date: date,
            type: 'image'
        }]);

      if (dbError) throw dbError;

      onUploadSuccess();
      onClose();
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl text-white font-light mb-6">上传美好回忆</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">照片文件</label>
            <input 
                type="file" 
                accept="image/*"
                onChange={e => setFile(e.target.files[0])}
                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-cyan-400 hover:file:bg-zinc-700"
            />
          </div>
          
          <div>
            <label className="block text-zinc-400 text-sm mb-2">日期 (必填)</label>
            <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">描述</label>
            <textarea 
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500"
                rows="3"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
                取消
            </button>
            <button 
                type="submit" 
                disabled={uploading}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-medium transition-colors disabled:opacity-50"
            >
                {uploading ? '上传中...' : '确认上传'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
