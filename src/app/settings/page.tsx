'use client';
import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Power, PowerOff } from 'lucide-react';

type SessionStatus = 'closed' | 'active';

export default function SettingsPage() {
  const { toast } = useToast();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('closed');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your new settings have been successfully applied.',
    });
  };

  const handleSessionAction = (action: SessionStatus) => {
    if (action === 'closed' && !selectedMonth) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a month before ending the session.',
      });
      return;
    }
    setSessionStatus(action);
    toast({
      title: `Session ${action === 'active' ? 'Started' : 'Ended'}`,
      description: `The accounting session for ${
        selectedMonth || 'the selected month'
      } has been ${action === 'active' ? 'started' : 'ended'}.`,
    });
     // Reset month selection after action
    if (action === 'active') {
      setSelectedMonth('');
    }
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Configure application settings such as interest rates and other
            financial parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="interest-rate">Default Interest Rate (%)</Label>
            <Input id="interest-rate" type="number" defaultValue="12" />
            <p className="text-sm text-muted-foreground">
              Annual interest rate for new loans. This will be used as a default
              value.
            </p>
          </div>
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="grid gap-2">
               <Label>Monthly Session Management</Label>
               <p className="text-sm text-muted-foreground">
                Start or end the accounting session for a specific month.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="july-2024">July 2024</SelectItem>
                  <SelectItem value="june-2024">June 2024</SelectItem>
                  <SelectItem value="may-2024">May 2024</SelectItem>
                </SelectContent>
              </Select>
               <div className='flex items-center gap-2'>
                <span>Status:</span>
                <Badge variant={sessionStatus === 'active' ? 'default' : 'secondary'} className={sessionStatus === 'active' ? 'bg-accent text-accent-foreground' : ''}>
                  {sessionStatus === 'active' ? 'Active' : 'Closed'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
             {sessionStatus === 'closed' ? (
                <Button
                  variant="outline"
                  onClick={() => handleSessionAction('active')}
                  disabled={!selectedMonth}
                >
                  <Power className="mr-2" /> Start Session
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleSessionAction('closed')}
                  disabled={!selectedMonth}
                >
                  <PowerOff className="mr-2" /> End Session
                </Button>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
