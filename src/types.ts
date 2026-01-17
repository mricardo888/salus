export enum AppView {
  LANDING = 'LANDING',
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
