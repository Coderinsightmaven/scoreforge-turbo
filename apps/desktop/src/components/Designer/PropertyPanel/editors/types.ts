/**
 * Common types for PropertyPanel editors.
 */
import { ScoreboardComponent } from '../../../../types/scoreboard';

/**
 * Common props interface for all property editors.
 */
export interface EditorProps {
  component: ScoreboardComponent;
  onDataChange: (property: string, value: string | number | boolean | Record<string, unknown>) => void;
  onStyleChange: (property: string, value: string | number | boolean | Record<string, unknown>) => void;
  onOpenImageManager?: () => void;
  onOpenVideoManager?: () => void;
}
