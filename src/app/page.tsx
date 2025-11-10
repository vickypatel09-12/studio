'use client';

import { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Landmark, CircleDollarSign, Activity, Loader2, Percent, Wallet } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import { format } from 'date-fns';
import { AppShell } from '@/components/AppShell';


type MonthlyDepositDoc = {
  id: string;
  deposits: {
    customerId: string;
    cash: number;
    bank: number;
  }[];
};

type MonthlyLoanDoc = {
  id: string;
  loans: {
    customerId: string;
    carryFwd: number;
    changeType: 'new' | 'increase' | 'decrease';
    changeCash: number;
    changeBank: number;
    interestTotal: number;
  }[];
};

type Transaction = {
  id: string;
  customerName: string;
  type: 'Deposit' | 'Loan Given' | 'Loan Repayment';
  amount: number;
  date: string;
};


function Dashboard() {
  const firestore = useFirestore();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'));
  }, [firestore]);

  const depositsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'monthlyDeposits'));
  }, [firestore]);

  const loansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'monthlyLoans'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: monthlyDeposits, isLoading: depositsLoading } = useCollection<MonthlyDepositDoc>(depositsQuery);
  const { data: monthlyLoans, isLoading: loansLoading } = useCollection<MonthlyLoanDoc>(loansQuery);
  
  const isLoading = customersLoading || depositsLoading || loansLoading;

  const totalDeposits = useMemo(() => {
    return monthlyDeposits?.reduce((total, month) => {
      const monthData = month.deposits || [];
      return total + monthData.reduce((monthTotal, deposit) => {
        return monthTotal + (deposit.cash || 0) + (deposit.bank || 0);
      }, 0);
    }, 0) ?? 0;
  }, [monthlyDeposits]);

  const outstandingLoans = useMemo(() => {
     if (!monthlyLoans || monthlyLoans.length === 0) return 0;
    // Find the most recent loan entry to calculate the latest outstanding balance
    const latestMonth = monthlyLoans.sort((a,b) => b.id.localeCompare(a.id))[0];
    const latestLoans = latestMonth.loans || [];

    return latestLoans.reduce((total, loan) => {
      const changeTotal = (loan.changeCash || 0) + (loan.changeBank || 0);
      let adjustment = 0;
      if (loan.changeType === 'new' || loan.changeType === 'increase') {
        adjustment = changeTotal;
      } else if (loan.changeType === 'decrease') {
        adjustment = -changeTotal;
      }
      return total + (loan.carryFwd || 0) + adjustment;
    }, 0)

  }, [monthlyLoans]);

  const totalInterest = useMemo(() => {
    return monthlyLoans?.reduce((total, month) => {
      const monthData = month.loans || [];
      return total + monthData.reduce((monthTotal, loan) => {
        return monthTotal + (loan.interestTotal || 0);
      }, 0);
    }, 0) ?? 0;
  }, [monthlyLoans]);

  const netBalance = totalDeposits + totalInterest;
  const availableBalance = totalDeposits - outstandingLoans;

  const depositToLoanRatio = outstandingLoans > 0 ? (totalDeposits / outstandingLoans) : 0;
  const financialHealth = depositToLoanRatio >= 1.2 ? 'Good' : (depositToLoanRatio > 0.8 ? 'Fair' : 'Poor');

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDeposits.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Across all months
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Loans
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{outstandingLoans.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Based on the latest month
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{availableBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total Deposits - Outstanding Loans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total customers in system
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  )
}
