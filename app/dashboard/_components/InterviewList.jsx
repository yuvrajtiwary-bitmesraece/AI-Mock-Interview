"use client"

import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react'
import InterviewItemCard from './InterviewItemCard';
import { Zap } from 'lucide-react';
import { listInterviews } from '@/actions/interview';

function InterviewList() {
    const {user} = useUser();
    const [interviewList, setInterviewList] = useState([]);

    useEffect(() => {
        if (!user) return;
        // The server works out who is signed in; the browser can't ask for someone else's list.
        listInterviews().then(setInterviewList);
    }, [user])

    const handleDeleteInterview = (deletedMockId) => {
        // Remove the deleted interview from the list
        setInterviewList(prevList => 
            prevList.filter(interview => interview.mockId !== deletedMockId)
        );
    }
    
    return (
        <div className='space-y-6'>
            <div className='flex items-center space-x-4'>
                <Zap 
                    className="text-blue-400" 
                    size={30} 
                />
                <h2 className='text-2xl font-bold 
                    bg-clip-text text-transparent 
                    bg-gradient-to-r from-cyan-300 to-blue-500'>
                    Previous Mock Interviews
                </h2>
            </div>
            
            <div className='grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6'>
                {interviewList?.length == 0 ? 
                    <div className='col-span-full text-center py-12'>
                        <h1 className='text-4xl font-bold text-gray-600 
                            bg-clip-text text-transparent 
                            bg-gradient-to-r from-pink-500 to-purple-500'>
                            No Previous Interviews Found
                        </h1>
                        <p className='text-gray-400 mt-4'>
                            Click on the Button on the left to get started
                        </p>
                    </div>
                    :
                    interviewList?.map((interview, index) => (
                        <InterviewItemCard 
                            key={index} 
                            interview={interview}
                            onDelete={handleDeleteInterview}
                        />
                    ))
                }
            </div>
        </div>
    )
}

export default InterviewList
