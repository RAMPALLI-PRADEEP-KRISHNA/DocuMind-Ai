import { useState } from 'react';
import { CloudUpload, CheckCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { uploadDocument } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'idle' | 'uploading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const { addDocument, setIsUploading } = useAppStore();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setUploadStatus({ type: 'error', message: 'Please upload a PDF file.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'uploading', message: `Uploading ${file.name}...` });
    try {
      const result = await uploadDocument(file);
      addDocument({ filename: result.filename, indexed: true });
      setUploadStatus({ type: 'success', message: `Successfully indexed ${result.filename} (${result.num_chunks} chunks)` });
      
      // Auto-hide success
      setTimeout(() => {
        setUploadStatus({ type: 'idle', message: '' });
      }, 4000);
    } catch (error: any) {
       setUploadStatus({ type: 'error', message: error.response?.data?.detail || 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-6">
      <form
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`glass-card relative flex flex-col items-center justify-center w-full h-48 p-4 rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out ${
          dragActive ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/30'
        }`}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".pdf"
        />
        <div className="flex flex-col items-center justify-center p-5 text-center">
          <CloudUpload className={`w-12 h-12 mb-3 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
          <p className="mb-2 text-sm text-gray-300">
            <span className="font-semibold text-primary-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-400">PDF files only (Hybrid RAG Vectorization)</p>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {uploadStatus.type !== 'idle' && (
           <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
               uploadStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
               uploadStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
               'bg-primary-500/10 text-primary-300 border border-primary-500/20'
             }`}
           >
              {uploadStatus.type === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {uploadStatus.message}
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
