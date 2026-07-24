/**
 * GitHub integration module.
 *
 * Provides authentication (JWT + installation tokens), Check Run API
 * operations, and PR comment management for the ZEN Quality Gate.
 *
 * @module
 */

export {
  generateAppJwt,
  getInstallationToken,
  getAuthenticatedToken,
  GitHubAuthError,
} from "./auth.js";

export {
  createCheckRun,
  updateCheckRun,
  getCheckRun,
  reportCheckRun,
  buildCheckOutput,
  CheckRunError,
} from "./checks.js";

export {
  createComment,
  updateComment,
  listComments,
  findZenComment,
  upsertZenComment,
  formatQualityReport,
  CommentError,
} from "./comments.js";

export type {
  GitHubAppConfig,
  InstallationToken,
  CheckRunStatus,
  CheckRunConclusion,
  AnnotationLevel,
  CheckAnnotation,
  CheckRunOutput,
  CheckRunImage,
  CheckRunAction,
  CreateCheckRunParams,
  UpdateCheckRunParams,
  CheckRun,
  PullRequestComment,
  CreateCommentParams,
  UpdateCommentParams,
  PullRequestEvent,
  CheckSummary,
  QualityReportData,
} from "./types.js";
