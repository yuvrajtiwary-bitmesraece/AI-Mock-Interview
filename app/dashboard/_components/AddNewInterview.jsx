"use client"
import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Zap, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createInterview } from '@/actions/interview';

function AddNewInterview() {
    const [openDialog, setOpenDialog]=useState(false);
    const [jobTitle, setJobTitle]=useState();
    const [jobDescription, setJobDescription]=useState();
    const [techStacks, setTechStacks]=useState();
    const [duration, setDuration]=useState();
    const [loading, setLoading]=useState(false);
    const router=useRouter();

    const onSubmit = async (event) => {
      event.preventDefault();
      setLoading(true);

      try {
          // Runs on the server: generates the questions with Gemini and saves the interview.
          const result = await createInterview({
              jobPosition: jobTitle,
              jobDescription,
              techStacks,
              jobExperience: duration,
          });

          if (result.success) {
              setOpenDialog(false);
              router.push('/dashboard/interview/' + result.mockId);
          } else {
              toast.error(result.error);
          }
      } catch (error) {
          console.error("Failed to create interview:", error);
          toast.error("Could not generate the interview. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div>
      {/* Create Interview Trigger */}
      <div 
        className='p-8 border-2 border-transparent 
        bg-white/4 backdrop-blur-xl 
        rounded-2xl 
        hover:border-blue-500/50 
        cursor-pointer 
        transition-all duration-300 
        transform hover:scale-105 
        hover:shadow-2xl 
        flex flex-col items-center justify-center'
        onClick={() => setOpenDialog(true)}
      >
        <PlusCircle 
          className="text-blue-400 mb-4 
          group-hover:text-white 
          group-hover:animate-pulse 
          transition-colors duration-300" 
          size={40} 
        />
        <h2 className='font-bold text-xl text-center 
          bg-clip-text text-transparent 
          bg-gradient-to-r from-cyan-200 to-blue-400 
          group-hover:text-white'>
          The AI Magic!
        </h2>
        <h5 className='font-light text-sm text-center 
          bg-clip-text text-transparent 
          bg-gradient-to-r from-cyan-200 to-blue-400 
          group-hover:text-white'>(Click here)</h5>
      </div>

      {/* Dialog Content */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className='max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-bold text-white flex items-center space-x-3'>
              <Zap className="text-blue-400" size={28} />
              <span>Design Your AI Interview Experience</span>
            </DialogTitle>
            <DialogDescription className='text-gray-400 mt-2'>
              Craft a personalized interview simulation tailored to your career goals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className='space-y-6 pt-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Job Title */}
              <div>
                <label className='block text-sm font-semibold text-white mb-2'>
                  Job Title
                </label>
                <Input 
                  placeholder="Ex: Full Stack Developer" 
                  required
                  className='bg-white/10 border-white/20 text-white 
                  focus:ring-2 focus:ring-blue-500'
                  onChange={(event) => setJobTitle(event.target.value)}
                />
              </div>

              {/* Tech Stacks */}
              <div>
                <label className='block text-sm font-semibold text-white mb-2'>
                  Tech Stacks
                </label>
                <Input 
                  placeholder="Ex: React, Node.js, Docker" 
                  required
                  className='bg-white/10 border-white/20 text-white 
                  focus:ring-2 focus:ring-blue-500'
                  onChange={(event) => setTechStacks(event.target.value)}
                />
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className='block text-sm font-semibold text-white mb-2'>
                Job Description
              </label>
              <Textarea 
                placeholder="Detailed job role and responsibilities" 
                required
                className='bg-white/10 border-white/20 text-white 
                focus:ring-2 focus:ring-blue-500 min-h-[120px]'
                onChange={(event) => setJobDescription(event.target.value)}
              />
            </div>

            {/* Experience */}
            <div>
              <label className='block text-sm font-semibold text-white mb-2'>
                Years of Experience
              </label>
              <Input 
                type="number" 
                placeholder="0-50" 
                max="50" 
                required
                className='bg-white/10 border-white/20 text-white 
                focus:ring-2 focus:ring-blue-500'
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
            
            {/* Action Buttons */}
            <div className='flex justify-end space-x-4 pt-4'>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpenDialog(false)} 
                className='bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white'
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className='bg-gradient-to-r from-cyan-500 to-blue-500 
                text-white hover:from-cyan-600 hover:to-blue-600 
                flex items-center space-x-2'
              >
                {loading ? (
                  <>
                    <LoaderCircle className='animate-spin mr-2'/>
                    Generating AI Interview
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Start Interview</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AddNewInterview

