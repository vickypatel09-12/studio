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
import { Users, Landmark, CircleDollarSign, Activity, Loader2, Percent, Wallet, PiggyBank, University, ArrowDownToDot } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import { format } from 'date-fns';
import { AppShell } from '@/components/AppShell';


type MonthlyDepositDoc = {
  id: string;
  deposits?: {
    customerId: string;
    cash: number;
    bank: number;
  }[];
};

type MonthlyLoanDoc = {
  id: string;
  loans?: {
    customerId: string;
    carryFwd: number;
    changeType: 'new' | 'increase' | 'decrease';
    changeCash: number;
    changeBank: number;
    interestCash: number;
    interestBank: number;
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

  const { 
    totalInflow,
    totalDeposits,
    totalDepositsByCash, 
    totalDepositsByBank,
    outstandingLoans,
    totalInterest, 
    totalInterestByCash, 
    totalInterestByBank, 
    loanGivenByCash, 
    loanGivenByBank, 
    loanRepaidByCash, 
    loanRepaidByBank 
  } = useMemo(() => {
    const depTotals = {
      total: 0,
      cash: 0,
      bank: 0,
    };
    monthlyDeposits?.forEach(month => {
      const monthData = month.deposits || [];
      monthData.forEach(deposit => {
        depTotals.cash += deposit.cash || 0;
        depTotals.bank += deposit.bank || 0;
      });
    });
    depTotals.total = depTotals.cash + depTotals.bank;

    const loanTotals = {
        interest: 0,
        interestCash: 0,
        interestBank: 0,
        loanGivenCash: 0,
        loanGivenBank: 0,
        loanRepaidCash: 0,
        loanRepaidBank: 0,
    };
    monthlyLoans?.forEach(month => {
      const monthData = month.loans || [];
      monthData.forEach(loan => {
        loanTotals.interestCash += loan.interestCash || 0;
        loanTotals.interestBank += loan.interestBank || 0;
        if (loan.changeType === 'new' || loan.changeType === 'increase') {
            loanTotals.loanGivenCash += loan.changeCash || 0;
            loanTotals.loanGivenBank += loan.changeBank || 0;
        } else if (loan.changeType === 'decrease') {
            loanTotals.loanRepaidCash += loan.changeCash || 0;
            loanTotals.loanRepaidBank += loan.changeBank || 0;
        }
      });
    });
    loanTotals.interest = loanTotals.interestCash + loanTotals.interestBank;

    const latestMonth = monthlyLoans?.sort((a,b) => b.id.localeCompare(a.id))[0];
    const latestLoans = latestMonth?.loans || [];
    const outstanding = latestLoans.reduce((total, loan) => {
      const changeTotal = (loan.changeCash || 0) + (loan.changeBank || 0);
      let adjustment = 0;
      if (loan.changeType === 'new' || loan.changeType === 'increase') {
        adjustment = changeTotal;
      } else if (loan.changeType === 'decrease') {
        adjustment = -changeTotal;
      }
      return total + (loan.carryFwd || 0) + adjustment;
    }, 0);

    const totalInflow = depTotals.total + loanTotals.loanRepaidCash + loanTotals.loanRepaidBank + loanTotals.interest;

    return {
      totalInflow,
      totalDeposits: depTotals.total,
      totalDepositsByCash: depTotals.cash,
      totalDepositsByBank: depTotals.bank,
      outstandingLoans: outstanding,
      totalInterest: loanTotals.interest,
      totalInterestByCash: loanTotals.interestCash,
      totalInterestByBank: loanTotals.interestBank,
      loanGivenByCash: loanTotals.loanGivenCash,
      loanGivenByBank: loanTotals.loanGivenBank,
      loanRepaidByCash: loanTotals.loanRepaidCash,
      loanRepaidByBank: loanTotals.loanRepaidBank,
    };
  }, [monthlyDeposits, monthlyLoans]);


  const availableBalance = totalDeposits + totalInterest - outstandingLoans;
  
  const availableCash = totalDepositsByCash + totalInterestByCash + loanRepaidByCash - loanGivenByCash;
  const availableBank = totalDepositsByBank + totalInterestByBank + loanRepaidByBank - loanGivenByBank;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
            <ArrowDownToDot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalInflow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Deposits + Repayments + Interest
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
            <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Across all months
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
              Deposits + Interest - Loans
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{availableCash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total available cash balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Bank Balance</CardTitle>
            <University className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹{availableBank.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total available bank balance
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
