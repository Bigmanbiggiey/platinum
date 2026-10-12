import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { STORAGE_KEY, applyPref, readPref, setPref } from './theme';

const html = document.documentElement;
const meta = (name: string, media?: string) => {
  const m = document.createElement('meta');
  m.name = name;
  if (media) m.media = media;
  document.head.append(m);
  return m;
};

let scheme: HTMLMetaElement, light: HTMLMetaElement, dark: HTMLMetaElement;
beforeEach(() => {
  localStorage.clear();
  delete html.dataset.theme;
  scheme = meta('color-scheme');
  scheme.content = 'light dark';
  light = meta('theme-color', '(prefers-color-scheme: light)');
  dark = meta('theme-color', '(prefers-color-scheme: dark)');
});
afterEach(() => {
  scheme.remove();
  light.remove();
  dark.remove();
});

describe('theme store', () => {
  it('pins light or dark on <html> and the metas, and remembers it', () => {
    setPref('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(html.dataset.theme).toBe('dark');
    expect(scheme.content).toBe('dark');
    expect([light.content, dark.content]).toEqual(['#14171a', '#14171a']);
    expect(readPref()).toBe('dark');
  });

  it('system forgets the choice and hands back to the device', () => {
    setPref('light');
    setPref('system');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(html.dataset.theme).toBeUndefined();
    expect(scheme.content).toBe('light dark');
    expect([light.content, dark.content]).toEqual(['#f7f7f5', '#14171a']);
  });

  it('ignores junk in storage', () => {
    localStorage.setItem(STORAGE_KEY, 'purple');
    expect(readPref()).toBe('system');
    applyPref(readPref());
    expect(html.dataset.theme).toBeUndefined();
  });
});

describe('<ThemeSwitcher />', () => {
  it('offers System, Light and Dark as one radio group, System by default', () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /System \(currently (light|dark)\)/ })).toBeChecked();
  });

  it('picking Dark applies it at once', () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(html.dataset.theme).toBe('dark');
  });

  it('follows a change made in another tab', () => {
    render(<ThemeSwitcher compact />);
    act(() => {
      localStorage.setItem(STORAGE_KEY, 'light');
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(html.dataset.theme).toBe('light');
  });
});
