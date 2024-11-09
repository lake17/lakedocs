// scripts/sync-webex-avatars.ts
import fs from 'node:fs';
import path from 'node:path';
import Request from 'sync-request';

const WEBEX_TOKEN = "M2RjOGIzZTctMDNiMi00YzkxLTliMzAtYjFiMDEwYTYzNzAzOGFiOWNhNTctNmNl_PF84_91dd6f49-8765-430d-aec3-ea9570a56933";

interface TeamMember {
  name: string;
  avatar: string;
  email: string;
  rank: 1|2|3|4|5|6;
  bonus: number;
  id: string;
  total: number;
}

const getLatestAvatar = (id: string): string => {
  try {
    const response = Request('GET', 'https://webexapis.com/v1/people', {
      qs: { id },
      headers: {
        Authorization: 'Bearer ' + WEBEX_TOKEN
      }
    });
    
    const data = JSON.parse(response.getBody('utf8'));
    return data.items?.[0]?.avatar || "";
  } catch (error) {
    console.error(`Failed to get avatar for ID ${id}:`, error);
    return "";
  }
}

const syncWebexAvatars = () => {
  try {
    // Read the current team data
    const teamPath = path.resolve('./src/data/team.json');
    const team: TeamMember[] = JSON.parse(fs.readFileSync(teamPath, 'utf8'));
    
    // Update avatars
    const updatedTeam = team.map(user => ({
      ...user,
      avatar: getLatestAvatar(user.id)
    }));

    // Write updated data
    const outputPath = path.resolve('./src/data/team_webex.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(updatedTeam, null, 2),
      'utf8'
    );
    
    console.log('Successfully synced Webex avatars');
  } catch (error) {
    console.error('Error syncing Webex avatars:', error);
    process.exit(1);
  }
}

// Run the sync
syncWebexAvatars();