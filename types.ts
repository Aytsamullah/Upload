
export enum UserRole {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
  GUEST = 'GUEST'
}

export interface MedicalFile {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Treatment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  timestamp: string;
  diagnosis: string;
  medication: string;
  notes: string;
  files?: MedicalFile[];
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  cnic?: string; 
  isVerified?: boolean;
}

export interface PatientProfile extends User {
  medicalHistory: string[];
  treatments: Treatment[];
}

export interface PendingSignup {
  name: string;
  email: string;
  cnic: string;
  otp: string;
  attempts: number;
  expiresAt: number;
}
