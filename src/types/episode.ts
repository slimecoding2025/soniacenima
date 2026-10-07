export interface EpisodePart {
  id: string;
  episodeId: string;
  partNumber: number;
  storagePath: string;
  durationSeconds: number | null;
  createdAt: string;
}

export interface Episode {
  id: string;
  title: string;
  season: number;
  episode: number;
  description: string | null;
  parts: EpisodePart[];
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  releaseDate: string | null;
  updatedAt: string;
}

export type EpisodeErrorKind = 'none' | 'config' | 'network' | 'unknown';
