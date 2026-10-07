import { BUCKET_IS_PUBLIC, VIDEO_BUCKET, isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Episode, EpisodeErrorKind, EpisodePart } from '../types/episode';

export class EpisodeError extends Error {
  kind: EpisodeErrorKind;
  constructor(kind: EpisodeErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours

/**
 * Turns a storage path into a playable URL.
 * Public bucket  -> public URL (cache-busted with `version`, since the filename can be reused).
 * Private bucket -> signed URL (already unique per signing).
 */
export async function resolveStorageUrl(path: string, version?: string): Promise<string> {
  if (!supabase) throw new EpisodeError('config', 'Supabase is not configured.');
  const bucket = supabase.storage.from(VIDEO_BUCKET);

  if (BUCKET_IS_PUBLIC) {
    const { data } = bucket.getPublicUrl(path);
    return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
  }
  const { data, error } = await bucket.createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) {
    throw new EpisodeError(navigator.onLine ? 'unknown' : 'network', error?.message ?? 'Signing failed.');
  }
  return data.signedUrl;
}

interface EpisodePartRow {
  id: string;
  episode_id: string;
  part_number: number;
  storage_path: string;
  duration_seconds: number | null;
  created_at: string;
}

interface EpisodeRow {
  id: string;
  title: string;
  season: number;
  episode: number;
  description: string | null;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  release_date: string | null;
  updated_at: string;
  episode_parts: EpisodePartRow[] | null;
}

export async function fetchCurrentEpisode(): Promise<Episode> {
  if (!isSupabaseConfigured || !supabase) {
    throw new EpisodeError('config', 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.');
  }

  const { data, error } = await supabase
    .from('episodes')
    .select(
      `id,title,season,episode,description,thumbnail_path,duration_seconds,release_date,updated_at,
       episode_parts(id,episode_id,part_number,storage_path,duration_seconds,created_at)`,
    )
    .eq('is_current', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<EpisodeRow>();

  if (error) throw new EpisodeError(navigator.onLine ? 'unknown' : 'network', error.message);
  if (!data) throw new EpisodeError('none', 'No current episode.');

  const parts: EpisodePart[] = (data.episode_parts ?? [])
    .filter((part) => typeof part.storage_path === 'string' && part.storage_path.length > 0)
    .sort((a, b) => a.part_number - b.part_number)
    .map((part) => ({
      id: part.id,
      episodeId: part.episode_id,
      partNumber: part.part_number,
      storagePath: part.storage_path,
      durationSeconds: part.duration_seconds,
      createdAt: part.created_at,
    }));

  if (parts.length === 0) {
    throw new EpisodeError('none', 'The current episode has no playable video parts.');
  }

  let thumbnailUrl: string | null = null;
  if (data.thumbnail_path) {
    try {
      thumbnailUrl = await resolveStorageUrl(data.thumbnail_path, data.updated_at);
    } catch {
      thumbnailUrl = null;
    }
  }

  const totalDuration = Number((data.duration_seconds ?? 0) > 0 ? data.duration_seconds : parts.reduce((sum, part) => sum + (part.durationSeconds ?? 0), 0));

  return {
    id: data.id,
    title: data.title,
    season: data.season,
    episode: data.episode,
    description: data.description,
    parts,
    thumbnailPath: data.thumbnail_path,
    thumbnailUrl,
    durationSeconds: totalDuration > 0 ? totalDuration : null,
    releaseDate: data.release_date,
    updatedAt: data.updated_at,
  };
}
