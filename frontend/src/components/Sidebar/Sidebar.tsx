import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getDocuments, deleteDocument } from '../../services/api';
import { FileText, Database, Settings, PlusCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const Sidebar = () => {
    const { documents, setDocuments, clearHistory } = useAppStore();

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const docs = await getDocuments();
                setDocuments(docs);
            } catch (error) {
                console.error("Failed to fetch documents:", error);
            }
        };
        fetchDocs();
    }, [setDocuments]);

    const handleDelete = async (e: React.MouseEvent, filename: string) => {
        e.stopPropagation();
        try {
            await deleteDocument(filename);
            const { removeDocument, activePdfUrl, setActivePdf } = useAppStore.getState();
            removeDocument(filename);
            if (activePdfUrl && activePdfUrl.includes(encodeURIComponent(filename))) {
                setActivePdf(null, null);
            }
        } catch (error) {
            console.error("Failed to delete document:", error);
        }
    };

    return (
        <aside className="w-72 h-full glass-panel flex flex-col border-r border-white/5 relative z-10 hidden md:flex">
            {/* Logo area */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">DocuMind<span className="text-primary-400">AI</span></h1>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Hybrid RAG Engine</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4">
                 <button 
                    onClick={clearHistory}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors border border-white/5"
                 >
                     <PlusCircle className="w-4 h-4 text-primary-400" />
                     New Conversation
                 </button>
            </div>

            {/* Knowledge Base */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Knowledge Base</h3>
                
                {documents.length === 0 ? (
                    <div className="text-center p-4 border border-dashed border-white/10 rounded-xl space-y-2">
                        <FileText className="w-6 h-6 text-gray-600 mx-auto" />
                        <p className="text-xs text-gray-500">No documents indexed yet.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {documents.map((doc, idx) => (
                            <motion.li 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={idx} 
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5 group"
                            >
                                <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-colors">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-200 truncate">{doc.filename}</p>
                                    <p className="text-[10px] text-green-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Vectorized
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(e, doc.filename)}
                                    className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/5"
                                    title="Delete document"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Settings bottom */}
            <div className="p-4 border-t border-white/5">
                <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors p-2 rounded-lg w-full">
                    <Settings className="w-4 h-4" />
                    Engine Settings
                </button>
            </div>
        </aside>
    );
};
