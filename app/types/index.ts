// Common types used throughout the application

export interface ApiError {
  error: string;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Date parsing utility types
export type DateInput = string | Date | number | null | undefined;

// CSV utility types
export type CSVRow = string[];
export type CSVData = CSVRow[];

// Database query types
export interface DatabaseWhereClause {
  deletedAt?: null | { not: null };
  [key: string]: unknown;
}

// Presence entry types
export interface PresenceEntry {
  id: number;
  clientId: number;
  time: Date;
}

export interface PresenceWithClient {
  id: number;
  clientId: number;
  clientName: string;
  timeISO: string;
}

// Error handling types
export type ErrorHandler = (error: Error) => void;

// Form event types
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type TextareaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;

// Utility function types
export type DateFormatter = (date: DateInput) => string;
export type CSVFormatter = (data: CSVData) => string;
export type CellFormatter = (value: unknown) => string;
export type SafeStringFormatter = (value: unknown) => string;
