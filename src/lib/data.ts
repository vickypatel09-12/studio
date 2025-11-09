export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  sortOrder?: number;
};

export type Transaction = {
  id: string;
  customerName: string;
  customerEmail: string;
  type: 'Deposit' | 'Loan Given' | 'Loan Repayment';
  amount: number;
  date: string;
};
