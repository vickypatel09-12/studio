'use client';
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
import { Printer, Save, Send } from 'lucide-react';
import { customers } from '@/lib/data';

export default function DepositsPage() {
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{customer.name}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
