export interface ApplicationStatusChangedEvent {
  applicationId: string;
  jobId: string;
  applicantId: string;
  employerId: string;
  status: string;
  timestamp: string;
}
