'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter as UiTableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Printer, Share } from 'lucide-react';
import { AppShell } from '@/components/AppShell';

type Loan = {
  customerId: string;
  carryFwd: number;
  changeType: 'new' | 'increase' | 'decrease';
  changeCash: number;
  changeBank: number;
};

type MonthlyLoanDoc = {
  id: string;
  loans?: Loan[];
  draft?: Loan[];
};

type Allocation = {
  customerId: string;
  allocatedFund: number;
};

function LoanAllocation() {
  const firestore = useFirestore();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [outstandingLoans, setOutstandingLoans] = useState<Map<string, number>>(new Map());
  const [totalFund, setTotalFund] = useState(0);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('sortOrder'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  useEffect(() => {
    if (customers) {
      setAllocations(customers.map(c => ({ customerId: c.id, allocatedFund: 0 })));
    }
  }, [customers]);

  useEffect(() => {
    async function fetchOutstandingLoans() {
      if (!firestore) return;
      const loansCollectionRef = collection(firestore, 'monthlyLoans');
      const loanDocs = await getDocs(query(loansCollectionRef, orderBy('id', 'desc')));
      
      const latestMonthId = loanDocs.docs.length > 0 ? loanDocs.docs[0].id : null;

      if (!latestMonthId) return;

      const latestLoansData = loanDocs.docs[0].data() as MonthlyLoanDoc;
      const latestLoans = latestLoansData?.loans || latestLoansData?.draft || [];

      const loansMap = new Map<string, number>();
      latestLoans.forEach(loan => {
        const changeTotal = (loan.changeCash || 0) + (loan.changeBank || 0);
        let adjustment = 0;
        if (loan.changeType === 'new' || loan.changeType === 'increase') {
          adjustment = changeTotal;
        } else if (loan.changeType === 'decrease') {
          adjustment = -changeTotal;
        }
        const closingLoan = (loan.carryFwd || 0) + adjustment;
        loansMap.set(loan.customerId, closingLoan);
      });
      setOutstandingLoans(loansMap);
    }
    fetchOutstandingLoans();
  }, [firestore]);

  const handleAllocationChange = (customerId: string, value: string) => {
    const numericValue = Number(value) || 0;
    setAllocations(prev =>
      prev.map(alloc =>
        alloc.customerId === customerId ? { ...alloc, allocatedFund: numericValue } : alloc
      )
    );
  };
  
  const handleDistributeEqually = () => {
    if (!customers || customers.length === 0 || totalFund <= 0) {
      return;
    }
    const amountPerCustomer = totalFund / customers.length;
    setAllocations(
      customers.map(c => ({ customerId: c.id, allocatedFund: amountPerCustomer }))
    );
  };

  const totals = useMemo(() => {
    return allocations.reduce(
      (acc, alloc) => {
        const outstanding = outstandingLoans.get(alloc.customerId) || 0;
        const totalPayable = outstanding + alloc.allocatedFund;
        acc.allocatedFund += alloc.allocatedFund;
        acc.outstandingLoan += outstanding;
        acc.totalPayable += totalPayable;
        return acc;
      },
      {
        allocatedFund: 0,
        outstandingLoan: 0,
        totalPayable: 0,
      }
    );
  }, [allocations, outstandingLoans]);

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="printable animate-fade-in-up">
      <CardHeader className="no-print">
        <CardTitle>Loan Allocation</CardTitle>
        <CardDescription>Plan the distribution of funds to customers.</CardDescription>
      </CardHeader>
      <div className="hidden print-only p-6">
        <h1 className="text-2xl font-bold text-center">Loan Allocation Plan</h1>
      </div>
      <CardContent>
        <div className="flex items-end gap-4 mb-6 no-print">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="total-fund">Total Fund to Distribute</Label>
              <Input
                type="number"
                id="total-fund"
                placeholder="Enter total amount"
                value={totalFund || ''}
                onChange={(e) => setTotalFund(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleDistributeEqually} disabled={totalFund <= 0 || !customers || customers.length === 0}>
                <Share className="mr-2 h-4 w-4" />
                Distribute Equally
            </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Sr. No.</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead className="text-right">Allocated Fund</TableHead>
              <TableHead className="text-right">Outstanding Loan</TableHead>
              <TableHead className="text-right">Total Payable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer, index) => {
              const allocation = allocations.find(a => a.customerId === customer.id) || { allocatedFund: 0 };
              const outstanding = outstandingLoans.get(customer.id) || 0;
              const totalPayable = outstanding + allocation.allocatedFund;

              return (
                <TableRow key={customer.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium customer-name-cell">{customer.name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      placeholder="₹0.00"
                      value={allocation.allocatedFund || ''}
                      onChange={e => handleAllocationChange(customer.id, e.target.value)}
                      className="w-full text-right print-hide"
                    />
                     <span className="hidden print-only float-right">{allocation.allocatedFund === 0 ? '-' : allocation.allocatedFund.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{outstanding.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{totalPayable.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <UiTableFooter>
            <TableRow className="font-bold bg-muted/50 text-right">
              <TableCell colSpan={2} className="text-left">Total</TableCell>
              <TableCell>₹{totals.allocatedFund.toFixed(2)}</TableCell>
              <TableCell>₹{totals.outstandingLoan.toFixed(2)}</TableCell>
              <TableCell>₹{totals.totalPayable.toFixed(2)}</TableCell>
            </TableRow>
          </UiTableFooter>
        </Table>
      </CardContent>
       <CardFooter className="flex justify-end gap-2 no-print">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AllocationPage() {
  return (
    <AppShell>
      <LoanAllocation />
    </AppShell>
  );
}
