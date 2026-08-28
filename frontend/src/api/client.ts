import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export interface UploadResponse {
  id: string;
  filename: string;
  pages: number;
  size_bytes: number;
  sha256: string;
  status: string;
}

export interface AnalyzeResponse {
  document_id: string;
  analysis_id: string;
  authenticity_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
}

export interface Region {
  bbox: [number, number, number, number];
  score?: number;
  type: string;
  text?: string;
  reason?: string;
}

export interface ResultsResponse {
  document: { id: string; filename: string; category: string };
  authenticity_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  evidence: Record<string, any>;
  regions: Region[];
  forgery_types: string[];
  explanation: {
    summary: string;
    strongest_evidence: string[];
    likely_manipulation_types?: string[];
    recommended_checks: string[];
    limitations: string;
  };
  timing_ms: Record<string, number>;
  model_version: string;
  page_size: [number, number];
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResponse>("/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function analyzeDocument(id: string): Promise<AnalyzeResponse> {
  const { data } = await api.post<AnalyzeResponse>(`/documents/${id}/analyze`);
  return data;
}

export async function getResults(id: string): Promise<ResultsResponse> {
  const { data } = await api.get<ResultsResponse>(`/documents/${id}/results`);
  return data;
}

export function documentImageUrl(id: string): string {
  return `/api/documents/${id}/file`;
}

export interface ProvenanceResponse {
  document_sha256: string;
  provenance: {
    registered: boolean;
    occurrences: number;
    first_seen: string | null;
    last_seen: string | null;
    verification_id: string | null;
  };
  ledger_integrity: { intact: boolean; entries: number; head?: string };
}

export async function getProvenance(id: string): Promise<ProvenanceResponse> {
  const { data } = await api.get<ProvenanceResponse>(`/documents/${id}/provenance`);
  return data;
}
