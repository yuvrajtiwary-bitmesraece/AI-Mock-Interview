"use client"
import { Button } from '@/components/ui/button'
import { Mic, StopCircle, CameraOff, Edit, Check, Camera } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { toast } from 'sonner';
import { saveAnswer } from '@/actions/interview';

function RecordAnsSection({mockInterviewQues, activeQuestionIndex, mockId}) {
    const [userAnswer, setUserAnswer] = useState('');
    const [editableAnswer, setEditableAnswer] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [webcamEnabled, setWebcamEnabled] = useState(true);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef('');
    const webcamRef = useRef(null);

    // The speech-recognition handlers below are attached once, on mount. A handler
    // that read `isRecording` state would forever see its first value (false), so
    // the handlers read these refs instead, which always hold the current value.
    const isRecordingRef = useRef(false);
    // Text captured by earlier recognition sessions within the current recording.
    const savedTranscriptRef = useRef('');

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && !recognitionRef.current) {
            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

                if (!SpeechRecognition) {
                    toast.error("Speech recognition not supported in your browser");
                    return;
                }

                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;

                recognitionRef.current.onresult = (event) => {
                    let sessionTranscript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        sessionTranscript += event.results[i][0].transcript + ' ';
                    }

                    const fullTranscript = `${savedTranscriptRef.current} ${sessionTranscript}`.trim();
                    transcriptRef.current = fullTranscript;
                    setUserAnswer(fullTranscript);
                };

                recognitionRef.current.onerror = (event) => {
                    // Fired when we stop recognition ourselves; not a real error.
                    if (event.error === 'aborted') return;

                    console.error("Speech recognition error:", event.error);
                    isRecordingRef.current = false;

                    if (event.error === 'no-speech') {
                        toast.error("No speech detected. Please speak clearly.");
                    } else if (event.error === 'network') {
                        toast.error("Speech recognition network error. Check your internet connection.");
                    } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                        toast.error("Microphone access denied. Please allow microphone permissions.");
                    } else {
                        toast.error(`Speech recognition error: ${event.error}`);
                    }

                    setIsRecording(false);
                    try {
                        recognitionRef.current?.abort();
                    } catch (abortError) {
                        console.error("Failed to abort recognition after error:", abortError);
                    }
                };
                
                recognitionRef.current.onend = () => {
                    // Browsers end recognition on their own after a pause or a time
                    // limit. If the user hasn't pressed Stop, keep the text so far
                    // and start listening again.
                    if (isRecordingRef.current) {
                        savedTranscriptRef.current = transcriptRef.current;
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            console.error("Failed to restart recognition:", e);
                            isRecordingRef.current = false;
                            setIsRecording(false);
                        }
                    }
                };
            } catch (error) {
                console.error("Failed to initialize speech recognition:", error);
                toast.error("Failed to initialize speech recognition");
            }
        }

        // Stop listening if the user leaves the page mid-recording.
        return () => {
            isRecordingRef.current = false;
            recognitionRef.current?.abort();
        };
    }, []);

    // Ask for microphone permission up front, then release the microphone
    // straight away. Speech recognition opens its own audio stream.
    useEffect(() => {
        navigator.mediaDevices?.getUserMedia({ audio: true })
            .then((stream) => stream.getTracks().forEach((track) => track.stop()))
            .catch(err => {
                console.error("Microphone permission denied:", err);
                toast.error("Microphone access denied. Please check your browser permissions.");
            });
    }, []);

    // Switching questions: stop listening and clear the answer box, so text spoken
    // for one question can't be saved against another. React state is reset while
    // rendering (React's recommended way to reset state when a prop changes)...
    const [answerQuestionIndex, setAnswerQuestionIndex] = useState(activeQuestionIndex);
    if (answerQuestionIndex !== activeQuestionIndex) {
        setAnswerQuestionIndex(activeQuestionIndex);
        setIsRecording(false);
        setUserAnswer('');
        setEditableAnswer('');
        setIsEditing(false);
    }

    // ...while the recognizer and refs, which live outside React, are reset in an effect.
    useEffect(() => {
        if (isRecordingRef.current) {
            isRecordingRef.current = false;
            recognitionRef.current?.abort();
        }
        transcriptRef.current = '';
        savedTranscriptRef.current = '';
    }, [activeQuestionIndex]);

    const toggleWebcam = () => {
        if (webcamEnabled) {
            // `stream` is null until the camera has started, so guard against it.
            webcamRef.current?.stream?.getTracks().forEach(track => track.stop());
        }
        setWebcamEnabled(!webcamEnabled);
    };

    const startRecording = () => {
        if (recognitionRef.current) {
            try {
                transcriptRef.current = '';
                savedTranscriptRef.current = '';
                setUserAnswer('');
                setIsEditing(false);
                recognitionRef.current.start();
                isRecordingRef.current = true;
                setIsRecording(true);
                toast.success("Recording started");
            } catch (error) {
                console.error("Failed to start recording:", error);
                toast.error("Failed to start recording");
            }
        } else {
            toast.error("Speech recognition not available");
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            try {
                // Clear the flag first so onend doesn't restart recognition.
                isRecordingRef.current = false;
                recognitionRef.current.stop();
                setIsRecording(false);
                
                const finalTranscript = transcriptRef.current;
                
                if (finalTranscript && finalTranscript.trim().length > 5) {
                    setUserAnswer(finalTranscript);
                    setEditableAnswer(finalTranscript);
                    setIsEditing(true);
                } else {
                    toast.error("No speech detected or answer too short");
                }
            } catch (error) {
                console.error("❌ Failed to stop recording:", error);
                toast.error("Failed to stop recording");
            }
        }
    };

    const startStopRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleEditAnswer = () => {
        setEditableAnswer(userAnswer);
        setIsEditing(true);
    };

    const handleSaveEditedAnswer = () => {
        if (editableAnswer.trim().length < 5) {
            toast.error('Answer is too short');
            return;
        }

        setUserAnswer(editableAnswer);
        setIsEditing(false);
        updateUserAnswer(editableAnswer);
    };

    const updateUserAnswer = async (finalTranscript) => {
        if (!finalTranscript || finalTranscript.trim().length < 5) {
            toast.error('Answer text too short or empty!');
            return;
        }
        
        toast.info('Processing your answer...');
        setLoading(true);

        try {
            // Runs on the server: rates the answer with Gemini and saves it.
            // Only the question's index is sent; the server looks up the question itself.
            const result = await saveAnswer({
                mockId,
                questionIndex: activeQuestionIndex,
                userAnswer: finalTranscript,
            });

            if (result.success) {
                toast.success('User Answer Recorded Successfully!');
                setUserAnswer('');
                transcriptRef.current = '';
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error("🚨 Error updating user answer:", error);
            toast.error('❌ Something went wrong. Try again!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='flex flex-col items-center justify-center space-y-4 h-full'>
            {/* Webcam Section */}
            <div className='bg-white/4 backdrop-blur-xl rounded-3xl border border-white/10 p-3 w-full'>
                <div className='relative rounded-2xl overflow-hidden'>
                    {webcamEnabled ? (
                        <Webcam
                            ref={webcamRef}
                            mirrored={true}
                            style={{
                                height: 350,
                                width: '100%',
                                objectFit: 'cover',
                                borderRadius: '1rem'
                            }}
                        />
                    ) : (
                        <div className='h-[300px] flex items-center justify-center bg-gray-800 rounded-2xl'>
                            <CameraOff className='text-gray-500' size={64} />
                        </div>
                    )}
                    
                    <div className='absolute top-4 right-4 bg-black/50 rounded-sm'>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleWebcam}
                            className='text-white hover:bg-black/50 hover:text-white'
                        >
                            {webcamEnabled ? <CameraOff size={20} /> : <Camera size={20} />}
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Transcript Display with Editing */}
            {userAnswer && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 w-full border border-white/10 max-h-48 overflow-y-auto">
                    <div className='flex justify-between items-center mb-2'>
                        <h3 className="text-xl font-bold 
                            bg-clip-text text-transparent 
                            bg-gradient-to-r from-cyan-300 to-blue-500">
                            Your Answer
                        </h3>
                        {!isEditing ? (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleEditAnswer}
                                className='flex items-center space-x-2 text-black'
                            >
                                <Edit size={16} />
                                <span>You can edit after recording</span>
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleSaveEditedAnswer}
                                className='flex items-center space-x-2 font-bold border-green-500 text-green-500 hover:bg-green-500/10 hover:text-white'
                            >
                                <Check size={16} />
                                <span>Done</span>
                            </Button>
                        )}
                    </div>
                    
                    {isEditing ? (
                        <textarea
                            value={editableAnswer}
                            onChange={(e) => setEditableAnswer(e.target.value)}
                            className="w-full bg-white/10 p-3 rounded-xl text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={4}
                        />
                    ) : (
                        <p className="text-gray-300 break-words">{userAnswer}</p>
                    )}
                </div>
            )}
            
            {/* Record Button */}
            <Button 
                disabled={loading} 
                className={`
                    w-full 
                    py-6
                    flex items-center justify-center 
                    space-x-3 
                    ${isRecording 
                        ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/40 text-red-400' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'}
                `}
                onClick={startStopRecording}
            >
                {isRecording ? (
                    <>
                        <StopCircle className="animate-pulse" size={24} />
                        <span className='font-bold animate-pulse'>Stop Recording</span>
                    </>
                ) : (
                    <>
                        <Mic size={24} />
                        <span>Record Your Answer</span>
                    </>
                )}
            </Button>
        </div>
    );
}

export default RecordAnsSection;