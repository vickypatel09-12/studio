'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, subMonths } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type MonthlyDepositDoc = {
  deposits?: { cash: number; bank: number }[];
};

type Loan = {
  carryFwd: number;
  changeType: 'new' | 'increase' | 'decrease';
  changeCash: number;
  changeBank: number;
};

type MonthlyLoanDoc = {
  loans?: Loan[];
};

const getMonthId = (date: Date) => format(date, 'yyyy-MM');

const calculateClosingBalance = (loan: Loan) => {
  const changeTotal = (loan.changeCash || 0) + (loan.changeBank || 0);
  let adjustment = 0;
  if (loan.changeType === 'new' || loan.changeType === 'increase') {
    adjustment = changeTotal;
  } else if (loan.changeType === 'decrease') {
    adjustment = -changeTotal;
  }
  return (loan.carryFwd || 0) + adjustment;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(value);
};

export function BalanceSummary({ selectedDate }: { selectedDate: Date }) {
  const firestore = useFirestore();
  const [summary, setSummary] = useState({
    prevNetBalance: 0,
    currentDeposits: 0,
    loanGiven: 0,
    loanRepaid: 0,
    liveBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!firestore || !selectedDate) return;
      setIsLoading(true);

      const prevMonth = subMonths(selectedDate, 1);
      const prevMonthId = getMonthId(prevMonth);
      const currentMonthId = getMonthId(selectedDate);

      const prevDepositRef = doc(firestore, 'monthlyDeposits', prevMonthId);
      const prevLoanRef = doc(firestore, 'monthlyLoans', prevMonthId);
      const currentDepositRef = doc(
        firestore,
        'monthlyDeposits',
        currentMonthId
      );
      const currentLoanRef = doc(firestore, 'monthlyLoans', currentMonthId);

      try {
        const [
          prevDepositSnap,
          prevLoanSnap,
          currentDepositSnap,
          currentLoanSnap,
        ] = await Promise.all([
          getDoc(prevDepositRef),
          getDoc(prevLoanRef),
          getDoc(currentDepositRef),
          getDoc(currentLoanRef),
        ]);

        // Previous Month Calculations
        const prevDepositsData = prevDepositSnap.exists()
          ? (prevDepositSnap.data() as MonthlyDepositDoc)
          : null;
        const prevLoansData = prevLoanSnap.exists()
          ? (prevLoanSnap.data() as MonthlyLoanDoc)
          : null;

        const prevTotalDeposits =
          prevDepositsData?.deposits?.reduce(
            (sum, d) => sum + (d.cash || 0) + (d.bank || 0),
            0
          ) ?? 0;

        const prevOutstandingLoans =
          prevLoansData?.loans?.reduce(
            (sum, l) => sum + calculateClosingBalance(l),
            0
          ) ?? 0;

        const prevNetBalance = prevTotalDeposits - prevOutstandingLoans;

        // Current Month Calculations
        const currentDepositsData = currentDepositSnap.exists()
          ? (currentDepositSnap.data() as MonthlyDepositDoc)
          : null;
        const currentLoansData = currentLoanSnap.exists()
          ? (currentLoanSnap.data() as MonthlyLoanDoc)
          : null;

        const currentDeposits =
          currentDepositsData?.deposits?.reduce(
            (sum, d) => sum + (d.cash || 0) + (d.bank || 0),
            0
          ) ?? 0;

        let loanGiven = 0;
        let loanRepaid = 0;
        currentLoansData?.loans?.forEach((l) => {
          const changeTotal = (l.changeCash || 0) + (l.changeBank || 0);
          if (l.changeType === 'new' || l.changeType === 'increase') {
            loanGiven += changeTotal;
          } else if (l.changeType === 'decrease') {
            loanRepaid += changeTotal;
          }
        });

        const liveBalance =
          prevNetBalance + currentDeposits - loanGiven + loanRepaid;

        setSummary({
          prevNetBalance,
          currentDeposits,
          loanGiven,
          loanRepaid,
          liveBalance,
        });
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, [selectedDate, firestore]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
           <CardDescription>
            For {format(selectedDate, 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>
          Live balance for {format(selectedDate, 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Prev. Net Balance
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(summary.prevNetBalance)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Current Deposits
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(summary.currentDeposits)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Loan Given
            </p>
            <p className="text-lg font-bold text-red-600">
              -{formatCurrency(summary.loanGiven)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Loan Repaid
            </p>
            <p className="text-lg font-bold text-green-600">
              +{formatCurrency(summary.loanRepaid)}
            </p>
          </div>
           <div className="col-span-2 rounded-lg border bg-muted/50 p-4 md:col-span-1">
            <p className="text-sm font-medium">Live Available Balance</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(summary.liveBalance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
