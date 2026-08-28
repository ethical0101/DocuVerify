import { api } from "./client";

export interface DatasetSummary {
  id: string; filename: string; genuine_count: number; forged_count: number;
  forgery_type_counts: Record<string, number>; status: "uploaded" | "validated" | "invalid";
  validation_report: {
    checks: { label: string; passed: boolean }[];
    ready_for_training: boolean;
    corrupted_files: string[];
  };
  created_at: string;
}

export interface ModelSummary {
  id: string; name: string; version: string; algorithm: string;
  metrics: { accuracy?: number; precision?: number; recall?: number; f1?: number; roc_auc?: number | null;
             train_size?: number; val_size?: number; test_size?: number };
  status: "active" | "archived";
  created_at: string;
}

export interface TrainingStage { name: string; status: "pending" | "running" | "completed"; at: string | null; }
export interface TrainingJobStatus {
  id: string; status: "pending" | "running" | "completed" | "failed";
  stages: TrainingStage[]; error: string | null; model_version_id: string | null;
  created_at: string; completed_at: string | null;
}

export interface EnterpriseDashboard {
  organization: { id: string; name: string };
  active_model: ModelSummary | null;
  total_investigations: number; high_risk: number; medium_risk: number; low_risk: number;
  available_models: ModelSummary[];
  recent_training: { id: string; status: string; dataset_id: string; created_at: string; model_version_id: string | null }[];
}

export interface OrgUser {
  id: string; email: string; role: string; status: string; created_at: string; last_active_at: string | null;
}

export interface AuditEvent { id: string; event: string; detail: string; created_at: string; user_email: string; }

export async function uploadDataset(file: File): Promise<DatasetSummary> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<DatasetSummary>("/enterprise/datasets/upload", form,
    { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}

export async function listDatasets(): Promise<DatasetSummary[]> {
  const { data } = await api.get<{ datasets: DatasetSummary[] }>("/enterprise/datasets");
  return data.datasets;
}

export async function startTraining(datasetId: string, modelName: string): Promise<{ training_job_id: string }> {
  const { data } = await api.post("/enterprise/train", { dataset_id: datasetId, model_name: modelName });
  return data;
}

export async function getTrainingJob(jobId: string): Promise<TrainingJobStatus> {
  const { data } = await api.get<TrainingJobStatus>(`/enterprise/training-jobs/${jobId}`);
  return data;
}

export async function listModels(): Promise<ModelSummary[]> {
  const { data } = await api.get<{ models: ModelSummary[] }>("/enterprise/models");
  return data.models;
}

export async function activateModel(modelId: string): Promise<ModelSummary> {
  const { data } = await api.post<ModelSummary>(`/enterprise/models/${modelId}/activate`);
  return data;
}

export async function getEnterpriseDashboard(): Promise<EnterpriseDashboard> {
  const { data } = await api.get<EnterpriseDashboard>("/enterprise/dashboard");
  return data;
}

export async function listOrgUsers(): Promise<OrgUser[]> {
  const { data } = await api.get<{ users: OrgUser[] }>("/enterprise/users");
  return data.users;
}

export async function addOrgUser(email: string, password: string, role: string): Promise<OrgUser> {
  const { data } = await api.post<OrgUser>("/enterprise/users", { email, password, role });
  return data;
}

export async function updateOrgUser(userId: string, patch: { status?: string; role?: string }): Promise<OrgUser> {
  const { data } = await api.patch<OrgUser>(`/enterprise/users/${userId}`, null, { params: patch });
  return data;
}

export async function getAuditLog(): Promise<AuditEvent[]> {
  const { data } = await api.get<{ events: AuditEvent[] }>("/enterprise/audit-log");
  return data.events;
}
