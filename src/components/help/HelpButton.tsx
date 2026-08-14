import { Button } from '@/components/ui/button';
import { useHelp } from '@/contexts/HelpContext';
import { openHelpArticle, getHelpArticles } from '@/utils/helpMapping';
import { HelpCircle, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function HelpButton() {
  const { currentPage, setIsHelpOpen } = useHelp();
  const relevantArticles = getHelpArticles(currentPage);

  const handleOpenArticle = (articleKey: string) => {
    openHelpArticle(articleKey);
  };

  const handleOpenKB = () => {
    window.open('https://docs.donezy.io', '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
          title="Get help (Cmd+?)"
        >
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold">
          Help & Resources
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Relevant articles for current page */}
        {relevantArticles.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
              For This Page
            </DropdownMenuLabel>
            {relevantArticles.map((article) => (
              <DropdownMenuItem
                key={article.url}
                onClick={() => handleOpenArticle(article.url.split('/').pop() || '')}
                className="flex items-start gap-2 p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{article.title}</div>
                  {article.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {article.description}
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Knowledge Base */}
        <DropdownMenuItem onClick={handleOpenKB} className="p-2">
          <div>
            <div className="font-medium text-sm">Browse Knowledge Base</div>
            <div className="text-xs text-muted-foreground">All articles & topics</div>
          </div>
        </DropdownMenuItem>

        {/* Common articles */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Quick Links
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleOpenArticle('faq')}
          className="text-sm"
        >
          Frequently Asked Questions
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOpenArticle('keyboard-shortcuts')}
          className="text-sm"
        >
          Keyboard Shortcuts
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleOpenArticle('troubleshooting')}
          className="text-sm"
        >
          Troubleshooting
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Support
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => window.open('mailto:support@donezy.io')}
          className="text-sm"
        >
          Email Support
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
