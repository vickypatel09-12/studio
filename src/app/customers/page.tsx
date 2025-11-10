'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
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
  GripVertical,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, doc, writeBatch, orderBy, getDocs } from 'firebase/firestore';
import type { Customer } from '@/lib/data';
import { AppShell } from '@/components/AppShell';

const SortableCustomerRow = ({ customer, index, onEdit, onDelete }: { customer: Customer, index: number, onEdit: (customer: Customer) => void, onDelete: (customer: Customer) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: customer.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
            <TableCell>
                <div className="flex items-center gap-2">
                 <span {...listeners} className="cursor-grab p-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </span>
                <span>{index + 1}</span>
                </div>
            </TableCell>
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
                    <DropdownMenuItem onClick={() => onEdit(customer)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(customer)} className='text-destructive focus:text-destructive'>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </TableCell>
        </TableRow>
    );
};


function Customers() {
  const firestore = useFirestore();
  const [isImporting, setIsImporting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const { toast } = useToast();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'), orderBy('sortOrder'));
  }, [firestore]);

  const { data: customersData, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (customersData) {
      setCustomers(customersData);
    }
  }, [customersData]);

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
      reader.onload = async (e) => {
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
          
          const maxSortOrder = customers.reduce((max, c) => Math.max(c.sortOrder ?? 0, max), 0);
          const startingSortOrder = (customers.length > 0) ? maxSortOrder + 1 : 0;

          const newCustomers = lines.slice(1).map((line, index) => {
            const values = line.split(',');
            const customerData: any = {};
            headers.forEach((header, index) => {
                customerData[header] = values[index]?.trim() || '';
            });
             return {
                name: customerData.name,
                email: customerData.email || '',
                phone: customerData.phone || '',
                address: customerData.address || '',
                notes: customerData.notes || '',
                sortOrder: startingSortOrder + index,
            };
          });

          const customerCollection = collection(firestore, 'customers');
          const batch = writeBatch(firestore);
          newCustomers.forEach(customer => {
              const docRef = doc(customerCollection);
              batch.set(docRef, customer);
          });
          await batch.commit();

          toast({ title: 'Success', description: 'Customers imported successfully.' });
          setIsImporting(false);
          // Reset file input to allow importing the same file again
          event.target.value = '';
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

  const openDeleteDialog = (customer: Customer) => {
      setDeletingCustomer(customer);
  }

  const confirmDelete = () => {
    if (!firestore || !deletingCustomer) return;
    const docRef = doc(firestore, 'customers', deletingCustomer.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Customer Deleted', description: `Customer ${deletingCustomer.name} has been removed.`});
    setDeletingCustomer(null);
  };
  
  const confirmDeleteAll = async () => {
    if (!firestore) return;
    setIsDeletingAll(false); // Close dialog
    try {
        const customerCollection = collection(firestore, 'customers');
        const customerSnapshot = await getDocs(customerCollection);
        const batch = writeBatch(firestore);
        customerSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        toast({ title: 'All Customers Deleted', description: 'All customer data has been removed.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete all customers.' });
    }
  };

  const handleSaveCustomer = () => {
    if (!editingCustomer || !firestore) return;
    
    const trimmedName = editingCustomer.name.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Customer name cannot be empty.' });
        return;
    }

    const isDuplicate = customers.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCustomer.id
    );

    if (isDuplicate) {
        toast({
            variant: 'destructive',
            title: 'Duplicate Customer',
            description: `A customer named "${trimmedName}" already exists.`,
        });
        return;
    }

    if (isNewCustomer) {
        const customerCollection = collection(firestore, 'customers');
        addDocumentNonBlocking(customerCollection, {
            name: trimmedName,
            email: editingCustomer.email || '',
            phone: editingCustomer.phone || '',
            address: editingCustomer.address || '',
            notes: editingCustomer.notes || '',
            sortOrder: customers?.length || 0,
        });
        toast({ title: 'Customer Added', description: `${trimmedName} has been added.` });
    } else {
        const docRef = doc(firestore, 'customers', editingCustomer.id);
        updateDocumentNonBlocking(docRef, {
            name: trimmedName,
            email: editingCustomer.email || '',
            phone: editingCustomer.phone || '',
            address: editingCustomer.address || '',
notes: editingCustomer.notes || '',
        });
        toast({ title: 'Customer Updated', description: `Details for ${trimmedName} have been saved.` });
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
  
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    
    if (active.id !== over?.id && firestore && over) {
      const oldIndex = customers.findIndex((c) => c.id === active.id);
      const newIndex = customers.findIndex((c) => c.id === over.id);
      
      const updatedCustomers = arrayMove(customers, oldIndex, newIndex);
      setCustomers(updatedCustomers);

      // Update sortOrder in Firestore
      const batch = writeBatch(firestore);
      updatedCustomers.forEach((customer, index) => {
        const docRef = doc(firestore, 'customers', customer.id);
        batch.update(docRef, { sortOrder: index });
      });
      
      try {
        await batch.commit();
        toast({ title: 'Customer order saved.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error saving order', description: 'Could not save new customer order.' });
        // Revert UI change on error
        setCustomers(customers);
      }
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Manage your customer profiles and view their status. Drag and drop to reorder.
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
            <Button variant="destructive" onClick={() => setIsDeletingAll(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
         {customersLoading ? (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
         ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
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
                <SortableContext 
                    items={customers.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <TableBody>
                    {customers?.map((customer, index) => (
                        <SortableCustomerRow 
                            key={customer.id} 
                            customer={customer} 
                            index={index}
                            onEdit={openEditCustomerDialog}
                            onDelete={openDeleteDialog}
                        />
                    ))}
                    </TableBody>
                </SortableContext>
            </Table>
          </DndContext>
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
      
      <AlertDialog open={!!deletingCustomer} onOpenChange={(isOpen) => !isOpen && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer "{deletingCustomer?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: 'destructive' })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isDeletingAll} onOpenChange={setIsDeletingAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all customers from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAll} className={buttonVariants({ variant: 'destructive' })}>
              Yes, delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function CustomersPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <Customers />
      </Suspense>
    </AppShell>
  )
}
