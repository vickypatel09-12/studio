'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLiveData } from '@/context/LiveDataContext';

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

export function BalanceSummary() {
  const firestore = useFirestore();
  const { liveMonthId, deposits, loans } = useLiveData();

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

  const { totalCredited, outstandingLoans, availableBalance, monthLabel, availableCash, availableBank } = useMemo(() => {
    
    // Start with DB data
    const combinedDeposits: MonthlyDepositDoc[] = allDbDeposits ? JSON.parse(JSON.stringify(allDbDeposits)) : [];
    if (liveMonthId && deposits && deposits.length > 0) {
        const existingIndex = combinedDeposits.findIndex(d => d.id === liveMonthId);
        const liveData = { id: liveMonthId, deposits: deposits, draft: deposits };
        if (existingIndex > -1) {
            // Replace DB data for the live month with live data
            combinedDeposits[existingIndex] = liveData;
        } else {
            // Add new month's live data
            combinedDeposits.push(liveData);
        }
    }
    
    const combinedLoans: MonthlyLoanDoc[] = allDbLoans ? JSON.parse(JSON.stringify(allDbLoans)) : [];
    if (liveMonthId && loans && loans.length > 0) {
        const existingIndex = combinedLoans.findIndex(l => l.id === liveMonthId);
        const liveData = { id: liveMonthId, loans: loans, draft: loans };
         if (existingIndex > -1) {
            combinedLoans[existingIndex] = liveData;
        } else {
            combinedLoans.push(liveData);
        }
    }


    const allTimeTotals = {
      deposits: { cash: 0, bank: 0, total: 0 },
      interest: { cash: 0, bank: 0, total: 0 },
      repayments: { cash: 0, bank: 0, total: 0 },
      loansGiven: { cash: 0, bank: 0, total: 0 },
    };

    // Calculate historical totals for deposits
    combinedDeposits.forEach((month) => {
      const data = month.deposits || month.draft || [];
      data.forEach((deposit) => {
        allTimeTotals.deposits.cash += deposit.cash || 0;
        allTimeTotals.deposits.bank += deposit.bank || 0;
      });
    });
    allTimeTotals.deposits.total = allTimeTotals.deposits.cash + allTimeTotals.deposits.bank;

    // Calculate historical totals for interest, repayments, and loans given
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
    allTimeTotals.interest.total = allTimeTotals.interest.cash + allTimeTotals.interest.bank;
    allTimeTotals.repayments.total = allTimeTotals.repayments.cash + allTimeTotals.repayments.bank;
    allTimeTotals.loansGiven.total = allTimeTotals.loansGiven.cash + allTimeTotals.loansGiven.bank;

    
    // Calculate total outstanding loans from the latest month available
    const latestMonth = combinedLoans?.sort((a, b) => b.id.localeCompare(a.id))[0];
    const latestLoans = latestMonth?.loans || latestMonth?.draft || [];
    const outstandingLoansValue = latestLoans.reduce((total, loan) => {
      const changeTotal = (loan.changeCash || 0) + (loan.changeBank || 0);
      let adjustment = 0;
      if (loan.changeType === 'new' || loan.changeType === 'increase') {
        adjustment = changeTotal;
      } else if (loan.changeType === 'decrease') {
        adjustment = -changeTotal;
      }
      return total + (loan.carryFwd || 0) + adjustment;
    }, 0);


    // Final calculation for total credited (all deposits + all repayments + all interest)
    const totalCredited = {
      cash: allTimeTotals.deposits.cash + allTimeTotals.repayments.cash + allTimeTotals.interest.cash,
      bank: allTimeTotals.deposits.bank + allTimeTotals.repayments.bank + allTimeTotals.interest.bank,
      total: 0,
    };
    totalCredited.total = totalCredited.cash + totalCredited.bank;

    
    const availableBalanceValue = totalCredited.total - outstandingLoansValue;
    const availableCashValue = totalCredited.cash - allTimeTotals.loansGiven.cash;
    const availableBankValue = totalCredited.bank - allTimeTotals.loansGiven.bank;
    
    let monthLabel = 'All-time financial overview';
    if(liveMonthId) {
        try {
            // Ensure the date is parsed correctly, assuming UTC to avoid timezone issues
             const [year, month] = liveMonthId.split('-').map(Number);
             const date = new Date(year, month - 1);
             monthLabel = `Live balance including ${format(date, 'MMMM yyyy')}`;
        } catch(e) { 
           monthLabel = 'Live balance including current month';
        }
    }


    return { 
        totalCredited, 
        outstandingLoans: outstandingLoansValue, 
        availableBalance: availableBalanceValue, 
        availableCash: availableCashValue,
        availableBank: availableBankValue,
        monthLabel 
    };
  }, [allDbDeposits, allDbLoans, liveMonthId, deposits, loans]);
  
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
              Outstanding Loans
            </h3>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(outstandingLoans)}
            </p>
             <p className="text-sm text-muted-foreground">
              Total amount currently on loan
            </p>
          </div>
          <div className="rounded-lg border bg-primary/10 p-4">
            <h3 className="font-semibold text-primary">
              Available Balance
            </h3>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatCurrency(availableBalance)}
            </p>
            <p className="text-sm text-primary/80">
             Cash: {formatCurrency(availableCash)}
            </p>
            <p className="text-sm text-primary/80">
             Bank: {formatCurrency(availableBank)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
