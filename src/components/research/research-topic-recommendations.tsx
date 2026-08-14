'use client';

import React from 'react';
import { ResearchRecommendation } from '@/lib/research/types';
import { ResearchIntelligenceCard } from './research-intelligence-card';
import { Compass, Sparkles } from 'lucide-react';

interface ResearchTopicRecommendationsProps {
  recommendations: ResearchRecommendation[];
}

export const ResearchTopicRecommendations: React.FC<ResearchTopicRecommendationsProps> = ({
  recommendations,
}) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
        <Compass className="w-4 h-4 flex-shrink-0" />
        <span>Personalized Research Recommendations</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recommendations.map((rec) => (
          <ResearchIntelligenceCard key={rec.id} rec={rec} />
        ))}
      </div>
    </section>
  );
};

export default ResearchTopicRecommendations;
