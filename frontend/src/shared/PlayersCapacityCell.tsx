import {cn} from '@/lib/utils';
import {formatPlayersWithQueue} from './formatPlayersWithQueue';
import {heatFromNormalizedLoad} from './PingMsCell';

export function PlayersCapacityCell(props: {players: number; maxPlayers: number; queueSize?: number}) {
  const color = () => {
    if (!Number.isFinite(props.players) || !Number.isFinite(props.maxPlayers) || props.maxPlayers <= 0) {
      return undefined;
    }
    return heatFromNormalizedLoad(props.players / props.maxPlayers);
  };
  return (
    <span class={cn(!color() && 'text-muted-foreground')} style={color() ? {color: color() as string} : undefined}>
      {formatPlayersWithQueue(props.players, props.maxPlayers, props.queueSize)}
    </span>
  );
}
