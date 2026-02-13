import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { fetchTimeEntryEvents, formatEventType, getEventIcon, TimeEntryEvent } from "@/utils/timeEntryEventLogger";
import { Loader2 } from "lucide-react";

interface TimeEntryEventLogProps {
  timeEntryId: string;
}

export function TimeEntryEventLog({ timeEntryId }: TimeEntryEventLogProps) {
  const [events, setEvents] = useState<TimeEntryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTimeEntryEvents(timeEntryId).then((data) => {
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [timeEntryId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading events…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-3 px-4 text-sm text-muted-foreground">
        No events recorded for this time entry.
      </div>
    );
  }

  const formatDetails = (event: TimeEntryEvent): string | null => {
    const d = event.details;
    if (!d) return null;

    const parts: string[] = [];

    if (d.reason) parts.push(d.reason);

    if (d.previousValue !== undefined && d.newValue !== undefined) {
      const oldVal = typeof d.previousValue === 'object' ? JSON.stringify(d.previousValue) : String(d.previousValue);
      const newVal = typeof d.newValue === 'object' ? JSON.stringify(d.newValue) : String(d.newValue);
      parts.push(`${oldVal} → ${newVal}`);
    }

    if (d.field) parts.push(`Field: ${d.field}`);

    if (d.pauseDuration !== undefined) {
      const mins = Math.floor(d.pauseDuration / 60000);
      const secs = Math.floor((d.pauseDuration % 60000) / 1000);
      parts.push(`Paused for ${mins}m ${secs}s`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  };

  return (
    <div className="py-2 px-4">
      <div className="relative border-l-2 border-muted ml-3 space-y-0">
        {events.map((event, idx) => {
          const details = formatDetails(event);
          return (
            <div key={event.id} className="relative pl-5 py-1.5 group">
              {/* Timeline dot */}
              <div className="absolute -left-[5px] top-2.5 h-2 w-2 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors" />
              
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm">{getEventIcon(event.event_type)}</span>
                <span className="text-sm font-medium">{formatEventType(event.event_type)}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.event_timestamp), "MMM d, yyyy 'at' h:mm:ss a")}
                </span>
              </div>
              {details && (
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">{details}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
