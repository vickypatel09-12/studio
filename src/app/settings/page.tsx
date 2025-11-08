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
import { Power, PowerOff, Undo2 } from 'lucide-react';
import { format } from 'date-fns';

type SessionStatus = 'closed' | 'active';

export default function SettingsPage() {
  const { toast } = useToast();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('closed');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [activeSessionMonth, setActiveSessionMonth] = useState<string | null>(
    null
  );
  const [sessionStartDate, setSessionStartDate] = useState<Date | null>(null);
  const [sessionEndDate, setSessionEndDate] = useState<Date | null>(null);

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your new settings have been successfully applied.',
    });
  };

  const handleStartSession = () => {
    if (!selectedMonth) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a month before starting the session.',
      });
      return;
    }
    setSessionStatus('active');
    const startDate = new Date();
    setSessionStartDate(startDate);
    setActiveSessionMonth(selectedMonth);
    setSessionEndDate(null); // Clear end date when new session starts
    toast({
      title: `Session Started`,
      description: `The accounting session for ${selectedMonth} has been started at ${format(
        startDate,
        'PPpp'
      )}.`,
    });
  };

  const handleEndSession = () => {
    if (!selectedMonth) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a month before ending the session.',
      });
      return;
    }
     if (selectedMonth !== activeSessionMonth) {
      toast({
        variant: 'destructive',
        title: 'Incorrect Month',
        description: `A session is active for ${activeSessionMonth}. Please select it to end the session.`,
      });
      return;
    }
    setSessionStatus('closed');
    const endDate = new Date();
    setSessionEndDate(endDate);
    toast({
      title: `Session Ended`,
      description: `The accounting session for ${selectedMonth} has been ended at ${format(
        endDate,
        'PPpp'
      )}.`,
    });
    setSelectedMonth(''); // Reset selection
  };
  
  const handleRevertStart = () => {
    setSessionStatus('closed');
    setSessionStartDate(null);
    setActiveSessionMonth(null);
    toast({
      title: 'Action Reverted',
      description: 'The session start has been cancelled.',
    });
  };

  const handleRevertEnd = () => {
    setSessionStatus('active');
    setSessionEndDate(null);
     toast({
      title: 'Action Reverted',
      description: 'The session has been reopened.',
    });
  }

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
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                disabled={sessionStatus === 'active'}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="july-2024">July 2024</SelectItem>
                  <SelectItem value="june-2024">June 2024</SelectItem>
                  <SelectItem value="may-2024">May 2024</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <Badge
                  variant={
                    sessionStatus === 'active' ? 'default' : 'secondary'
                  }
                  className={
                    sessionStatus === 'active'
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }
                >
                  {sessionStatus === 'active' ? `Active (${activeSessionMonth})` : 'Closed'}
                </Badge>
              </div>
            </div>
             <div className="flex flex-col gap-2 sm:flex-row">
              {sessionStatus === 'closed' && (
                <Button
                  onClick={handleStartSession}
                  disabled={!selectedMonth}
                >
                  <Power className="mr-2" /> Start Session
                </Button>
              )}
              {sessionStatus === 'active' && (
                <>
                <Button
                  variant="destructive"
                  onClick={handleEndSession}
                >
                  <PowerOff className="mr-2" /> End Session for {activeSessionMonth}
                </Button>
                 <Button variant="outline" onClick={handleRevertStart}>
                    <Undo2 className="mr-2 h-4 w-4" /> Revert Start
                  </Button>
                </>
              )}
            </div>

            {sessionEndDate && sessionStartDate && activeSessionMonth && (
               <div className="mt-4 rounded-lg border bg-muted/50 p-4 text-sm">
                <p className="font-semibold">
                  Session for <span className='text-primary'>{activeSessionMonth}</span> is complete.
                </p>
                <p className="text-muted-foreground mt-1">
                  Started: {format(sessionStartDate, 'PPpp')}
                </p>
                <p className="text-muted-foreground">
                  Ended: {format(sessionEndDate, 'PPpp')}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleRevertEnd}>
                   <Undo2 className="mr-2 h-4 w-4" /> Reopen Session
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
