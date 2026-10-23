// Employee tracks (functional groupings) + re-exported shared enums for the data layer.
export type Track =
  | 'management'
  | 'recruiting'
  | 'training'
  | 'kitchen'
  | 'buying'
  | 'marketing'
  | 'pricing'
  | 'sales';

export type { CampaignType, Product } from '../types';
