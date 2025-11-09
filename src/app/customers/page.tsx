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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PlusCircle,
  FileDown,
  FileUp,
  MoreHorizontal,
  Trash2,
  Pencil,
  Loader2,
  Import,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import { AppShell } from '@/components/AppShell';

function Customers() {
  const firestore = useFirestore();
  const [isImporting, setIsImporting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const { toast } = useToast();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'));
  }, [firestore]);

  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const handleExport = () => {
    if (!customers || customers.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'No customers to export.'});
        return;
    }
    const headers = 'name,email,phone,address,notes\n';
    const csvContent = customers.map(c => `${c.name},${c.email || ''},${c.phone || ''},${c.address || ''},${c.notes || ''}`).join('\n');
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customers.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore) return;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          if (lines.length <= 1) {
             toast({ variant: 'destructive', title: 'Import Failed', description: 'CSV file is empty or contains only headers.' });
             return;
          }
          const headers = lines[0].split(',').map(h => h.trim());
          if (!headers.includes('name')) {
            throw new Error('CSV must contain a "name" column.');
          }

          const customerCollection = collection(firestore, 'customers');
          lines.slice(1).forEach((line) => {
            const values = line.split(',');
            const customerData: any = {};
            headers.forEach((header, index) => {
                customerData[header] = values[index]?.trim() || '';
            });
             addDocumentNonBlocking(customerCollection, {
                name: customerData.name,
                email: customerData.email || '',
                phone: customerData.phone || '',
                address: customerData.address || '',
                notes: customerData.notes || '',
            });
          });
          toast({ title: 'Success', description: 'Customers are being imported.' });
          setIsImporting(false);
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        }
      };
      reader.readAsText(file);
    }
  };
  
  const handleImportFromSession = () => {
    toast({
        title: 'Customers are Global',
        description: 'Customer data is not tied to sessions and is always available.',
    });
  }

  const handleDelete = (customerId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'customers', customerId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Customer Deleted', description: `Customer ${customerId} has been removed.`});
  };

  const handleSaveCustomer = () => {
    if (!editingCustomer || !firestore) return;

    const customerData = {
        name: editingCustomer.name,
        email: editingCustomer.email || '',
        phone: editingCustomer.phone || '',
        address: editingCustomer.address || '',
        notes: editingCustomer.notes || '',
    };
    
    if (isNewCustomer) {
        const customerCollection = collection(firestore, 'customers');
        addDocumentNonBlocking(customerCollection, customerData);
        toast({ title: 'Customer Added', description: `${editingCustomer.name} has been added.` });
    } else {
        const docRef = doc(firestore, 'customers', editingCustomer.id);
        updateDocumentNonBlocking(docRef, customerData);
        toast({ title: 'Customer Updated', description: `Details for ${editingCustomer.name} have been saved.` });
    }
    closeDialog();
  }

  const openNewCustomerDialog = () => {
    setIsNewCustomer(true);
    setEditingCustomer({ id: '', name: '', email: '', phone: '', address: '', notes: '' });
  };

  const openEditCustomerDialog = (customer: Customer) => {
    setIsNewCustomer(false);
    setEditingCustomer(customer);
  }

  const closeDialog = () => {
    setEditingCustomer(null);
    setIsNewCustomer(false);
  }

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsImporting(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
             <Button variant="outline" onClick={handleImportFromSession}>
              <Import className="mr-2 h-4 w-4" />
              Import from Session
            </Button>
            <Button onClick={openNewCustomerDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
         {customersLoading ? (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
         ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Sr. No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => openEditCustomerDialog(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
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
         )}
        </CardContent>
      </Card>

      <Dialog open={isImporting} onOpenChange={setIsImporting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Customers from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to add new customers. The file must contain a 'name' column. Email and phone are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input type="file" accept=".csv" onChange={handleImport} />
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingCustomer} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewCustomer ? 'Add New Customer' : 'Edit Customer'}</DialogTitle>
            <DialogDescription>
             {isNewCustomer ? 'Enter the details for the new customer.' : `Update the details for ${editingCustomer?.name}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={editingCustomer?.name || ''} onChange={(e) => setEditingCustomer(c => c ? {...c, name: e.target.value} : null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" value={editingCustomer?.email || ''} onChange={(e) => setEditingCustomer(c => c ? {...c, email: e.target.value} : null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Mobile</Label>
              <Input id="phone" value={editingCustomer?.phone || ''} onChange={(e) => setEditingCustomer(c => c ? {...c, phone: e.target.value} : null)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <Input id="address" value={editingCustomer?.address || ''} onChange={(e) => setEditingCustomer(c => c ? {...c, address: e.target.value} : null)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Input id="notes" value={editingCustomer?.notes || ''} onChange={(e) => setEditingCustomer(c => c ? {...c, notes: e.target.value} : null)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSaveCustomer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CustomersPage() {
  return (
    <AppShell>
      <Customers />
    </AppShell>
  )
}
