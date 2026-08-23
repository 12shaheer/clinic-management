export type UserRole = "admin" | "receptionist" | "physiotherapist";

export type PatientStatus = "active" | "inactive" | "discharged";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "cancelled";

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "online" | "other";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  status: PatientStatus;
  created_at: string;
  updated_at: string;
}

export interface Physiotherapist {
  id: string;
  physio_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  appointment_code: string;
  patient_id: string;
  physiotherapist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  patients?: { first_name: string; last_name: string; patient_code: string };
  physiotherapists?: { first_name: string; last_name: string };
}

export interface Invoice {
  id: string;
  invoice_code: string;
  patient_id: string;
  appointment_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  issued_at: string;
  created_at: string;
  updated_at: string;
  patients?: { first_name: string; last_name: string; patient_code: string };
}

export interface Payment {
  id: string;
  payment_code: string;
  patient_id: string;
  invoice_id: string;
  appointment_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_reference: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  patients?: { first_name: string; last_name: string; patient_code: string };
}

export interface ClinicUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}
