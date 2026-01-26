import React, { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface NotificationReplySectionProps {
  taskId: string;
}

export function NotificationReplySection({ taskId }: NotificationReplySectionProps) {
  const { tasks, users, currentUser, addComment, createMessage } = useAppContext();
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const recentComments = (task.comments || []).slice(-3);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !currentUser) return;

    setIsSubmitting(true);

    try {
      // Extract mentioned users from the content
      const mentionRegex = /@(\w+)/g;
      const mentionMatches = [...replyContent.matchAll(mentionRegex)];

      const mentionedUserIds: string[] = [];
      mentionMatches.forEach((match) => {
        const firstName = match[1];
        const mentionedUser = users.find((u) => 
          u.name.toLowerCase().startsWith(firstName.toLowerCase())
        );
        if (mentionedUser && !mentionedUserIds.includes(mentionedUser.auth_user_id)) {
          mentionedUserIds.push(mentionedUser.auth_user_id);
        }
      });

      // Add the comment
      const commentId = await addComment(taskId, currentUser.auth_user_id, replyContent, mentionedUserIds, []);
      
      if (!commentId) {
        throw new Error('Comment was not saved');
      }

      setReplyContent("");
      
      toast({
        title: "Reply Sent",
        description: "Your reply has been added to the task",
      });

      // Send notifications in background
      if (task) {
        // For mentions
        for (const userId of mentionedUserIds) {
          if (userId !== currentUser.auth_user_id) {
            supabase.functions.invoke("send-mention-notification", {
              body: {
                mentionedUserId: userId,
                mentionerName: currentUser.name,
                messageContent: replyContent,
                taskId,
              },
            }).catch(err => console.error("Error sending mention notification:", err));
          }
        }

        // For task assignee
        if (
          task.assigneeId &&
          task.assigneeId !== currentUser.auth_user_id &&
          !mentionedUserIds.includes(task.assigneeId)
        ) {
          createMessage({
            senderId: currentUser.auth_user_id,
            recipientIds: [task.assigneeId],
            content: `New comment on task "${task.title}" you're assigned to`,
            commentId: commentId,
            taskId: taskId,
            projectId: task.projectId,
          }).catch(err => console.error("Error creating message for assignee:", err));
        }

        // For collaborators
        if (task.collaboratorIds && task.collaboratorIds.length > 0) {
          for (const collaboratorId of task.collaboratorIds) {
            if (
              collaboratorId !== currentUser.auth_user_id &&
              collaboratorId !== task.assigneeId &&
              !mentionedUserIds.includes(collaboratorId)
            ) {
              createMessage({
                senderId: currentUser.auth_user_id,
                recipientIds: [collaboratorId],
                content: `New comment on task "${task.title}" you're collaborating on`,
                commentId: commentId,
                taskId: taskId,
                projectId: task.projectId,
              }).catch(err => console.error("Error creating message for collaborator:", err));
            }
          }
        }
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format comment content with mentions highlighted
  const formatCommentContent = (content: string, mentionedUserIds: string[] = []) => {
    let formattedContent = content;

    mentionedUserIds.forEach((userId) => {
      const user = users.find((u) => u.auth_user_id === userId);
      if (user) {
        const mentionRegex = new RegExp(`@${user.name}`, "g");
        formattedContent = formattedContent.replace(
          mentionRegex,
          `<span class="bg-primary/20 text-primary px-1 rounded">@${user.name}</span>`,
        );
      }
    });

    return formattedContent;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Comments & Reply
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Comments */}
        {recentComments.length > 0 ? (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-3">
              {recentComments.map((commentItem) => {
                const commentUser = users.find((u) => u.auth_user_id === commentItem.userId);
                return (
                  <div key={commentItem.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={commentUser?.avatar} />
                      <AvatarFallback className="text-xs">
                        {commentUser?.name?.substring(0, 2) || "UN"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{commentUser?.name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(commentItem.timestamp), "MMM d 'at' h:mm a")}
                        </span>
                      </div>
                      <div
                        className="text-sm text-muted-foreground break-words"
                        dangerouslySetInnerHTML={{
                          __html: formatCommentContent(commentItem.content, commentItem.mentionedUserIds),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">No comments yet</p>
        )}

        <Separator />

        {/* Reply Form */}
        {currentUser && (
          <form onSubmit={handleSubmitReply} className="space-y-2">
            <div className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback>{currentUser.name?.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply... Use @name to mention someone"
                  className="min-h-[60px] resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSubmitReply(e);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="sm" 
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Reply
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Press Ctrl+Enter to send
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
