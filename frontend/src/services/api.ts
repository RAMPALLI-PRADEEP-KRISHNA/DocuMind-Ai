import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('files', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // Backend returns array now; take first result for single-file compat
  return Array.isArray(response.data) ? response.data[0] : response.data;
};

export const askQuestion = async (question: string) => {
  const response = await api.post('/ask', { question });
  return response.data;
};

export const getDocuments = async () => {
  const response = await api.get('/documents');
  return response.data;
};

export const deleteDocument = async (filename: string) => {
  const response = await api.delete(`/documents/${encodeURIComponent(filename)}`);
  return response.data;
};

export const exportChatPdf = async (data: {
  question: string;
  answer: string;
  confidence: number;
  sources: { file: string; page: number }[];
  timestamp: string;
}) => {
  const response = await api.post('/export', data, {
    responseType: 'blob',
  });
  // Trigger download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `DocuMind_Report_${Date.now()}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
