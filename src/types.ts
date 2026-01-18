export enum AppView {
  LANDING = 'LANDING',
  PROFILE = 'PROFILE',
  DASHBOARD = 'DASHBOARD',
  DEBUGGER = 'DEBUGGER',
  RESULTS = 'RESULTS'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface UserProfile {
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  region: 'Ontario' | 'New York';
}
