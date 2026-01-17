import { useEffect, useRef, useState } from 'react';

export const useElevenLabs = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContext = useRef<AudioContext | null>(null);
    const ws = useRef<WebSocket | null>(null);

    const speak = async (text: string) => {
        // IMPORTANT: This requires an ElevenLabs API Key in .env.local
        // NEXT_PUBLIC_ELEVENLABS_KEY
        const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_KEY;
        if (!apiKey) {
            console.warn("ElevenLabs API Key missing");
            return;
        }

        const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel
        const model = "eleven_monolingual_v1";
        const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            const bosMessage = {
                text: " ",
                voice_settings: { stability: 0.5, similarity_boost: 0.8 },
                xi_api_key: apiKey,
            };
            ws.current?.send(JSON.stringify(bosMessage));
            ws.current?.send(JSON.stringify({ text, try_trigger_generation: true }));
            ws.current?.send(JSON.stringify({ text: "" })); // EOS
        };

        ws.current.onmessage = async (event) => {
            const response = JSON.parse(event.data);
            if (response.audio) {
                if (!audioContext.current) audioContext.current = new AudioContext();

                const audioData = atob(response.audio);
                const arrayBuffer = new ArrayBuffer(audioData.length);
                const view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < audioData.length; i++) {
                    view[i] = audioData.charCodeAt(i);
                }

                const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                const source = audioContext.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.current.destination);
                source.start();
                setIsPlaying(true);
                source.onended = () => setIsPlaying(false);
            }
        };
    };

    return { speak, isPlaying };
};
