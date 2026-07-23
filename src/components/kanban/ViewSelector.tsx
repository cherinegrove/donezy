import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BasicViewMode = "list" | "kanban";
type FullViewMode = "list" | "kanban" | "timeline";

// Overload for when timeline is shown
interface ViewSelectorWithTimelineProps {
  currentView: FullViewMode;
  onViewChange: (view: FullViewMode) => void;
  showTimeline: true;
}

// Overload for basic view (no timeline)
interface ViewSelectorBasicProps {
  currentView: BasicViewMode;
  onViewChange: (view: BasicViewMode) => void;
  showTimeline?: false;
}

type ViewSelectorProps = ViewSelectorWithTimelineProps | ViewSelectorBasicProps;

export function ViewSelector(props: ViewSelectorProps) {
  const { currentView, showTimeline } = props;

  const handleViewChange = (view: string) => {
    if (showTimeline) {
      (props as ViewSelectorWithTimelineProps).onViewChange(view as FullViewMode);
    } else {
      (props as ViewSelectorBasicProps).onViewChange(view as BasicViewMode);
    }
  };

  return (
    <Select value={currentView} onValueChange={handleViewChange}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="list">List</SelectItem>
        <SelectItem value="kanban">Kanban</SelectItem>
        {showTimeline && <SelectItem value="timeline">Timeline</SelectItem>}
      </SelectContent>
    </Select>
  );
}
