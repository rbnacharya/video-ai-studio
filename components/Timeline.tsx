import React, { useState } from 'react';
import { Scene } from '../types';
import { Play, Check, AlertCircle, Loader2, Video as VideoIcon } from 'lucide-react';

interface TimelineProps {
  scenes: Scene[];
  onGenerate: (id: string) => void;
  onDelete: (id: string) => void;
  aspectRatio: '16:9' | '9:16';
}

const Timeline: React.FC<TimelineProps> = ({ scenes, onGenerate, onDelete, aspectRatio }) => {
  
  // Calculate width/height classes based on aspect ratio for preview
  const aspectClass = aspectRatio === '16:9' ? 'aspect-video w-72' : 'aspect-[9/16] w-40';

  return (
    <div className="w-full overflow-x-auto pb-6 pt-2 custom-scrollbar">
      <div className="flex gap-6 min-w-max px-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="flex flex-col gap-3 group relative">
             {/* Card */}
             <div className={`relative ${aspectClass} bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 transition-all duration-300 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100 hover:-translate-y-1`}>
                
                {/* Status Indicator / Overlay */}
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold font-mono text-zinc-600 shadow-sm border border-white/50">
                  {String(scene.order).padStart(2, '0')}
                </div>

                {/* Content */}
                {scene.status === 'completed' && scene.videoUrl ? (
                  <video 
                    src={scene.videoUrl} 
                    className="w-full h-full object-cover" 
                    controls 
                    loop
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50/50">
                    {scene.status === 'generating' ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                        <span className="text-xs text-rose-600 font-bold uppercase tracking-wider">Rendering</span>
                      </div>
                    ) : scene.status === 'error' ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                        <span className="text-xs text-red-500 font-medium">Generation Failed</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-300 group-hover:text-rose-400 transition-colors duration-300">
                        <VideoIcon className="w-10 h-10" />
                        <span className="text-xs font-medium">Ready to Render</span>
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* Description & Controls */}
             <div className="w-full max-w-[18rem] space-y-3">
               <p className="text-xs text-zinc-500 line-clamp-2 min-h-[2.5em] font-medium leading-relaxed">{scene.description}</p>
               
               <div className="flex gap-2">
                 {scene.status !== 'generating' && scene.status !== 'completed' && (
                   <button
                     onClick={() => onGenerate(scene.id)}
                     className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-100 transition-colors flex items-center justify-center gap-1.5"
                   >
                     <Play className="w-3 h-3 fill-current" /> GENERATE
                   </button>
                 )}
                 {scene.status === 'completed' && (
                    <div className="flex-1 py-2 px-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5 cursor-default">
                      <Check className="w-3 h-3" /> DONE
                    </div>
                 )}
                 <button 
                  onClick={() => onDelete(scene.id)}
                  className="px-3 py-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors text-xs font-medium"
                 >
                   Delete
                 </button>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;