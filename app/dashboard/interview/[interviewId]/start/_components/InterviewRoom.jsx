"use client"

import React, { useState } from 'react'
import QuestionsSection from './QuestionsSection';
import RecordAnsSection from './RecordAnsSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, StopCircle } from 'lucide-react';

/** The interview itself: question panel, answer recorder and navigation. */
function InterviewRoom({ mockId, questions }) {
    const mockInterviewQues = questions;
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    return (
        <div className="text-white">
            <div>
                <div className='flex flex-col md:grid md:grid-cols-2 gap-12 h-full'>
                    {/* Questions Section - Always First on Mobile */}
                    <div className='order-1 md:order-none mt-6'>
                        <QuestionsSection 
                            mockInterviewQues={mockInterviewQues}
                            activeQuestionIndex={activeQuestionIndex}
                            onQuestionChange={setActiveQuestionIndex}
                        />
                    </div>

                    {/* Recording Section - Second on Mobile */}
                    <div className='order-2 md:order-none'>
                        <RecordAnsSection
                            mockInterviewQues={mockInterviewQues}
                            activeQuestionIndex={activeQuestionIndex}
                            mockId={mockId}
                        />
                    </div>

                    {/* Navigation Buttons - Always Last on Mobile */}
                    <div className='order-3 md:order-none mt-6 md:-mt-2'>
                        <div className='flex justify-end space-x-4 mb-6'>
                            {activeQuestionIndex > 0 && (
                                <Button 
                                    onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
                                    className='bg-transparent border-white/20 text-white hover:bg-white/10 flex items-center space-x-2'
                                >
                                    <ArrowLeft size={16} />
                                    <span>Previous</span>
                                </Button>
                            )}
                            
                            {activeQuestionIndex < mockInterviewQues?.length - 1 && (
                                <Button 
                                    onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                                    className='bg-gradient-to-r from-cyan-500 to-blue-500 
                                    hover:from-cyan-600 hover:to-blue-600 
                                    flex items-center space-x-2'
                                >
                                    <span>Next</span>
                                    <ArrowRight size={16} />
                                </Button>
                            )}
                            
                            
                            <Link href={`/dashboard/interview/${mockId}/feedback`}>
                                <Button 
                                    className='bg-red-500/20 border-red-500/30 
                                    hover:bg-red-500/40 text-red-400 
                                    flex items-center space-x-2'
                                >
                                    <StopCircle size={16} />
                                    <span>End</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InterviewRoom