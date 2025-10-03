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

// Client types
export interface Client {
  id: number;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  dateOfBirth?: Date | null;
  nationalId?: string | null;
  registrationDate?: Date | null;
  subscriptionPeriod?: string | null;
  hasPromotion?: boolean;
  promotionPeriod?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Payment types
export interface Payment {
  id: number;
  clientId: number;
  amount: number;
  paymentDate: Date;
  nextPaymentDate: Date;
  subscriptionPeriod: string;
  notes?: string | null;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Client History types
export interface ClientHistory {
  id: number;
  clientId: number;
  action: string;
  changes?: string | null;
  createdAt: Date;
}

// Presence entry types
export interface PresenceEntry {
  id: number;
  clientId: number;
  time: Date;
}

export interface Presence {
  id: number;
  clientId: number;
  time: Date;
  createdAt: Date;
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
