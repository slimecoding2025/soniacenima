import VideoPlayer from '../components/VideoPlayer';
import type { Episode } from '../types/episode';

interface Props {
  episode: Episode;
  startAt: number;
  onClose: () => void;
}

export default function WatchPage({ episode, startAt, onClose }: Props) {
  return <VideoPlayer episode={episode} startAt={startAt} onClose={onClose} />;
}
