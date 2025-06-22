export interface Proverb {
  id: number;
  proverb: string;
  translation: string;
  wisdom: string;
}

export interface ProverbsData {
  proverbs: Proverb[];
}
