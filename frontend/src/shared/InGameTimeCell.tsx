import {CircleHelp, Moon, Sun, Sunrise, Sunset} from 'lucide-solid';
import {createMemo} from 'solid-js';
import {Dynamic} from 'solid-js/web';
import {useTranslation} from 'solid-i18next';
import {inGameTimePhase, type InGameTimePhase} from './inGameTimePhase';

const phaseIcons: Record<InGameTimePhase, typeof Sun> = {
  unknown: CircleHelp,
  dawn: Sunrise,
  day: Sun,
  dusk: Sunset,
  night: Moon,
};

const phaseI18nKey: Record<InGameTimePhase, string> = {
  unknown: 'browse.timePhaseUnknown',
  dawn: 'browse.timePhaseDawn',
  day: 'browse.timePhaseDay',
  dusk: 'browse.timePhaseDusk',
  night: 'browse.timePhaseNight',
};

export type InGameTimeCellProps = {
  inGameTime: string;
};

export function InGameTimeCell(props: InGameTimeCellProps) {
  const [t] = useTranslation();
  const phase = createMemo(() => inGameTimePhase(props.inGameTime));
  const Icon = createMemo(() => phaseIcons[phase()]);
  const aria = createMemo(() => t(phaseI18nKey[phase()]));
  return (
    <div class="flex items-center gap-1.5">
      <span class="inline-flex shrink-0" title={aria()} aria-label={aria()}>
        <Dynamic
          component={Icon()}
          class="size-4 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
      </span>
      <span>{props.inGameTime}</span>
    </div>
  );
}
