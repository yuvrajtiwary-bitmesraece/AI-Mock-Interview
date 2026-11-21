"use client"

import { Button } from '@/components/ui/button';
import { Lightbulb, WebcamIcon, ArrowLeft, Play, CameraOff } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useRef } from 'react'
import Webcam from 'react-webcam';

/** Pre-interview screen: role details and a camera check. Data comes from the server page. */
function InterviewLobby({ interview, questionCount }) {
    const [webcamEnabled, setWebcamEnabled] = useState(false);
    const webcamRef = useRef(null);
    const interviewData = interview;

    const disableWebcam = () => {
        // `stream` is null until the camera has started, so guard against it.
        webcamRef.current?.stream?.getTracks().forEach(track => track.stop());
        setWebcamEnabled(false);
    }

    return (
        <div className="text-white">
            <div>
                <h2 className='text-4xl font-bold mb-8 
                    bg-clip-text text-transparent 
                    bg-gradient-to-r from-cyan-300 to-blue-500'>
                    Gear up for Your Interview!
                </h2>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-12'>
                    {/* Interview Details */}
                    <div className='space-y-6'>
                    <div className='bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10'>
                            <div className='space-y-4'>
                                <div className='flex items-center space-x-3'>
                                    <span className='w-2 h-2 bg-blue-500 rounded-full'></span>
                                    <h2 className='text-lg font-bold'>
                                        <span className='text-gray-400 mr-2'>Job Title:</span>
                                        <span className='bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500'>
                                            {interviewData?.jobPosition}
                                        </span>
                                    </h2>
                                </div>
                                <div className='flex items-center space-x-3'>
                                    <span className='w-2 h-2 bg-green-500 rounded-full'></span>
                                    <h2 className='text-lg font-bold'>
                                        <span className='text-gray-400 mr-2'>Tech Stacks:</span>
                                        <span className='bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500'>
                                            {interviewData?.techStacks}
                                        </span>
                                    </h2>
                                </div>
                                <div className='flex items-center space-x-3'>
                                    <span className='w-2 h-2 bg-purple-500 rounded-full'></span>
                                    <h2 className='text-lg font-bold'>
                                        <span className='text-gray-400 mr-2'>Job Experience:</span>
                                        <span className='bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500'>
                                            {interviewData?.jobExperience}
                                        </span>
                                    </h2>
                                </div>
                            </div>
                        </div>
                        {/* ... (previous interview details code remains the same) */}
                        <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6'>
                            <div className='flex items-center space-x-3 mb-4'>
                                <Lightbulb className='text-yellow-500' />
                                <h2 className='text-xl font-bold text-yellow-500'>
                                    Important Information
                                </h2>
                            </div>
                            <p className='text-gray-300 text-sm text-yellow-300'>
                                Enable your webcam and microphone for the AI-powered mock interview. 
                                This session includes {questionCount || 'several'} questions to help assess and improve your interview skills.
                            </p>
                            <p className='text-xs text-yellow-600 mt-3'>
                                <strong>Note:</strong> This app never records or stores your video or audio. Only the text of your answers is saved, so you can review your feedback.
                            </p>
                        </div>
                    </div>

                    {/* Webcam Section */}
                    <div className='bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10'>
                        {webcamEnabled ? 
                            <div className='space-y-8'>
                                <Webcam
                                    ref={webcamRef}
                                    onUserMedia={() => setWebcamEnabled(true)}
                                    onUserMediaError={() => setWebcamEnabled(false)}
                                    mirrored={true}
                                    style={{
                                        height: 300,
                                        width: '100%',
                                        // borderRadius: '12px',
                                    }}
                                />
                                <Button 
                                    variant="destructive"
                                    onClick={disableWebcam}
                                    className='w-full flex items-center justify-center space-x-2 
                                    bg-red-500/20 border-red-500/30 
                                    hover:bg-red-500/40 text-red-400'
                                >
                                    <CameraOff size={16} />
                                    <span>Disable Camera</span>
                                </Button>
                            </div>
                            :
                            <div className='flex flex-col items-center space-y-6'>
                                <div className='bg-white/10 p-12 rounded-2xl'>
                                    <WebcamIcon 
                                        className='w-32 h-32 text-blue-400/50' 
                                        strokeWidth={1}
                                    />
                                </div>
                                <Button 
                                    onClick={() => setWebcamEnabled(true)}
                                    className='bg-gradient-to-r from-cyan-500 to-blue-500 
                                    hover:from-cyan-600 hover:to-blue-600 
                                    flex items-center space-x-2 font-bold'
                                >
                                    <WebcamIcon size={20} />
                                    <span>Enable Webcam & Microphone</span>
                                </Button>
                            </div>
                        }
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className='mt-10 flex justify-end space-x-4'>
                    <Link href='/dashboard'>
                        <Button 
                            variant="outline" 
                            className='bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white flex items-center space-x-2'
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Dashboard</span>
                        </Button>
                    </Link>
                    <Link href={`/dashboard/interview/${interview.mockId}/start`}>
                        <Button 
                            className='bg-gradient-to-r from-cyan-500 to-blue-500 
                            hover:from-cyan-600 hover:to-blue-600 
                            flex items-center space-x-2'
                        >
                            <Play size={16} />
                            <span>Start Interview</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default InterviewLobby