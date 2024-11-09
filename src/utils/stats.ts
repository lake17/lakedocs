// src/utils/stats.ts
import dayjs from "dayjs";
import type { Doc, TeamStats } from "../types";
import { TITLE_THRESHOLDS } from "../types";

export const getCreatedDocs = (docs: Doc[]) => 
  docs.filter(doc => doc.data.createdOn);

export const sortByCreatedDate = (docs: Doc[]) => 
  docs.sort((a, b) => {
    const aDate = new Date(a.data.createdOn!);
    const bDate = new Date(b.data.createdOn!);
    return bDate.getTime() - aDate.getTime();
  });

export const filterByTimePeriod = (docs: Doc[], period: "week" | "month") =>
  docs.filter(doc => 
    doc.data.createdOn && dayjs(doc.data.createdOn).isSame(dayjs(), period)
  );

export const getPosition = (stats: TeamStats[], currentTeam: TeamStats): number => {
  const sortedTeams = [...stats].sort((a, b) => b.docs - a.docs);
  let rank = 1;
  let prevScore = null;
  
  for (const team of sortedTeams) {
    if (team.docs === currentTeam.docs) {
      return rank;
    }
    if (team.docs !== prevScore) {
      rank++;
      prevScore = team.docs;
    }
  }
  return rank;
};

export const calculateRank = (score: number): 1|2|3|4|5|6|0 => {
  for (let i = 6; i >= 1; i--) {
    if (score >= TITLE_THRESHOLDS[i]) {
      return i as 1|2|3|4|5|6;
    }
  }
  return 0;
};

export const calculateScore = (docsCount: number, avgWordsPerDoc: number): number => {
  let lengthMultiplier = 1;
  
  if (avgWordsPerDoc > 500) {
    if (avgWordsPerDoc <= 2000) {
      lengthMultiplier = 1 + (avgWordsPerDoc - 500) / 1500 * 0.5;
    } else if (avgWordsPerDoc <= 5000) {
      lengthMultiplier = 1.5 + (avgWordsPerDoc - 2000) / 3000 * 0.5;
    } else {
      lengthMultiplier = 2;
    }
  }
  
  return Math.round(docsCount * 10 * lengthMultiplier);
};

export const getMonthsBetween = (date1: Date, date2: Date): number => {
  const d1 = dayjs(date1);
  const d2 = dayjs(date2);
  
  const years = d1.year() - d2.year();
  const months = d1.month() - d2.month();
  const days = d1.date() - d2.date();
  
  return years * 12 + months + (days < 0 ? -1 : 0);
};