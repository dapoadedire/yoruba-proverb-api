export interface Proverb {
  id: number;
  proverb: string;
  translation: string;
  wisdom: string;
  tags?: string[];
  audioUrl?: string;
}

export interface ProverbsData {
  proverbs: Proverb[];
}
