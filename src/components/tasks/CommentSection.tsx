import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { X, Image as ImageIcon, Loader2, Pencil, Check } from "lucide-react";
import { CommentEditor, CommentEditorRef } from "./CommentEditor";
import { MentionDropdown } from "@/components/messages/MentionDropdown";
import { Textarea } from "@/components/ui/textarea";
import { CommentAcknowledge } from "@/components/comments/CommentAcknowledge";

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { tasks, users, currentUser, addComment, updateComment, createMessage } = useAppContext();
  const [comment, setComment] = useState("");
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { toast } = useToast();
  const editorRef = useRef<CommentEditorRef>(null);

  // Ensure we have valid users array
  const safeUsers = Array.isArray(users) ? users : [];

  // Watch for @ mentions in the content
  useEffect(() => {
    const plainText = getPlainTextFromHtml(comment);
    const lastAtIndex = plainText.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = plainText.substring(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');
      
      if (!hasSpace) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [comment]);

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
    const plainText = getPlainTextFromHtml(comment);
    if ((plainText.trim() === '' && pendingImages.length === 0) || !currentUser) return;

    // Store the comment content before clearing (in case we need to restore on failure)
    const commentContent = comment;
    const imagesToUpload = [...pendingImages];

    setIsUploading(true);

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (imagesToUpload.length > 0) {
        imageUrls = await uploadImages();
      }

      // Extract mentioned users from the plain text
      const mentionRegex = /@(\w+)/g;
      const mentionMatches = [...plainText.matchAll(mentionRegex)];

      // Find user IDs for mentioned users
      const mentionedUserIds: string[] = [];
      mentionMatches.forEach((match) => {
        const firstName = match[1];
        const mentionedUser = safeUsers.find((u) => u.name.toLowerCase().startsWith(firstName.toLowerCase()));

        if (mentionedUser && !mentionedUserIds.includes(mentionedUser.auth_user_id)) {
          mentionedUserIds.push(mentionedUser.auth_user_id);
        }
      });

      // Add the comment to the task with images (store HTML for rich content)
      // This is the critical save operation - must complete successfully
      const commentId = await addComment(taskId, currentUser.auth_user_id, commentContent, mentionedUserIds, imageUrls);
      
      // Verify comment was saved by checking we got an ID back
      if (!commentId) {
        throw new Error('Comment was not saved - no ID returned');
      }

      // Clear form ONLY after successful save
      setComment("");
      editorRef.current?.clearContent();
      imagesToUpload.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setPendingImages([]);

      toast({
        title: "Comment Added",
        description:
          mentionedUserIds.length > 0
            ? "Your comment was added and mentioned users were notified"
            : "Your comment was added",
      });

      // Handle notifications in background (don't block on these)
      // For mentions
      if (task) {
        for (const userId of mentionedUserIds) {
          if (userId !== currentUser.auth_user_id) {
            supabase.functions.invoke("send-mention-notification", {
              body: {
                mentionedUserId: userId,
                mentionerName: currentUser.name,
                messageContent: commentContent,
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
      console.error("Error adding comment:", error);
      // Don't clear form on error - user can retry
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to extract plain text from HTML
  const getPlainTextFromHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Handle mention selection
  const handleMentionSelect = (user: any) => {
    if (!editorRef.current) return;
    
    editorRef.current.insertMention({
      id: user.auth_user_id,
      name: user.name
    });
    
    setShowMentions(false);
    setMentionSearch("");
  };

  // Format comment content with mentions and links
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

  // Handle starting edit mode
  const handleStartEdit = (commentItem: { id: string; content: string }) => {
    setEditingCommentId(commentItem.id);
    // Strip HTML for editing
    const plainText = getPlainTextFromHtml(commentItem.content);
    setEditingContent(plainText);
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  // Handle saving edited comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editingContent.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateComment(commentId, taskId, editingContent);
      setEditingCommentId(null);
      setEditingContent("");
      toast({
        title: "Comment Updated",
        description: "Your comment has been edited",
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Check if comment was edited (updated_at is different from created_at)
  const isCommentEdited = (commentItem: { timestamp: string; edited?: boolean; editedAt?: string }) => {
    return commentItem.edited === true;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Comments</h3>

      {/* Comments List */}
      <ScrollArea className="overflow-auto max-h-[400px] pr-4">
        <div className="space-y-4">
          {task.comments && task.comments.length > 0 ? (
            task.comments.map((commentItem) => {
              const commentUser = users.find((u) => u.auth_user_id === commentItem.userId);
              const commentImages = commentItem.images || [];
              const isOwnComment = currentUser?.auth_user_id === commentItem.userId;
              const isEditing = editingCommentId === commentItem.id;

              // Detect client portal comments (content starts with "[Client: ...]")
              const clientMatch = commentItem.content?.match(/^\[Client:\s*([^\]]+)\]/);
              const isClientComment = !!clientMatch;
              const clientName = clientMatch ? clientMatch[1].trim() : null;
              // Strip the "[Client: Name]" prefix from displayed content
              const displayContent = isClientComment
                ? commentItem.content.replace(/^\[Client:\s*[^\]]+\]\s*/, '')
                : commentItem.content;
              
              return (
                <div
                  key={commentItem.id}
                  className={`flex gap-3 group rounded-lg p-2 -mx-2 ${isClientComment ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    {isClientComment ? (
                      <AvatarFallback className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold">
                        {clientName?.substring(0, 2)?.toUpperCase() || "CL"}
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={commentUser?.avatar} />
                        <AvatarFallback>{commentUser?.name?.substring(0, 2) || "UN"}</AvatarFallback>
                      </>
                    )}
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {isClientComment ? (
                        <>
                          <span className="font-medium text-red-700 dark:text-red-300">{clientName}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
                            Client Comment
                          </span>
                        </>
                      ) : (
                        <span className="font-medium">{commentUser?.name || "Unknown"}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(commentItem.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {isCommentEdited(commentItem) && (
                        <span className="text-xs text-muted-foreground italic">(edited)</span>
                      )}
                      {isOwnComment && !isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleStartEdit(commentItem)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      <CommentAcknowledge commentId={commentItem.id} />
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[80px] text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(commentItem.id)}
                            disabled={isSavingEdit}
                          >
                            {isSavingEdit ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isSavingEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {displayContent && (
                          <div
                            className={`text-sm whitespace-pre-wrap break-words overflow-hidden max-w-full [&_*]:break-words [&_*]:overflow-wrap-anywhere ${isClientComment ? 'text-red-900 dark:text-red-100' : ''}`}
                            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                            dangerouslySetInnerHTML={{
                              __html: formatCommentContent(displayContent, commentItem.mentionedUserIds),
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
                      </>
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
            <CommentEditor
              ref={editorRef}
              content={comment}
              onChange={setComment}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                      const preview = URL.createObjectURL(file);
                      setPendingImages((prev) => [...prev, { file, preview }]);
                    }
                  }
                }
              }}
              placeholder="Add a comment... Use @ to mention someone (paste images with Ctrl+V)"
            />
            
            {/* Mention Dropdown */}
            {showMentions && (
              <div className="absolute bottom-full mb-2 z-50">
                <MentionDropdown
                  users={safeUsers}
                  onSelect={handleMentionSelect}
                  isOpen={showMentions}
                  searchQuery={mentionSearch}
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
            <Button type="submit" disabled={(getPlainTextFromHtml(comment).trim() === '' && pendingImages.length === 0) || isUploading}>
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
