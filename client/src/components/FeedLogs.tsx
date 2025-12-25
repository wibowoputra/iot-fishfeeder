import { type FeedLog } from "@shared/schema";
import { format } from "date-fns";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatInTimeZone } from "date-fns-tz";

interface FeedLogsProps {
  logs: FeedLog[];
  isLoading: boolean;
}

export function FeedLogs({ logs, isLoading }: FeedLogsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 p-2">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm">No feed history recorded yet.</p>
      </div>
    );
  }

  // Sort logs by newest first
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
  );

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {sortedLogs.map((log) => {
          const isSuccess = log.status === "SUCCESS";
          const isFailed = log.status === "FAILED";
          console.log("RAW:", log.triggeredAt);
          console.log("DATE:", new Date(log.triggeredAt).toISOString());
          console.log(
          formatInTimeZone(
            new Date(log.triggeredAt),
            "UTC",
            "yyyy-MM-dd HH:mm:ss XXX"
          )
);           
          return (
            <div key={log.id} className="flex gap-4 items-start group">
              <div className={`
                mt-0.5 rounded-full p-1.5 flex-shrink-0
                ${isSuccess ? 'bg-green-100 text-green-600' : ''}
                ${isFailed ? 'bg-red-100 text-red-600' : ''}
                ${!isSuccess && !isFailed ? 'bg-amber-100 text-amber-600' : ''}
              `}>
                {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : 
                 isFailed ? <XCircle className="w-4 h-4" /> : 
                 <AlertCircle className="w-4 h-4" />}
              </div>
              
              <div className="flex-1 pb-4 border-b border-border/50 group-last:border-0">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-semibold text-foreground">
                    {log.type === "SCHEDULE" ? "Scheduled Feed" : "Manual Feed"}
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    {
                    formatInTimeZone(
                      new Date(log.triggeredAt),
                       "UTC",
                      "MMM d, h:mm a"
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Status: <span className={
                    isSuccess ? 'text-green-600 font-medium' : 
                    isFailed ? 'text-red-600 font-medium' : 'text-amber-600'
                  }>{log.status}</span>
                </p>
                {log.message && (
                  <p className="text-xs mt-1 text-foreground/70 bg-muted/50 p-1.5 rounded-md inline-block">
                    {log.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
