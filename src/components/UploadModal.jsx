import React, { useState } from 'react';
import { supabase, deleteMemory } from '../supabaseClient';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

export default function UploadModal({ onClose, onUploadSuccess, memories }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manage'
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
            image_url: publicUrl, // Fixed: match DB column name
            description: desc,
            memory_date: date,
            type: 'image'
        }]);

      if (dbError) throw dbError;

      onUploadSuccess();
      // Reset form
      setFile(null);
      setDesc('');
      setDate('');
      alert('上传成功！');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, url) => {
      if (!confirm('确定要删除这张照片吗？此操作无法撤销。')) return;
      
      try {
          await deleteMemory(id, url);
          onUploadSuccess(); // Refresh list
      } catch (err) {
          alert('删除失败: ' + err.message);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-2xl text-white font-light">
                {activeTab === 'upload' ? '上传美好回忆' : '管理回忆'}
            </h2>
            <div className="flex bg-zinc-800 rounded-full p-1">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-1 rounded-full text-sm transition-colors ${activeTab === 'upload' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                    上传
                </button>
                <button 
                    onClick={() => setActiveTab('manage')}
                    className={`px-4 py-1 rounded-full text-sm transition-colors ${activeTab === 'manage' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                    管理
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === 'upload' ? (
                <form onSubmit={handleUpload} className="space-y-4 pb-2">
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

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        关闭
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
            ) : (
                <div className="space-y-3 pb-2">
                    {memories && memories.map(mem => (
                        <div key={mem.id} className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors">
                            <img 
                                src={mem.url || mem.image_url} 
                                alt="thumbnail" 
                                className="w-12 h-12 object-cover rounded bg-zinc-900" 
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{mem.memory_date}</p>
                                <p className="text-zinc-400 text-xs truncate">{mem.description || '无描述'}</p>
                            </div>
                            <button 
                                onClick={() => handleDelete(mem.id, mem.url || mem.image_url)}
                                className="text-zinc-500 hover:text-red-400 p-2 transition-colors"
                                title="删除"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}
                    {(!memories || memories.length === 0) && (
                        <div className="text-center py-12 text-zinc-500">
                            <p>暂无照片</p>
                        </div>
                    )}
                    <div className="flex justify-end mt-6 pt-4 border-t border-zinc-800">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
}