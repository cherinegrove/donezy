import React, { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MentionDropdown } from "../messages/MentionDropdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { tasks, users, currentUser, addComment, createMessage } = useAppContext();
  const [comment, setComment] = useState("");
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Mention states
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure we have valid users array
  const safeUsers = Array.isArray(users) ? users : [];

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  // Handle paste event for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          setPendingImages((prev) => [...prev, { file, preview }]);
        }
      }
    }
  };

  // Remove a pending image
  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Upload images to Supabase storage
  const uploadImages = async (): Promise<string[]> => {
    if (pendingImages.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const { file } of pendingImages) {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${currentUser?.auth_user_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("comment-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Error uploading image:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("comment-images")
        .getPublicUrl(data.path);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!comment.trim() && pendingImages.length === 0) || !currentUser) return;

    setIsUploading(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Extract mentioned users from the comment
      const mentionRegex = /@(\w+)/g;
      const mentionMatches = [...comment.matchAll(mentionRegex)];

      // Find user IDs for mentioned users
      const mentionedUserIds: string[] = [];
      mentionMatches.forEach((match) => {
        const firstName = match[1];
        const mentionedUser = safeUsers.find((u) => u.name.toLowerCase().startsWith(firstName.toLowerCase()));

        if (mentionedUser && !mentionedUserIds.includes(mentionedUser.auth_user_id)) {
          mentionedUserIds.push(mentionedUser.auth_user_id);
        }
      });

      // Add the comment to the task with images
      const commentId = await addComment(taskId, currentUser.auth_user_id, comment, mentionedUserIds, imageUrls);

      // Create notification messages for each mentioned user and task assignee/collaborators
      if (task) {
        // For mentions
        for (const userId of mentionedUserIds) {
          if (userId !== currentUser.auth_user_id) {
            try {
              if (commentId) {
                const { data, error } = await supabase.functions.invoke("send-mention-notification", {
                  body: {
                    mentionedUserId: userId,
                    messageId: commentId,
                    mentionerName: currentUser.name,
                    messageContent: comment,
                    taskId,
                  },
                });

                if (error) {
                  console.error("Error calling edge function:", error);
                } else {
                  console.log("Edge function called successfully:", data);
                }
              } else {
                console.warn("Skipping edge function call - invalid comment ID:", commentId);
              }
            } catch (error) {
              console.error("Error creating mention notification:", error);
            }
          }
        }

        // For task assignee
        if (
          task.assigneeId &&
          task.assigneeId !== currentUser.auth_user_id &&
          !mentionedUserIds.includes(task.assigneeId)
        ) {
          await createMessage({
            senderId: currentUser.auth_user_id,
            recipientIds: [task.assigneeId],
            content: `New comment on task "${task.title}" you're assigned to`,
            commentId: commentId,
            taskId: taskId,
            projectId: task.projectId,
          });
        }

        // For collaborators
        if (task.collaboratorIds && task.collaboratorIds.length > 0) {
          for (const collaboratorId of task.collaboratorIds) {
            if (
              collaboratorId !== currentUser.auth_user_id &&
              collaboratorId !== task.assigneeId &&
              !mentionedUserIds.includes(collaboratorId)
            ) {
              await createMessage({
                senderId: currentUser.auth_user_id,
                recipientIds: [collaboratorId],
                content: `New comment on task "${task.title}" you're collaborating on`,
                commentId: commentId,
                taskId: taskId,
                projectId: task.projectId,
              });
            }
          }
        }
      }

      toast({
        title: "Comment Added",
        description:
          mentionedUserIds.length > 0
            ? "Your comment was added and mentioned users were notified"
            : "Your comment was added",
      });

      // Reset form
      setComment("");
      pendingImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setPendingImages([]);
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate mention dropdown position
  const calculateMentionPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    return {
      top: 40,
      left: 0,
    };
  };

  // Handle textarea content change to detect @ mentions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    setComment(text);
    setCursorPosition(cursorPos);

    // Check for @ mentions
    if (cursorPos > 0) {
      const textBeforeCursor = text.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex !== -1) {
        const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
        const isValidMentionStart = atIndex === 0 || /\s/.test(charBeforeAt);

        if (isValidMentionStart) {
          const query = textBeforeCursor.substring(atIndex + 1);

          if (!query.includes(" ") && query.length <= 20) {
            setMentionStartPos(atIndex);
            setMentionQuery(query);
            setMentionOpen(true);
            setMentionPosition(calculateMentionPosition());
            return;
          }
        }
      }
    }

    if (mentionOpen) {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  // Handle user selection from the mention dropdown
  const handleSelectUser = (user: { id: string; name: string }) => {
    if (!textareaRef.current) return;

    const text = comment;
    const beforeMention = text.substring(0, mentionStartPos);
    const afterMention = text.substring(cursorPosition);
    const newText = `${beforeMention}@${user.name} ${afterMention}`;

    setComment(newText);
    setMentionOpen(false);
    setMentionQuery("");

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionStartPos + user.name.length + 2;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
  };

  // Close mentions when clicking outside
  const handleBlur = () => {
    setTimeout(() => {
      setMentionOpen(false);
    }, 150);
  };

  // Filter users for mentions (exclude current user)
  const otherUsers = safeUsers.filter((user) => user.auth_user_id !== currentUser?.auth_user_id);

  // Format comment content with mentions
  const formatCommentContent = (content: string, mentionedUserIds: string[] = []) => {
    let formattedContent = content;

    mentionedUserIds.forEach((userId) => {
      const user = safeUsers.find((u) => u.auth_user_id === userId);
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Comments</h3>

      {/* Comments List */}
      <ScrollArea className="overflow-auto max-h-[400px] pr-4">
        <div className="space-y-4">
          {task.comments && task.comments.length > 0 ? (
            task.comments.map((comment) => {
              const commentUser = users.find((u) => u.auth_user_id === comment.userId);
              const commentImages = comment.images || [];
              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={commentUser?.avatar} />
                    <AvatarFallback>{commentUser?.name?.substring(0, 2) || "UN"}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{commentUser?.name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    {comment.content && (
                      <div
                        className="text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: formatCommentContent(comment.content, comment.mentionedUserIds),
                        }}
                      />
                    )}
                    {/* Display comment images */}
                    {commentImages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {commentImages.map((imageUrl: string, index: number) => (
                          <a
                            key={index}
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={imageUrl}
                              alt={`Comment attachment ${index + 1}`}
                              className="max-w-[300px] max-h-[200px] rounded-lg border object-cover hover:opacity-90 transition-opacity cursor-pointer"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-muted-foreground">No comments yet</div>
          )}
        </div>
      </ScrollArea>

      {/* Comment Input Form - Always at the bottom */}
      {currentUser && (
        <form onSubmit={handleSubmitComment} className="space-y-2 relative">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment... (Use @ to mention, paste images with Ctrl+V)"
              value={comment}
              onChange={handleTextareaChange}
              onBlur={handleBlur}
              onPaste={handlePaste}
              className="min-h-[80px]"
            />

            {mentionOpen && (
              <div
                className="absolute"
                style={{
                  top: mentionPosition.top,
                  left: mentionPosition.left,
                  zIndex: 1000,
                }}
              >
                <MentionDropdown
                  users={otherUsers}
                  onSelect={handleSelectUser}
                  isOpen={mentionOpen}
                  searchQuery={mentionQuery}
                  className="shadow-lg border"
                />
              </div>
            )}
          </div>

          {/* Pending Images Preview */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/50">
              {pendingImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Pending upload ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removePendingImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4 mr-1" />
                {pendingImages.length} image{pendingImages.length !== 1 ? "s" : ""} to upload
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Tip: Paste screenshots directly with Ctrl+V / Cmd+V
            </span>
            <Button type="submit" disabled={(!comment.trim() && pendingImages.length === 0) || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Post Comment"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
