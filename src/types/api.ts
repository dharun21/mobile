export interface ApiUser {
  id: string;
  name: string;
  email: string;
  specialists: string[];
  is_admin: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface FinanceWorkspace {
  id?: string;
  business_name: string;
  business_type?: 'Retail' | 'Corporate' | null;
  industry?: string | null;
  country?: string | null;
  currency: string;
  workflows?: string[];
  sources?: string[];
  size?: string | null;
  financial_year?: string | null;
  payment_terms?: string | null;
  approval_limit?: string | null;
  reviewer?: string | null;
  categories?: string | null;
  completed?: boolean;
}

export interface FinanceRecord {
  id: string;
  document_id: string;
  record_type: string;
  counterparty?: string | null;
  reference_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  subtotal?: string | number | null;
  tax_total?: string | number | null;
  total_amount?: string | number | null;
  status: string;
  payment_status: 'paid' | 'partial' | 'unpaid';
  amount_paid: string | number;
  balance_due: string | number | null;
  paid_at?: string | null;
  reminder_date?: string | null;
  review_notes?: string[];
}

export interface FinanceDocument {
  id: string;
  original_name: string;
  extension: string;
  content_type?: string | null;
  size_bytes: number;
  status: string;
  created_at: string;
}

export interface FinanceStatement {
  id: string;
  document_id: string;
  document_name: string;
  institution_name?: string | null;
  transaction_count: number;
  status: string;
  created_at: string;
}

export interface PayrollOverview {
  employee_count: number;
  draft_payslips: number;
  finalized_unpaid_payslips: number;
  pending_reimbursements: number;
  approved_unpaid_reimbursements: number;
  confirmed_unpaid_taxes: number;
  currency: string;
  next_payroll_amount: string | number;
  basis_note: string;
}

export interface PayrollPayslip {
  id: string;
  employee_name: string;
  employee_code: string;
  period_end: string;
  currency: string;
  cash_to_employee: string | number;
  status: 'draft' | 'finalized' | 'paid';
}

export interface FinanceOverview {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  records_needing_attention: FinanceRecord[];
  outstanding_invoices: FinanceRecord[];
  overdue_invoices: FinanceRecord[];
  overdue_bills: FinanceRecord[];
  bills_due_soon: FinanceRecord[];
  basis_note: string;
  data_completeness_note?: string | null;
  focus?: {
    business_type: 'retail' | 'corporate' | 'general';
    as_of: string;
    balances: Record<string, { currency: string; amount: string; count: number }[]>;
    aging: Record<string, { currency: string; bucket: string; label: string; amount: string; count: number }[]>;
    concentration: Record<string, { name: string; currency: string; amount: string; share_percent: string; record_count: number }[]>;
    missing_counterparty_counts: Record<string, number>;
    missing_data: { title: string; detail: string }[];
    basis_note: string;
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  domain: ChatDomain;
  updated_at: string;
}

export type ChatDomain = 'general' | 'finance_analyst' | 'personal_finance' | 'personal_assistant' | 'hr_executive' | 'sales_analyst';

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  message_type?: string;
  suggested_questions?: string[];
  metadata?: {
    engine?: string;
    sources?: { title: string; url: string }[];
    [key: string]: unknown;
  } | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  is_read: boolean;
  created_at: string;
}
