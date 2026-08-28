import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Severity = "critical" | "high" | "medium" | "low" | "info";

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
  forensic_risk: number;
  risk_level: RiskLevel;
  confidence: number;
  case_number: string;
}

export interface Region {
  bbox: [number, number, number, number];
  score?: number;
  type: string;
  text?: string;
  reason?: string;
}

export interface Evidence {
  id: string;
  stage: string;
  type: string;
  bbox: [number, number, number, number] | null;
  severity: Severity;
  confidence: number | null;
  score: number | null;
  title: string;
  summary: string;
  matched_text?: string;
  why_it_matters: string;
  recommended_check: string;
  corroborated: boolean;
  informational: boolean;
}

export interface Explanation {
  summary: string;
  strongest_evidence: string[];
  likely_manipulation_types?: string[];
  recommended_checks: string[];
  limitations: string;
}

export interface ResultsResponse {
  document: { id: string; filename: string; category: string; case_number: string };
  authenticity_score: number;
  forensic_risk: number;
  risk_level: RiskLevel;
  confidence: number;
  evidence: Record<string, any>;
  evidence_list: Evidence[];
  regions: Region[];
  ocr_words: { text: string; bbox: [number, number, number, number]; confidence: number }[];
  forgery_types: string[];
  explanation: Explanation;
  timing_ms: Record<string, number>;
  stage_summaries: Record<string, string>;
  model_version: string;
  page_size: [number, number];
  enterprise_assessment?: {
    risk_score: number; authenticity_score: number; risk_level: RiskLevel;
    algorithm: string; model_name: string; model_version: string;
  } | null;
}

export interface InvestigationSummary {
  id: string;
  filename: string;
  category: string;
  case_number: string;
  status?: string;
  created_at: string;
  authenticity_score: number;
  forensic_risk?: number;
  risk_level: RiskLevel;
  confidence?: number;
  finding_count?: number;
}

export interface DashboardStats {
  total_investigations: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  recent_investigations: InvestigationSummary[];
  active_model: { id: string; name: string; version: string; metrics: Record<string, number> } | null;
}

export const STAGE_ORDER = ["intake", "ocr", "visual_forensics", "typography", "structure",
  "metadata", "consistency", "fusion"] as const;
export type StageKey = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS: Record<StageKey, string> = {
  intake: "Document Intake", ocr: "OCR Analysis", visual_forensics: "Visual Forensics",
  typography: "Typography", structure: "Structure", metadata: "Metadata",
  consistency: "Consistency", fusion: "Evidence Fusion",
};

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

export async function listInvestigations(): Promise<InvestigationSummary[]> {
  const { data } = await api.get<{ investigations: InvestigationSummary[] }>("/documents");
  return data.investigations;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard/stats");
  return data;
}

export function documentImageUrl(id: string): string {
  return `/api/documents/${id}/file`;
}
