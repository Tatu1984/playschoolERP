/** A camera as presented to a parent in the portal. */
export interface ParentCameraDTO {
  id: string;
  name: string;
  classroomName: string | null;
  branchName: string;
  streamPath: string;
  /** True when the current time is inside the branch's school-hours window. */
  liveNow: boolean;
}

export interface ViewTokenResponse {
  token: string;
  streamPath: string;
  whepUrl: string; // full WHEP endpoint for the browser
  expiresInSeconds: number;
}

/** Result of an access decision (used for logging + responses). */
export interface AccessDecision {
  allowed: boolean;
  reason: string;
}
