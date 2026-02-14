import { useEffect, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "regenerator-runtime/runtime";

interface UseSpeechToTextProps {
    onResult: (text: string) => void;
    continuous?: boolean;
}

export const useSpeechToText = ({ onResult, continuous = true }: UseSpeechToTextProps) => {
    const {
        transcript,
        finalTranscript,
        resetTranscript,
        listening,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    useEffect(() => {
        console.log("Speech State Update:", {
            listening,
            browserSupportsSpeechRecognition,
            isMicrophoneAvailable,
            transcript,
            finalTranscript
        });
    }, [listening, browserSupportsSpeechRecognition, isMicrophoneAvailable, transcript, finalTranscript]);

    useEffect(() => {
        if (!browserSupportsSpeechRecognition) {
            console.error("Browser does not support Speech Recognition!");
        }
        if (!isMicrophoneAvailable) {
            console.warn("Microphone is not available (permission denied or missing).");
        }
    }, [browserSupportsSpeechRecognition, isMicrophoneAvailable]);


    useEffect(() => {
        if (finalTranscript !== "") {
            console.log("Voice Result:", finalTranscript);
            onResult(finalTranscript);
            resetTranscript();
        }
    }, [finalTranscript, onResult, resetTranscript]);

    const startListening = useCallback(() => {
        console.log("Starting listening...", { continuous });
        SpeechRecognition.startListening({ continuous, language: "en-US" });
    }, [continuous]);

    const stopListening = useCallback(() => {
        console.log("Stopping listening...");
        SpeechRecognition.stopListening();
    }, []);

    const toggleListening = useCallback(() => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    }, [listening, startListening, stopListening]);

    return {
        isListening: listening,
        toggleListening,
        hasSupport: browserSupportsSpeechRecognition
    };
};