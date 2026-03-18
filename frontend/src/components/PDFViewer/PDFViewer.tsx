import { useAppStore } from '../../store/useAppStore';
import { X, FileText, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export const PDFViewer = () => {
  const { activePdfUrl, activePage, highlightText, setActivePdf } = useAppStore();

  if (!activePdfUrl) return null;

  // Split highlight text into sentences/fragments for display
  const highlightFragments = highlightText
    ? highlightText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10)
    : [];

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex flex-col h-full bg-dark-900 border-l border-white/5 shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-dark-800/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-gray-200">Document Viewer</h3>
        </div>
        <div className="flex items-center gap-3">
          {activePage && (
            <span className="text-xs text-primary-400 font-medium bg-primary-500/10 px-2 py-1 rounded-md">
              Page {activePage}
            </span>
          )}
          <button
            onClick={() => setActivePdf(null, null, null)}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document info bar */}
      <div className="px-4 py-3 border-b border-white/5 bg-dark-800/30">
        <p className="text-xs text-gray-400 truncate">{activePdfUrl}</p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {highlightText ? (
          <div className="space-y-4">
            {/* Highlighted citation section */}
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-primary-400" />
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Cited Paragraph
              </h4>
            </div>

            {/* The highlighted text block */}
            <div className="relative">
              <div className="absolute -left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-purple-600 rounded-full" />
              <div className="ml-4 p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 backdrop-blur-sm">
                <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                  {highlightFragments.length > 0
                    ? highlightFragments.map((fragment, idx) => (
                        <span key={idx}>
                          <mark className="bg-primary-500/20 text-primary-200 px-0.5 rounded">
                            {fragment}
                          </mark>
                          {idx < highlightFragments.length - 1 && ' '}
                        </span>
                      ))
                    : (
                      <mark className="bg-primary-500/20 text-primary-200 px-0.5 rounded">
                        {highlightText}
                      </mark>
                    )
                  }
                </p>
              </div>
            </div>

            {/* Context info */}
            <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Source Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-md bg-dark-800/50">
                  <p className="text-[10px] text-gray-500 mb-0.5">File</p>
                  <p className="text-xs text-gray-300 truncate">{activePdfUrl}</p>
                </div>
                <div className="p-2 rounded-md bg-dark-800/50">
                  <p className="text-[10px] text-gray-500 mb-0.5">Page</p>
                  <p className="text-xs text-gray-300">{activePage || '—'}</p>
                </div>
              </div>
            </div>

            {/* Character count */}
            <div className="text-[10px] text-gray-600 text-right">
              {highlightText.length} characters · {highlightFragments.length || 1} segment{highlightFragments.length !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          /* Default state when no highlight */
          <div className="w-full h-full rounded-xl border border-white/10 flex items-center justify-center bg-dark-900 text-center p-8">
            <div className="space-y-3">
              <FileText className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-gray-400 text-sm">Viewing: {activePdfUrl}</p>
              <p className="text-xs text-gray-500">
                Page {activePage || 1} · Click a citation in the chat to highlight the relevant paragraph.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
