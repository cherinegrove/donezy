import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { openHelpArticle } from '@/utils/helpMapping';

interface ContextualHelpProps {
  articleKey: string;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

export function ContextualHelp({
  articleKey,
  tooltip,
  size = 'md',
  inline = false,
}: ContextualHelpProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const button = (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'icon'}
      className="h-auto w-auto p-0 text-muted-foreground hover:text-foreground"
      onClick={() => openHelpArticle(articleKey)}
    >
      <HelpCircle className={sizeClasses[size]} />
      <span className="sr-only">Learn more</span>
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
