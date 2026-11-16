import { getInterview, getInterviewAnswers } from '@/actions/interview'
import { averageRating, parseRating } from '@/utils/rating'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function Feedback({ params }) {
    const { interviewId } = await params;

    // Show the 404 page for interviews that don't exist or belong to someone else.
    const interview = await getInterview(interviewId);
    if (!interview) notFound();

    const answerRows = await getInterviewAnswers(interviewId);

    // Older interviews can have several saved answers for the same question
    // (re-recording used to add a new row). Keep only the most recent one.
    // Rows arrive oldest-first, so later rows overwrite earlier ones.
    const latestByQuestion = new Map();
    for (const row of answerRows) {
        latestByQuestion.set(row.question, row);
    }

    // `score` is a number from 0 to 5, or null if the answer was never rated.
    const feedbackList = [...latestByQuestion.values()].map((row) => ({
        ...row,
        score: parseRating(row.rating),
    }));

    // Unrated answers are left out of the average instead of counting as 0.
    const overallRating = averageRating(feedbackList.map((item) => item.score));

    const RatingBar = ({ rating }) => {
        const normalizedRating = rating ?? 0;
        const ratingPercentage = (normalizedRating / 5) * 100;

        // Determine color gradient based on rating
        const getColorGradient = () => {
            if (normalizedRating <= 1) {
                return 'from-red-600 to-red-400'; // Very low rating - deep red
            } else if (normalizedRating <= 2) {
                return 'from-red-600 via-orange-500 to-orange-400'; // Low rating - red to orange
            } else if (normalizedRating <= 3) {
                return 'from-orange-500 via-yellow-500 to-yellow-400'; // Medium rating - orange to yellow
            } else if (normalizedRating <= 4) {
                return 'from-yellow-500 via-green-500 to-green-400'; // Good rating - yellow to green
            } else {
                return 'from-green-600 to-green-400'; // Excellent rating - full green
            }
        };

        return (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                    className={`h-2.5 rounded-full transition-all duration-300 
                        bg-gradient-to-r ${getColorGradient()}`}
                    style={{ 
                        width: `${ratingPercentage}%`,
                    }}
                ></div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-700 via-black to-slate-800 text-white overflow-hidden">
            <div className="mt-6 container mx-auto px-6 py-10 h-full overflow-auto no-scrollbar">
                <div className="space-y-8">
                    {/* Desktop/Tablet Back to Dashboard Button */}
                    <div className='hidden md:flex justify-between items-center'>
                        <div className='flex flex-col'>
                            <h2 className="mt-16 text-4xl md:text-5xl font-bold 
                                bg-clip-text text-transparent 
                                bg-gradient-to-r from-cyan-300 to-blue-500 mb-2">
                                Congratulations!
                            </h2>
                            <h3 className="text-2xl font-bold text-gray-300">
                                Here is your Interview Feedback
                            </h3>
                        </div>
                        <Link href='/dashboard'>
                            <Button 
                                className="text-lg p-6 mr-2 mt-10 bg-transparent border-white/20 text-white hover:bg-white/10 flex items-center space-x-2"
                            >
                                <ArrowLeft size={20} />
                                <span>Back to Dashboard</span>
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Back to Dashboard Button */}
                    <div className='md:hidden flex justify-between items-center mb-4'>
                        <div>
                            <h2 className="text-3xl font-bold 
                                bg-clip-text text-transparent 
                                bg-gradient-to-r from-cyan-300 to-blue-500 mb-2">
                                Congratulations!
                            </h2>
                            <h3 className="text-xl font-bold text-gray-300">
                                Interview Feedback
                            </h3>
                        </div>
                    </div>
                    
            

                    {feedbackList.length === 0 ? (
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-bold 
                                bg-clip-text text-transparent 
                                bg-gradient-to-r from-pink-500 to-purple-500">
                                No Interview Feedback Record Found
                            </h2>
                        </div>
                    ) : (
                        <>
                            <div className=" bg-purple-500/10 border-purple-500/30 blue-500/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                                <div className="flex items-center space-x-4">
                                    <h2 className="text-xl font-bold text-gray-300">
                                        Overall Rating:
                                    </h2>
                                    <span className="text-3xl font-bold 
                                        bg-clip-text text-transparent 
                                        bg-gradient-to-r from-cyan-300 to-blue-500">
                                        {overallRating !== null ? overallRating.toFixed(1) : "–"}/5
                                    </span>
                                    <RatingBar rating={overallRating} />
                                </div>
                                <p className="text-gray-400 mt-2">
                                    Detailed AI Analysis of your Interview
                                </p>
                            </div>

                            <div className="space-y-4">
                                {feedbackList.map((item) => (
                                    <Collapsible key={item.id}>
                                        <CollapsibleTrigger className='w-full'>
                                            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 
                                                border border-white/10 flex justify-between items-center 
                                                hover:bg-white/10 transition-all">
                                                <span className="text-gray-300 font-light">
                                                    {item.question}
                                                </span>
                                                <ChevronsUpDown className="text-gray-500 w-5 h-5" />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="bg-white/5 backdrop-blur-xl rounded-b-xl p-6 
                                                border border-white/10 space-y-4">
                                                <div className={`p-4 rounded-xl
                                                    ${item.score === null
                                                        ? 'bg-white/10 border-white/20'
                                                        : item.score > 2
                                                            ? 'bg-green-500/10 border-green-500/30'
                                                            : 'bg-red-500/10 border-red-500/30'}`}>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold text-gray-300">Rating:</span>
                                                        <span className="text-lg font-bold
                                                            bg-clip-text text-transparent
                                                            bg-gradient-to-r from-cyan-300 to-blue-500">
                                                            {item.score === null ? 'Not rated' : `${item.score.toFixed(1)}/5`}
                                                        </span>
                                                        <RatingBar rating={item.score} />
                                                    </div>
                                                </div>

                                                <div className="bg-white/10 p-4 rounded-xl">
                                                    <h3 className="text-cyan-400 font-bold mb-2">Your Answer:</h3>
                                                    <p className="text-gray-300">{item.userAnswer}</p>
                                                </div>

                                                <div className="bg-white/10 p-4 rounded-xl">
                                                    <h3 className="text-green-400 font-bold mb-2">AI&apos;s Answer:</h3>
                                                    <p className="text-gray-300">{item.correctAns}</p>
                                                </div>

                                                <div className="bg-yellow-500/10 border-yellow-500/30 p-4 rounded-xl">
                                                    <h3 className="text-yellow-400 font-bold mb-2">Feedback:</h3>
                                                    <p className="text-gray-300">{item.feedback}</p>
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Mobile Back to Dashboard Button */}
                    <div className='md:hidden flex justify-end mt-6'>
                        <Link href='/dashboard'>
                            <Button 
                                className="text-lg p-6 bg-transparent border-white/20 text-white hover:bg-white/10 flex items-center space-x-2"
                            >
                                <ArrowLeft size={20} />
                                <span>Back to Dashboard</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Feedback;