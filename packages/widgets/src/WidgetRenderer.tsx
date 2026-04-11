import { forwardRef, lazy, Suspense, useMemo } from 'react';
import type { WidgetProps, FieldDefinition, WidgetType } from '@formweave/core';

import { TextInput } from './TextInput';
import { Textarea } from './Textarea';
import { NumberStepper } from './NumberStepper';
import { Toggle } from './Toggle';
import { PillSelector } from './PillSelector';
import { DropdownSelect } from './DropdownSelect';
import { DateTimeBlock } from './DateTimeBlock';
import { PeoplePicker } from './PeoplePicker';
import { TagInput } from './TagInput';
import { ColorDots } from './ColorDots';
import { TitleInput } from './TitleInput';
import { ObjectSection } from './ObjectSection';
import { ArrayTable } from './ArrayTable';
import { ArrayListItem } from './ArrayListItem';

// Lazy-loaded heavy widgets
const RichTextLazy = lazy(() =>
  import('./RichTextPlaceholder').then((m) => ({ default: m.RichTextPlaceholder })),
);
const CodeEditorLazy = lazy(() =>
  import('./CodeEditorPlaceholder').then((m) => ({ default: m.CodeEditorPlaceholder })),
);
const FileUploadLazy = lazy(() =>
  import('./FileUploadPlaceholder').then((m) => ({ default: m.FileUploadPlaceholder })),
);

/** Map of widget type to React component */
const WIDGET_MAP: Record<string, React.ComponentType<any>> = {
  text: TextInput,
  textarea: Textarea,
  'number-stepper': NumberStepper,
  toggle: Toggle,
  'pill-selector': PillSelector,
  'dropdown-select': DropdownSelect,
  'datetime-block': DateTimeBlock,
  'date-picker': DateTimeBlock,
  'time-picker': DateTimeBlock,
  'people-picker': PeoplePicker,
  'tag-input': TagInput,
  'color-dots': ColorDots,
  'title-input': TitleInput,
  'object-section': ObjectSection,
  'array-table': ArrayTable,
  'array-list': ArrayListItem,
};

const LAZY_WIDGETS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'rich-text': RichTextLazy,
  'code-editor': CodeEditorLazy,
  'file-upload': FileUploadLazy,
};

function LoadingFallback() {
  return <div className="fw-widget-loading">Loading...</div>;
}

export interface WidgetRendererProps extends WidgetProps<any> {
  children?: React.ReactNode;
  onToolCall?: (toolName: string, args: Record<string, any>) => Promise<any>;
}

export const WidgetRenderer = forwardRef<HTMLDivElement, WidgetRendererProps>(
  function WidgetRenderer(props, ref) {
    const { config, children, ...rest } = props;
    const widgetType: WidgetType = config.widget;

    const Widget = useMemo(() => {
      if (widgetType === 'hidden') return null;
      return WIDGET_MAP[widgetType] ?? LAZY_WIDGETS[widgetType] ?? null;
    }, [widgetType]);

    if (widgetType === 'hidden' || !Widget) {
      return null;
    }

    const isLazy = widgetType in LAZY_WIDGETS;

    const rendered = (
      <Widget ref={ref} config={config} {...rest}>
        {children}
      </Widget>
    );

    if (isLazy) {
      return <Suspense fallback={<LoadingFallback />}>{rendered}</Suspense>;
    }

    return rendered;
  },
);
