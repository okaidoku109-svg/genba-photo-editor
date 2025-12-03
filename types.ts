export enum SignboardType {
  BLACKBOARD = 'BLACKBOARD',
  WHITE = 'WHITE'
}

export interface SignboardData {
  title: string;
  item: string;
  details: string;
  fontSizeTitle: number;
  fontSizeItem: number;
  fontSizeDetails: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}