import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

export type SpeechMode = "web" | "whisper";

interface UseSpeechToTextProps {
    onResult: (text: string) => void;
    onCommand?: (command: "stop" | "submit") => void;
    continuous?: boolean;
}

export const useSpeechToText = ({ onResult, onCommand, continuous = false }: UseSpeechToTextProps) => {
    const [mode, setMode] = useState<SpeechMode>("web");
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [keyboardHintVisible, setKeyboardHintVisible] = useState(false);

    // --- REFS ---
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const isListeningRef = useRef(isListening);

    // Sync ref
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // --- 1. WEB SPEECH API SETUP (ENHANCED) ---
    useEffect(() => {
        if (mode === "web") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
                toast.success("🎤 Listening...", { duration: 1500 });
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === "no-speech") {
                    toast.info("No speech detected. Try again.");
                } else if (event.error === "aborted") {
                    // Silently handle abort
                } else {
                    toast.error(`Speech error: ${event.error}`);
                }
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = "";
                let hasStopCommand = false;
                let hasSubmitCommand = false;

                // Process all final results
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        let transcript = event.results[i][0].transcript;
                        const lower = transcript.toLowerCase().trim();

                        // COMMAND: STOP (stops listening)
                        if (lower.includes("stop") || lower === "stop listening" || lower === "stop recording") {
                            hasStopCommand = true;
                            transcript = transcript.replace(/stop(\s+listening)?(\s+recording)?/gi, "");
                            toast.info("⏹️ Stopped listening");
                        }

                        // COMMAND: SUBMIT (stops and submits form)
                        if (lower.includes("submit") || lower === "submit form" || lower === "submit now") {
                            hasSubmitCommand = true;
                            transcript = transcript.replace(/submit(\s+form)?(\s+now)?/gi, "");
                            toast.success("✅ Submitting...");
                        }

                        finalTranscript += transcript + " ";
                    }
                }

                // Send transcript if there's any text
                if (finalTranscript.trim()) {
                    onResult(finalTranscript.trim());
                }

                // Handle commands after sending text
                if (hasStopCommand) {
                    if (recognitionRef.current) recognitionRef.current.stop();
                    if (onCommand) onCommand("stop");
                }

                if (hasSubmitCommand) {
                    if (recognitionRef.current) recognitionRef.current.stop();
                    if (onCommand) onCommand("submit");
                }
            };

            recognitionRef.current = recognition;
        } else {
            // Cleanup if switching away
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
            }
        }
    }, [mode, continuous, onResult, onCommand]);

    // --- 2. WHISPER SETUP (MediaRecorder with enhanced settings) ---
    const startListening = useCallback(async () => {
        if (mode === "web") {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    console.error("Web Speech start error:", e);
                    toast.error("Could not start speech recognition");
                }
            } else {
                toast.error("Web Speech API not supported in this browser.");
            }
        } else {
            // WHISPER MODE (Enhanced audio quality)
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000
                    }
                });

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus',
                    audioBitsPerSecond: 128000
                });

                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    setIsProcessing(true);
                    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                    const formData = new FormData();
                    formData.append("file", audioBlob, "recording.webm");

                    try {
                        const toastId = toast.loading("🎙️ Processing with Whisper...");
                        const API_URL = import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000";
                        const response = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/transcribe`, {
                            method: "POST",
                            body: formData,
                        });
                        if (!response.ok) throw new Error("Transcription failed");

                        const data = await response.json();
                        if (data.text) {
                            let text = data.text;
                            const lower = text.toLowerCase();

                            // Check for submit command
                            if (lower.includes("submit")) {
                                text = text.replace(/submit(\s+form)?(\s+now)?/gi, "");
                                toast.success("✅ Submitting...", { id: toastId });
                                if (onCommand) onCommand("submit");
                            } else {
                                toast.success("Done", { id: toastId });
                            }

                            if (text.trim()) {
                                onResult(text.trim());
                            }
                        } else {
                            toast.dismiss(toastId);
                        }
                    } catch (error) {
                        console.error("Whisper Error:", error);
                        toast.error("Transcription Failed");
                    } finally {
                        setIsProcessing(false);
                        setIsListening(false);
                        stream.getTracks().forEach(t => t.stop());
                    }
                };

                mediaRecorder.start();
                setIsListening(true);
                toast.success("🎤 Recording...", { duration: 1500 });
            } catch (error) {
                console.error("Mic Error:", error);
                toast.error("Microphone Access Denied");
            }
        }
    }, [mode, onResult, onCommand]);

    const stopListening = useCallback(() => {
        if (mode === "web") {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                toast.info("⏹️ Stopped");
            }
        } else {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        }
    }, [mode]);

    const toggleListening = useCallback(() => {
        if (isListeningRef.current) stopListening();
        else startListening();
    }, [startListening, stopListening]);

    // --- GLOBAL KEYBOARD SHORTCUT (RIGHT ALT) with Visual Feedback ---
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === "AltRight" && !event.repeat) {
                event.preventDefault();
                setKeyboardHintVisible(true);

                if (isListeningRef.current) {
                    stopListening();
                } else {
                    startListening();
                }

                // Hide hint after 2 seconds
                setTimeout(() => setKeyboardHintVisible(false), 2000);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [startListening, stopListening]);

    return {
        isListening,
        isProcessing,
        toggleListening,
        mode,
        setMode,
        keyboardHintVisible,
        hasSupport: !!(navigator.mediaDevices || (window as any).SpeechRecognition)
    };
};
