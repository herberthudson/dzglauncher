import {Show} from 'solid-js';
import {GlobeOff} from 'lucide-solid';
import {cn} from '@/lib/utils';

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(c1: readonly [number, number, number], c2: readonly [number, number, number], t: number) {
  const u = Math.min(1, Math.max(0, t));
  return `rgb(${lerp(c1[0], c2[0], u)} ${lerp(c1[1], c2[1], u)} ${lerp(c1[2], c2[2], u)})`;
}

function pingMsForeground(ms: number): string | undefined {
  if (!Number.isFinite(ms) || ms < 0 || ms >= 4000) {
    return undefined;
  }
  if (ms <= 100) {
    return lerpRgb([42, 168, 98], [210, 228, 95], ms / 100);
  }
  if (ms <= 200) {
    return lerpRgb([210, 228, 95], [245, 132, 42], (ms - 100) / 100);
  }
  return lerpRgb([245, 132, 42], [218, 38, 38], Math.min(1, (ms - 200) / 100));
}

export function PingMsCell(props: {value: number; unreachable?: boolean; unreachableLabel?: string}) {
  const color = () => pingMsForeground(props.value);
  return (
    <Show
      when={props.unreachable}
      fallback={
        <span class={cn(!color() && 'text-muted-foreground')} style={color() ? {color: color() as string} : undefined}>
          {props.value}
        </span>
      }
    >
      <span class="inline-flex items-center text-red-600" title={props.unreachableLabel} aria-label={props.unreachableLabel}>
        <GlobeOff size={14} strokeWidth={2} aria-hidden />
      </span>
    </Show>
  );
}
