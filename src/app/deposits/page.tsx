'use client';
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Printer, Save, Send, Trash2 } from 'lucide-react';
import { customers } from '@/lib/data';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type DepositRow = {
  id: number;
  customerName: string;
  depositAmount: string;
  paymentMethod: string;
};

export default function DepositsPage() {
  const [rows, setRows] = useState<DepositRow[]>([
    { id: Date.now(), customerName: '', depositAmount: '', paymentMethod: '' },
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        customerName: '',
        depositAmount: '',
        paymentMethod: '',
      },
    ]);
  };

  const removeRow = (id: number) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Monthly Deposits</CardTitle>
          <CardDescription>
            Enter monthly deposit details for the selected period.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select defaultValue="july-2024">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="july-2024">July 2024</SelectItem>
              <SelectItem value="june-2024">June 2024</SelectItem>
              <SelectItem value="may-2024">May 2024</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="w-full"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="secondary" className="w-full">
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            <Button className="w-full">
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Sr. No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead className="w-[200px]">Deposit Amount</TableHead>
                <TableHead className="w-[200px]">Payment Method</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" placeholder="₹0.00" />
                  </TableCell>
                  <TableCell>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button variant="outline" onClick={addRow} className="mt-4 w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Row
        </Button>
      </CardContent>
    </Card>
  );
}
