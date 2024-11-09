import fs from 'node:fs';
import path from 'node:path';
import dayjs from "dayjs";
import type { Doc, TeamMember, TeamStats, RequestedDoc } from "../types";
import { calculateScore, getMonthsBetween } from "./stats";

const getBountyInfo = (doc: Doc, requests: RequestedDoc[]): RequestedDoc | undefined => {
  return requests.find(request => 
    request.status === 'fulfilled' && 
    request.docId === doc.slug
  );
};

export const calculateTeamStats = (team: TeamMember[], periodDocs: Doc[]): TeamStats[] => {
  // Load requests
  const requestsPath = path.resolve('./src/data/requested-docs.json');
  const requests: RequestedDoc[] = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));

  const stats = team.map(member => {
    const memberDocs = periodDocs.filter(doc => doc.data.owner === member.email);
    let totalScore = 0;
    let totalWords = 0;
    
    memberDocs.forEach(doc => {
      const words = doc.body.length;
      totalWords += words;
      
      const baseScore = calculateScore(1, words);
      const bounty = getBountyInfo(doc, requests);
      
      if (bounty) {
        const monthsWaiting = getMonthsBetween(new Date(bounty.fulfilledOn), new Date(bounty.since));
        let multiplier = 1.2;
        
        multiplier += Math.min(monthsWaiting / 12, 0.6);
        
        if (bounty.type === 'explanation') {
          multiplier += 0.4;
        }
        
        multiplier = Math.min(multiplier, 3.0);
        totalScore += Math.round(baseScore * multiplier);
      } else {
        totalScore += baseScore;
      }
    });
    
    return {
      ...member,
      docs: memberDocs.length,
      words: totalWords,
      score: totalScore
    };
  });

  return stats.sort((a, b) => b.score - a.score);
};

export const getPendingRequests = (): RequestedDoc[] => {
  const requestsPath = path.resolve('./src/data/requested-docs.json');
  const requests: RequestedDoc[] = JSON.parse(fs.readFileSync(requestsPath, 'utf8'));
  return requests.filter(request => request.status === 'pending');
};

export const processTeamStats = async (docs: Doc[], team: TeamMember[]) => {
  const createdDocs = docs.filter(doc => doc.data.createdOn);
  const sortedDocs = createdDocs.sort((a, b) => {
    const aDate = new Date(a.data.createdOn!);
    const bDate = new Date(b.data.createdOn!);
    return bDate.getTime() - aDate.getTime();
  });
  
  return {
    sortedDocs,
    weeklyStats: calculateTeamStats(
      team, 
      sortedDocs.filter(doc => doc.data.createdOn && dayjs(doc.data.createdOn).isSame(dayjs(), "week"))
    ),
    monthlyStats: calculateTeamStats(
      team,
      sortedDocs.filter(doc => doc.data.createdOn && dayjs(doc.data.createdOn).isSame(dayjs(), "month"))
    ),
    allTimeStats: calculateTeamStats(team, sortedDocs)
  };
};