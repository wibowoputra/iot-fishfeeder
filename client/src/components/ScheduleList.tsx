import { useState } from "react";
import { type Schedule } from "@shared/schema";
import { useUpdateSchedule, useDeleteSchedule } from "@/hooks/use-fish-feeder";
import { format, parse } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Edit2 } from "lucide-react";
import { ScheduleDialog } from "./ScheduleDialog";
import { useToast } from "@/hooks/use-toast";

interface ScheduleListProps {
  schedules: Schedule[];
  isLoading: boolean;
}

export function ScheduleList({ schedules, isLoading }: ScheduleListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { toast } = useToast();

  const handleEdit = (id: number) => {
    setEditingId(id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSchedule.mutateAsync(id);
      toast({ title: "Schedule deleted", description: "Feeding time removed." });
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggle = async (schedule: Schedule) => {
    try {
      await updateSchedule.mutateAsync({ 
        id: schedule.id, 
        enabled: !schedule.enabled 
      });
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  // Helper to format 24h string to 12h display
  const formatTime = (timeStr: string) => {
    try {
      const date = parse(timeStr, 'HH:mm', new Date());
      return format(date, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted rounded-2xl">
        <div className="bg-primary/5 p-4 rounded-full mb-3">
          <Clock className="w-8 h-8 text-primary/40" />
        </div>
        <h3 className="text-lg font-medium">No schedules yet</h3>
        <p className="text-muted-foreground text-sm max-w-[200px]">
          Add a feeding time to automate your fish feeder.
        </p>
      </div>
    );
  }

  // Sort schedules by time
  const sortedSchedules = [...schedules].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <div className="space-y-3">
        {sortedSchedules.map((schedule) => (
          <div 
            key={schedule.id}
            className={`
              group flex items-center justify-between p-4 rounded-xl border transition-all duration-200
              ${schedule.enabled 
                ? 'bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20' 
                : 'bg-muted/30 border-transparent opacity-70'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${schedule.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-mono font-semibold tracking-tight block">
                  {formatTime(schedule.time)}
                </span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Daily
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Switch 
                checked={schedule.enabled}
                onCheckedChange={() => handleToggle(schedule)}
                className="data-[state=checked]:bg-primary"
              />
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleEdit(schedule.id)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(schedule.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ScheduleDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingId(null);
        }}
        scheduleToEdit={schedules.find(s => s.id === editingId)}
      />
    </>
  );
}
