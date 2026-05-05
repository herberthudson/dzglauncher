import {describe, expect, it} from 'vitest';
import {inGameTimePhase} from './inGameTimePhase';

describe('inGameTimePhase', () => {
  it('returns unknown for Unknown', () => {
    expect(inGameTimePhase('Unknown')).toBe('unknown');
  });

  it('returns unknown for empty or invalid', () => {
    expect(inGameTimePhase('')).toBe('unknown');
    expect(inGameTimePhase('12')).toBe('unknown');
    expect(inGameTimePhase('x:y')).toBe('unknown');
    expect(inGameTimePhase('12:60')).toBe('unknown');
    expect(inGameTimePhase('24:00')).toBe('unknown');
  });

  it('maps midnight and early morning to night', () => {
    expect(inGameTimePhase('0:00')).toBe('night');
    expect(inGameTimePhase('00:00')).toBe('night');
    expect(inGameTimePhase('4:30')).toBe('night');
    expect(inGameTimePhase('5:59')).toBe('night');
  });

  it('maps dawn day and dusk within 6–18', () => {
    expect(inGameTimePhase('6:00')).toBe('dawn');
    expect(inGameTimePhase('7:59')).toBe('dawn');
    expect(inGameTimePhase('8:00')).toBe('day');
    expect(inGameTimePhase('12:00')).toBe('day');
    expect(inGameTimePhase('15:59')).toBe('day');
    expect(inGameTimePhase('16:00')).toBe('dusk');
    expect(inGameTimePhase('17:30')).toBe('dusk');
    expect(inGameTimePhase('17:59')).toBe('dusk');
  });

  it('maps evening to night', () => {
    expect(inGameTimePhase('18:00')).toBe('night');
    expect(inGameTimePhase('20:00')).toBe('night');
    expect(inGameTimePhase('23:59')).toBe('night');
  });

  it('accepts single-digit hour like backend', () => {
    expect(inGameTimePhase('6:5')).toBe('dawn');
  });
});
