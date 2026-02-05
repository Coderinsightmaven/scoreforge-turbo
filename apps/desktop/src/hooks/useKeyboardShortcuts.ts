import { useEffect } from 'react';
import { useScoreboardStore } from '../stores/useScoreboardStore';
import { useCanvasStore } from '../stores/useCanvasStore';
import { ScoreboardConfig } from '../types/scoreboard';

/**
 * Hook that handles keyboard shortcuts for the scoreboard designer.
 * 
 * Supported shortcuts:
 * - Ctrl/Cmd + C: Copy selected components
 * - Ctrl/Cmd + V: Paste components from clipboard
 * 
 * @param config - The current scoreboard config (null if no scoreboard loaded)
 * @returns Object with handler functions for copy/paste operations
 */
export const useKeyboardShortcuts = (config: ScoreboardConfig | null) => {
  const { copyComponents, pasteComponents } = useScoreboardStore();
  const { selectedComponents, clipboard, setClipboard } = useCanvasStore();

  useEffect(() => {
    /**
     * Checks if the currently focused element is a form field where
     * native copy/paste should be allowed.
     */
    const isInFormField = (): boolean => {
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement) return false;

      const tagName = activeElement.tagName.toUpperCase();
      return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        activeElement.isContentEditable
      );
    };

    /**
     * Handles keyboard events for copy/paste shortcuts.
     * Only processes shortcuts when a scoreboard is loaded and
     * the user is not focused on a form field.
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when a scoreboard is loaded
      if (!config) return;

      // Don't intercept copy/paste when user is in a form field
      if (isInFormField()) return;

      const isCtrlCmd = event.ctrlKey || event.metaKey;

      if (isCtrlCmd && event.key === 'c') {
        event.preventDefault();
        handleCopyComponents();
      } else if (isCtrlCmd && event.key === 'v') {
        event.preventDefault();
        handlePasteComponents();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [config, selectedComponents, clipboard]);

  /**
   * Copies the currently selected components to the clipboard.
   * Shows an alert with the number of components copied.
   * 
   * Side effects:
   * - Updates the clipboard in the canvas store
   * - Shows an alert to the user
   */
  const handleCopyComponents = () => {
    if (selectedComponents.size === 0) {
      alert('Please select components to copy.');
      return;
    }
    
    const selectedIds = Array.from(selectedComponents);
    const componentsToCopy = copyComponents(selectedIds);
    setClipboard(componentsToCopy);
    
    const componentText = selectedIds.length === 1 ? 'component' : 'components';
    alert(`${selectedIds.length} ${componentText} copied to clipboard.`);
  };

  /**
   * Pastes components from the clipboard onto the canvas.
   * Shows an alert with the number of components pasted.
   * 
   * Side effects:
   * - Adds new components to the scoreboard
   * - Shows an alert to the user
   */
  const handlePasteComponents = () => {
    if (clipboard.length === 0) {
      alert('No components in clipboard. Copy components first.');
      return;
    }
    
    const newComponentIds = pasteComponents(clipboard);
    
    const componentText = newComponentIds.length === 1 ? 'component' : 'components';
    alert(`${newComponentIds.length} ${componentText} pasted successfully.`);
  };

  return {
    handleCopyComponents,
    handlePasteComponents
  };
};
