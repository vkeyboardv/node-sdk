/**
 * @internal
 */
export enum ApiKeyResolvingStrategy {
  Environment = 'env',
  Context = 'ctx',
  Event = 'event',
  Fallback = 'fallback',
}

export enum AssetType {
  Program = 'program',
  Well = 'well',
  Rig = 'rig',
}

export enum AttributeType {
  AssetProgram = 'Asset::Program',
  AssetWell = 'Asset::Well',
  AssetRig = 'Asset::Rig',
}

export enum DataType {
  Asset = 'asset',
  Company = 'company',
}

export enum DatasetType {
  Depth = 'depth',
  Time = 'time',
}

export enum FilteringMode {
  Timestamp = 'timestamp',
  Depth = 'depth',
}

export enum LoggerFormat {
  Json = 'json',
  Text = 'text',
}

export enum LogType {
  Time = 'time',
  Depth = 'depth',
}

export enum SchedulerType {
  NaturalTime = 1,
  DataTime = 2,
  Depth = 4,
}

export enum SourceType {
  Drilling = 'drilling',
  Lithology = 'lithology',
  Drillout = 'drillout',
  Frac = 'frac',
  Pumpdown = 'pumpdown',
  Wireline = 'wireline',
}

export enum AssetStatus {
  Active = 'active',
  Complete = 'complete',
  Paused = 'paused',
  Idle = 'idle',
  Unknown = 'unknown',
}

export enum AssetVisibility {
  Visible = 'visible',
  VisibleToAdmin = 'visible_to_admin',
  Hidden = 'hidden',
}

export enum RigClassification {
  Land = 'land',
  Platform = 'platform',
  Floating = 'floating',
}

export enum TaskStatus {
  Fail = 'fail',
  Success = 'success',
}

export enum TaskState {
  Running = 'running',
  Failed = 'failed',
  Succeeded = 'succeeded',
}
