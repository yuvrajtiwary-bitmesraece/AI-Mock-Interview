import { Lightbulb, Volume2 } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';

function QuestionsSection({mockInterviewQues, activeQuestionIndex, onQuestionChange}) {
    const [isSpeaking, setIsSpeaking] = useState(false);

    const textToSpeech = (text) => {
        if (!text) return;
        if('speechSynthesis' in window){
            // Cancel anything already playing so clicks don't queue up overlapping speech.
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.onstart = () => setIsSpeaking(true);
            msg.onend = () => setIsSpeaking(false);
            msg.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(msg);
        }
        else{
            toast.error('Sorry! Your browser does not support text-to-speech');
        }
    }

    // Stop reading the old question when the user switches question or leaves the page.
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
        };
    }, [activeQuestionIndex]);

    const handleQuestionChange = (index) => {
        if (onQuestionChange) {
            onQuestionChange(index);
        }
    }

  return mockInterviewQues && (
    <div className='bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-6'>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {mockInterviewQues && mockInterviewQues.map((question, index)=>(
                <button 
                    key={index} 
                    onClick={() => handleQuestionChange(index)}
                    className={`
                        p-2 
                        rounded-xl 
                        text-center 
                        cursor-pointer 
                        transition-all 
                        duration-300 
                        focus:outline-none
                        ${activeQuestionIndex === index 
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' 
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'}
                    `}
                >
                    <span className='text-sm font-light'>
                        Question #{index+1}
                    </span>
                </button>
            ))}
        </div>

        <div className='space-y-4'>
            <h2 className='text-xl font-bold 
                bg-clip-text text-transparent 
                bg-gradient-to-r from-cyan-300 to-blue-500'>
                Q. {mockInterviewQues[activeQuestionIndex]?.ques}
            </h2>
            
            <button
                type='button'
                aria-label='Read the question aloud'
                className='inline-block cursor-pointer
                bg-white/10 p-2 rounded-full
                hover:bg-white/20 transition-all'
                onClick={() => textToSpeech(mockInterviewQues[activeQuestionIndex]?.ques)}
            >
                {isSpeaking ?
                    <Volume2 className="animate-pulse text-blue-400" /> :
                    <Volume2 className='text-blue-400' />
                }
            </button>
        </div>

        <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6'>
            <div className='flex items-center space-x-3 mb-4'>
                <Lightbulb className='text-yellow-500' />
                <h2 className='text-xl font-bold text-yellow-500'>
                    Important Information
                </h2>
            </div>
            <p className='text-sm mb-3 text-yellow-300'>
                Enable your webcam and microphone for the AI-powered mock interview.
                This session includes {mockInterviewQues.length} questions to help assess and improve your interview skills.
            </p>
            <p className='text-xs text-yellow-600'>
                <strong>Note:</strong> This app never records or stores your video or audio. Only the text of your answers is saved, so you can review your feedback.
                Give a buffer time of 2 seconds before and after clicking on the Record Box.
            </p>
        </div>
    </div>
  )
}

export default QuestionsSection