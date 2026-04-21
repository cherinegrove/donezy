import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VoiceDescriptionButtonProps {
  onTranscript: (text: string) => void;
  existingText?: string;
}

export function VoiceDescriptionButton({ onTranscript, existingText }: VoiceDescriptionButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone access and try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.text) throw new Error("No transcription returned");

      const newText = existingText
        ? `${existingText}${existingText.endsWith(' ') ? '' : ' '}${data.text}`
        : data.text;

      onTranscript(newText);
      toast.success("Voice transcribed successfully");
    } catch (err) {
      console.error("Transcription error:", err);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isTranscribing}
      className={cn(
        "gap-1.5 transition-all",
        isRecording && "border-destructive text-destructive hover:bg-destructive/10 animate-pulse"
      )}
      title={isRecording ? "Stop recording" : "Record voice description"}
    >
      {isTranscribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {isTranscribing ? "Transcribing..." : isRecording ? "Stop" : "Voice"}
      </span>
    </Button>
  );
}
