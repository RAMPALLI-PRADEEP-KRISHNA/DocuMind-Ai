import { Sidebar } from './components/Sidebar/Sidebar';
import { Chat } from './components/Chat/Chat';
import { Upload } from './components/Upload/Upload';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { useAppStore } from './store/useAppStore';
import { AnimatePresence } from 'framer-motion';

function App() {
  const { activePdfUrl } = useAppStore();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark-900 text-slate-200 selection:bg-primary-500/30">
      
      {/* Abstract background blobs for premium feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600 mix-blend-screen filter blur-[120px] animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-indigo-600 mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-purple-900 mix-blend-screen filter blur-[150px] animate-blob animation-delay-4000"></div>
      </div>

      <Sidebar />
      
      <main className="flex-1 flex flex-col xl:flex-row relative z-10 w-full">
         <div className="flex-1 flex flex-col min-w-0">
            {/* Header Area */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between glass-panel shrink-0">
               <div>
                 <h2 className="text-lg font-semibold text-white">Analysis Dashboard</h2>
                 <p className="text-xs text-gray-400">Ask questions, generate insights, and verify sources.</p>
               </div>
               
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     <span className="text-xs font-medium text-green-400">Ollama Connected</span>
                  </div>
               </div>
            </header>

            {/* Central Content Area */}
            <div className="flex-1 overflow-hidden grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
               
               {/* Left column: Upload & Document specific info */}
               <div className="border-b md:border-b-0 md:border-r border-white/5 bg-dark-900/40 p-6 overflow-y-auto shrink-0 z-20">
                  <h3 className="text-sm font-semibold text-gray-200 mb-4">Ingest Documents</h3>
                  <Upload />
                  
                  <div className="mt-8">
                     <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">System Details</h3>
                     <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                           <p className="text-xs text-gray-400 mb-1">Embedding Model</p>
                           <p className="text-sm font-medium text-primary-300">nomic-embed-text</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                           <p className="text-xs text-gray-400 mb-1">LLM Generator</p>
                           <p className="text-sm font-medium text-primary-300">mistral:latest</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                           <p className="text-xs text-gray-400 mb-1">Retrieval Engine</p>
                           <p className="text-sm font-medium text-primary-300">Hybrid (Chroma + BM25)</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right column: Chat Interface */}
               <div className="flex-1 w-full relative z-10 flex flex-col h-full overflow-hidden">
                  <Chat />
               </div>
            </div>
         </div>
         
         {/* PDF Viewer Panel with animation */}
         <AnimatePresence>
           {activePdfUrl && (
             <div className="hidden xl:block w-[450px] shrink-0 z-30">
               <PDFViewer />
             </div>
           )}
         </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
