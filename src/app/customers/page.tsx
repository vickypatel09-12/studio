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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  FileDown,
  FileUp,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { customers as initialCustomers, type Customer } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleExportTemplate = () => {
    const headers = 'id,name,email,phone,address,joinDate,status\n';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          const headers = lines[0].split(',').map(h => h.trim());
          const newCustomers: Customer[] = lines.slice(1).map((line) => {
            const values = line.split(',');
            const customerData: any = {};
            headers.forEach((header, index) => {
                customerData[header] = values[index].trim();
            });
             if (!customerData.id || !customerData.name) {
                throw new Error('CSV must contain "id" and "name" columns.');
            }
            return customerData as Customer;
          });
          setCustomers(prev => [...prev, ...newCustomers]);
          toast({ title: 'Success', description: 'Customers imported successfully.' });
          setIsImporting(false);
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDelete = (customerId: string) => {
    setCustomers(customers.filter(c => c.id !== customerId));
    toast({ title: 'Customer Deleted', description: `Customer ${customerId} has been removed.`});
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Manage your customer profiles and view their status.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImporting(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium">{customer.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {customer.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.status === 'active' ? 'default' : 'secondary'
                      }
                      className={
                        customer.status === 'active'
                          ? 'bg-accent text-accent-foreground'
                          : ''
                      }
                    >
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.joinDate}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDelete(customer.id)} className='text-destructive focus:text-destructive'>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
            <DialogDescription>
              Upload a CSV file to add new customers. Email and phone are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input type="file" accept=".csv" onChange={handleImport} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleExportTemplate}>
              Download Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
