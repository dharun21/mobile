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
  payment_status: 'paid' | 'unpaid';
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
}

export interface ChatConversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  suggested_questions?: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  is_read: boolean;
  created_at: string;
}
