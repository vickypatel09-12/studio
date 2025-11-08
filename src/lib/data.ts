export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive';
};

export const customers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Ramesh Patel',
    email: 'ramesh@example.com',
    phone: '9876543210',
    address: '123, Gandhi Road, Ahmedabad',
    joinDate: '2023-01-15',
    status: 'active',
  },
  {
    id: 'CUST-002',
    name: 'Sita Sharma',
    email: 'sita@example.com',
    phone: '9876543211',
    address: '456, Nehru Marg, Surat',
    joinDate: '2023-02-20',
    status: 'active',
  },
  {
    id: 'CUST-003',
    name: 'Amit Singh',
    email: 'amit@example.com',
    phone: '9876543212',
    address: '789, Station Road, Vadodara',
    joinDate: '2023-03-10',
    status: 'inactive',
  },
  {
    id: 'CUST-004',
    name: 'Priya Mehta',
    email: 'priya@example.com',
    phone: '9876543213',
    address: '101, Palace Road, Rajkot',
    joinDate: '2023-04-05',
    status: 'active',
  },
  {
    id: 'CUST-005',
    name: 'Vijay Shah',
    email: 'vijay@example.com',
    phone: '9876543214',
    address: '212, M.G. Road, Bhavnagar',
    joinDate: '2023-05-12',
    status: 'active',
  },
];

export type Transaction = {
  id: string;
  customerName: string;
  customerEmail: string;
  type: 'Deposit' | 'Loan Given' | 'Loan Repayment';
  amount: number;
  date: string;
};

export const transactions: Transaction[] = [
  {
    id: 'TXN-001',
    customerName: 'Ramesh Patel',
    customerEmail: 'ramesh@example.com',
    type: 'Deposit',
    amount: 5000,
    date: '2024-07-28',
  },
  {
    id: 'TXN-002',
    customerName: 'Sita Sharma',
    customerEmail: 'sita@example.com',
    type: 'Loan Given',
    amount: 25000,
    date: '2024-07-27',
  },
  {
    id: 'TXN-003',
    customerName: 'Priya Mehta',
    customerEmail: 'priya@example.com',
    type: 'Deposit',
    amount: 2000,
    date: '2024-07-26',
  },
  {
    id: 'TXN-004',
    customerName: 'Vijay Shah',
    customerEmail: 'vijay@example.com',
    type: 'Loan Repayment',
    amount: 10000,
    date: '2024-07-25',
  },
  {
    id: 'TXN-005',
    customerName: 'Ramesh Patel',
    customerEmail: 'ramesh@example.com',
    type: 'Deposit',
    amount: 3000,
    date: '2024-07-24',
  },
  {
    id: 'TXN-006',
    customerName: 'Amit Singh',
    customerEmail: 'amit@example.com',
    type: 'Deposit',
    amount: 1500,
    date: '2024-07-23',
  },
];
