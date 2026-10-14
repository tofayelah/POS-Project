import React from 'react';

/**
 * Keyboard event handler that moves focus to the next visible, non-disabled input/select/button
 * field when the Enter key is pressed.
 */
export function handleKeyDownEnterToNextField(
  e: React.KeyboardEvent,
  containerRef?: React.RefObject<HTMLElement | null>
): void {
  if (e.key !== 'Enter') return;

  const target = e.target as HTMLElement;

  // Do not intercept Enter in multi-line textareas
  if (target.tagName === 'TEXTAREA') return;

  e.preventDefault();

  const container =
    containerRef?.current ||
    target.closest('form') ||
    target.closest('div[data-enter-container]') ||
    target.closest('div.min-h-screen') ||
    document.body;

  if (!container) return;

  const focusableSelector = [
    'input:not([disabled]):not([readonly]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    'button[type="button"]:not([disabled]):not([tabindex="-1"])'
  ].join(', ');

  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector)
  ).filter((el) => {
    // Check if element is visible
    return (
      el.offsetWidth > 0 &&
      el.offsetHeight > 0 &&
      getComputedStyle(el).visibility !== 'hidden' &&
      getComputedStyle(el).display !== 'none'
    );
  });

  const currentIndex = focusables.indexOf(target);

  if (currentIndex !== -1 && currentIndex < focusables.length - 1) {
    const nextEl = focusables[currentIndex + 1];
    nextEl.focus();

    if (
      nextEl instanceof HTMLInputElement &&
      typeof nextEl.select === 'function' &&
      !['date', 'checkbox', 'radio', 'color', 'file'].includes(nextEl.type)
    ) {
      nextEl.select();
    }
  }
}
