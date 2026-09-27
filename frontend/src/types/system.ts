export type ComparisonStatus = 
  | 'UP_TO_DATE' 
  | 'OUTDATED' 
  | 'SYNCHRONIZED' 
  | 'VERSION_MISMATCH' 
  | 'NOT_REPORTED' 
  | 'UNAVAILABLE' 
  | 'UNKNOWN';

export interface GitHubStatus {
  repository: string | null;
  branch: string | null;
  commit: string | null;
  commit_full?: string | null;
  commit_message?: string | null;
  status: 'connected' | 'unavailable';
}

export interface AiStudioStatus {
  commit: string | null;
  commit_full?: string | null;
  build_id: string | null;
  status: 'reported' | 'not_reported' | 'unavailable';
}

export interface LiveComponentStatus {
  status: 'healthy' | 'unhealthy';
  version?: string;
  api_version?: string;
}

export interface LiveServerStatus {
  environment: string;
  commit: string;
  commit_full?: string;
  branch?: string;
  deployed_at: string | null;
  backend: LiveComponentStatus;
  frontend: LiveComponentStatus;
  database: {
    status: 'healthy' | 'unhealthy';
  };
}

export interface SystemStatusComparison {
  github_vs_live: ComparisonStatus;
  backend_vs_frontend: ComparisonStatus;
  github_vs_ai_studio: ComparisonStatus;
}

export interface SystemStatusData {
  environment: string;
  github: GitHubStatus;
  ai_studio: AiStudioStatus;
  live: LiveServerStatus;
  comparison: SystemStatusComparison;
  checked_at: string;
}

export interface SystemStatusResponse {
  success: boolean;
  data: SystemStatusData;
  message?: string;
}
