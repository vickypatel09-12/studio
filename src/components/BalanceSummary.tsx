'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type Deposit = { customerId: string; cash: number; bank: number };
type MonthlyDepositDoc = {
  id: string; // yyyy-MM
  deposits?: Deposit[];
  draft?: Deposit[];
};

type Loan = {
  customerId: string;
  carryFwd: number;
  changeType: 'new' | 'increase' | 'decrease';
  changeCash: number;
  changeBank: number;
  interestCash: number;
  interestBank: number;
  interestTotal: number;
};
type MonthlyLoanDoc = {
  id: string; // yyyy-MM
  loans?: Loan[];
  draft?: Loan[];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface BalanceSummaryProps {
  selectedMonthId: string | null;
  liveDeposits?: Deposit[];
  liveLoans?: Loan[];
}

export function BalanceSummary({ selectedMonthId, liveDeposits, liveLoans }: BalanceSummaryProps) {
  const firestore = useFirestore();

  const depositsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'monthlyDeposits')) : null),
    [firestore]
  );
  const loansQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'monthlyLoans')) : null),
    [firestore]
  );

  const { data: allDbDeposits, isLoading: depositsLoading } =
    useCollection<MonthlyDepositDoc>(depositsQuery);
  const { data: allDbLoans, isLoading: loansLoading } =
    useCollection<MonthlyLoanDoc>(loansQuery);

  const { totalCredited, totalDebit, availableBalance, monthLabel } = useMemo(() => {
    
    // Combine DB data with live data for a real-time view
    const combinedDeposits: MonthlyDepositDoc[] = [...(allDbDeposits || [])];
    if (selectedMonthId && liveDeposits) {
        const existingIndex = combinedDeposits.findIndex(d => d.id === selectedMonthId);
        const liveData = { id: selectedMonthId, deposits: liveDeposits };
        if (existingIndex > -1) {
            combinedDeposits[existingIndex] = liveData;
        } else {
            combinedDeposits.push(liveData);
        }
    }
    
    const combinedLoans: MonthlyLoanDoc[] = [...(allDbLoans || [])];
    if (selectedMonthId && liveLoans) {
        const existingIndex = combinedLoans.findIndex(l => l.id === selectedMonthId);
        const liveData = { id: selectedMonthId, loans: liveLoans };
         if (existingIndex > -1) {
            combinedLoans[existingIndex] = liveData;
        } else {
            combinedLoans.push(liveData);
        }
    }


    const allTimeTotals = {
      deposits: { cash: 0, bank: 0 },
      repayments: { cash: 0, bank: 0 },
      interest: { cash: 0, bank: 0 },
      loansGiven: { cash: 0, bank: 0 },
    };

    // Calculate historical totals
    combinedDeposits.forEach((month) => {
      const data = month.deposits || month.draft || [];
      data.forEach((deposit) => {
        allTimeTotals.deposits.cash += deposit.cash || 0;
        allTimeTotals.deposits.bank += deposit.bank || 0;
      });
    });

    combinedLoans.forEach((month) => {
      const data = month.loans || month.draft || [];
      data.forEach((loan) => {
        allTimeTotals.interest.cash += loan.interestCash || 0;
        allTimeTotals.interest.bank += loan.interestBank || 0;
        if (loan.changeType === 'decrease') {
          allTimeTotals.repayments.cash += loan.changeCash || 0;
          allTimeTotals.repayments.bank += loan.changeBank || 0;
        } else if (loan.changeType === 'new' || loan.changeType === 'increase') {
          allTimeTotals.loansGiven.cash += loan.changeCash || 0;
          allTimeTotals.loansGiven.bank += loan.changeBank || 0;
        }
      });
    });

    // Final calculation
    const totalCredited = {
      cash:
        allTimeTotals.deposits.cash +
        allTimeTotals.repayments.cash +
        allTimeTotals.interest.cash,
      bank:
        allTimeTotals.deposits.bank +
        allTimeTotals.repayments.bank +
        allTimeTotals.interest.bank,
      total: 0,
    };
    totalCredited.total = totalCredited.cash + totalCredited.bank;

    const totalDebit = {
      cash: allTimeTotals.loansGiven.cash,
      bank: allTimeTotals.loansGiven.bank,
      total: allTimeTotals.loansGiven.cash + allTimeTotals.loansGiven.bank,
    };
    
    const availableBalance = {
        cash: totalCredited.cash - totalDebit.cash,
        bank: totalCredited.bank - totalDebit.bank,
        total: totalCredited.total - totalDebit.total
    };
    
    let monthLabel = 'All-time financial overview';
    if(selectedMonthId) {
        try {
            // Ensure the date is parsed correctly, assuming UTC to avoid timezone issues
            const date = new Date(selectedMonthId);
            monthLabel = `Live balance including ${format(date, 'MMMM yyyy')}`;
        } catch(e) { 
           monthLabel = 'Live balance including current month';
        }
    }


    return { totalCredited, totalDebit, availableBalance, monthLabel };
  }, [allDbDeposits, allDbLoans, selectedMonthId, liveDeposits, liveLoans]);
  
  const isLoading = depositsLoading || loansLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            Loading summary...
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
          {monthLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-muted-foreground">
              Total Credited
            </h3>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(totalCredited.total)}
            </p>
            <p className="text-sm text-muted-foreground">
              Cash: {formatCurrency(totalCredited.cash)}
            </p>
            <p className="text-sm text-muted-foreground">
              Bank: {formatCurrency(totalCredited.bank)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-muted-foreground">
              Total Debit
            </h3>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(totalDebit.total)}
            </p>
            <p className="text-sm text-muted-foreground">
              Cash: {formatCurrency(totalDebit.cash)}
            </p>
            <p className="text-sm text-muted-foreground">
              Bank: {formatCurrency(totalDebit.bank)}
            </p>
          </div>
          <div className="rounded-lg border bg-primary/10 p-4">
            <h3 className="font-semibold text-primary">
              Available Balance for Loan
            </h3>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatCurrency(availableBalance.total)}
            </p>
            <p className="text-sm text-primary/80">
              Cash: {formatCurrency(availableBalance.cash)}
            </p>
            <p className="text-sm text-primary/80">
              Bank: {formatCurrency(availableBalance.bank)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
