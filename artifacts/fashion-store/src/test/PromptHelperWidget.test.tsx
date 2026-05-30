import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PromptHelperWidget from '../components/editor/PromptHelperWidget';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { dir: () => 'ltr', language: 'en' }
  })
}));

describe('PromptHelperWidget', () => {
  it('should render the AI prompter floating trigger button', () => {
    render(<PromptHelperWidget />);
    expect(screen.getByText(/AI Image Prompter/i)).toBeInTheDocument();
  });

  it('should open drawer and show presets when trigger button is clicked', () => {
    render(<PromptHelperWidget />);
    
    const triggerBtn = screen.getByRole('button', { name: /AI Image Prompter/i });
    fireEvent.click(triggerBtn);
    
    expect(screen.getByText('AI Photo Prompt Studio')).toBeInTheDocument();
    expect(screen.getByText('Visual Preset')).toBeInTheDocument();
    expect(screen.getByText('Editorial')).toBeInTheDocument();
    expect(screen.getByText('Cosmetics')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle')).toBeInTheDocument();
  });

  it('should display copy button and prompt content', () => {
    render(<PromptHelperWidget />);
    
    const triggerBtn = screen.getByRole('button', { name: /AI Image Prompter/i });
    fireEvent.click(triggerBtn);
    
    expect(screen.getByText('Generated Prompt')).toBeInTheDocument();
    expect(screen.getByText(/Copy Prompt for/i)).toBeInTheDocument();
  });
});
