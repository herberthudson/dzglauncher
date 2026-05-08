import {cn} from '@/lib/utils';
import {formatPlayersWithQueue} from './formatPlayersWithQueue';
import {heatFromNormalizedLoad} from './PingMsCell';

export function PlayersCapacityCell(props: {players: number; maxPlayers: number; queueSize?: number}) {
  const color = () => {
    const q = props.queueSize ?? 0;
    const den = props.maxPlayers + q;
    if (!Number.isFinite(props.players) || !Number.isFinite(props.maxPlayers) || den <= 0) {
      return undefined;
    }
    const num = props.players + q;
    return heatFromNormalizedLoad(num / den);
  };
  return (
    <span class={cn(!color() && 'text-muted-foreground')} style={color() ? {color: color() as string} : undefined}>
      {formatPlayersWithQueue(props.players, props.maxPlayers, props.queueSize)}
    </span>
  );
}
