export interface Sport {
  id: number;
  name: string;
}

export const SPORTS: Sport[] = [
  { id: 1, name: 'Futsal' },
  { id: 2, name: 'Cricket' },
  { id: 3, name: 'Badminton' },
  { id: 4, name: 'Padel' },
  { id: 5, name: 'Table Tennis' },
];

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Positions available per sport (used by player registration)
export const POSITIONS_BY_SPORT: Record<number, string[]> = {
  1: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'], // Futsal
  2: ['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'], // Cricket
  3: ['Singles Player', 'Doubles Player'], // Badminton
  4: ['Player'], // Padel
  5: ['Player'], // Table Tennis
};

// A consistent badge colour variant per sport
export const SPORT_BADGE_VARIANT: Record<number, 'success' | 'info' | 'warning' | 'default'> = {
  1: 'success', // Futsal - green
  2: 'info', // Cricket - blue
  3: 'warning', // Badminton - orange
  4: 'default', // Padel
  5: 'default', // Table Tennis
};

export function getSportName(id: number): string {
  return SPORTS.find((s) => s.id === id)?.name ?? `Sport #${id}`;
}

// Generic playing positions used by registration (associated with Futsal by default).
export const PLAYING_POSITIONS = [
  'Goalkeeper',
  'Defender',
  'Midfielder',
  'Forward',
  'All Rounder',
  'Others',
];

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// Cities offered in the registration/city dropdowns.
export const CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
];
