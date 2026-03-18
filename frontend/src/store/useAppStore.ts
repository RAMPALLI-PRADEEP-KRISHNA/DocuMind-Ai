import { create } from 'zustand';

export interface SourceInfo {
  file: string;
  page: number;
}

export interface Citation {
  source: string;
  page: number;
  text_chunk: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  confidence_score?: number;
  sources?: SourceInfo[];
  chunk_preview?: string;
}

export interface Document {
  filename: string;
  indexed: boolean;
}

interface AppState {
  messages: Message[];
  documents: Document[];
  isUploading: boolean;
  isGenerating: boolean;
  activePdfUrl: string | null;
  activePage: number | null;
  highlightText: string | null;
  addMessage: (message: Message) => void;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  setIsUploading: (status: boolean) => void;
  setIsGenerating: (status: boolean) => void;
  setActivePdf: (url: string | null, page: number | null, highlight?: string | null) => void;
  removeDocument: (filename: string) => void;
  clearHistory: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  messages: [],
  documents: [],
  isUploading: false,
  isGenerating: false,
  activePdfUrl: null,
  activePage: null,
  highlightText: null,

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  setIsUploading: (status) => set({ isUploading: status }),
  setIsGenerating: (status) => set({ isGenerating: status }),
  setActivePdf: (url, page, highlight = null) =>
    set({ activePdfUrl: url, activePage: page, highlightText: highlight }),
  removeDocument: (filename) => set((state) => ({ documents: state.documents.filter(d => d.filename !== filename) })),
  clearHistory: () => set({ messages: [], activePdfUrl: null, activePage: null, highlightText: null }),
}));
