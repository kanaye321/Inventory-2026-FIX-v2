import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Settings, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2,
  X,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Widget {
  id: string;
  type: 'stats' | 'recent-issues' | 'priority-chart' | 'type-chart' | 'activity-feed' | 'assignee-breakdown' | 'filters' | 'quick-actions';
  title: string;
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  settings?: any;
  refreshable?: boolean;
  configurable?: boolean;
}

interface DraggableWidgetProps {
  widget: Widget;
  children: React.ReactNode;
  isEditMode: boolean;
  onToggleVisibility: (widgetId: string) => void;
  onSettings?: (widgetId: string) => void;
  onRefresh?: (widgetId: string) => void;
  onRemove?: (widgetId: string) => void;
  onResize?: (widgetId: string, size: { width: number; height: number }) => void;
}

export default function DraggableWidget({
  widget,
  children,
  isEditMode,
  onToggleVisibility,
  onSettings,
  onRefresh,
  onRemove,
  onResize
}: DraggableWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleExpand = () => {
    if (onResize) {
      const newSize = isExpanded 
        ? (widget.minSize || { width: 4, height: 3 })
        : { width: 12, height: 6 };
      onResize(widget.id, newSize);
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card 
      className={`
        relative group transition-all duration-200
        ${isEditMode ? 'border-dashed border-2 border-blue-300' : ''}
        ${isHovered ? 'shadow-lg scale-[1.02]' : ''}
        ${!widget.visible ? 'opacity-50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-widget-id={widget.id}
    >
      {/* Widget Header */}
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isEditMode && (
              <div className="cursor-move text-muted-foreground hover:text-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <span>{widget.title}</span>
            {!widget.visible && (
              <Badge variant="secondary" className="text-xs">Hidden</Badge>
            )}
          </CardTitle>

          {/* Widget Controls */}
          <div className={`flex items-center gap-1 transition-opacity ${
            isEditMode || isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            {widget.refreshable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onRefresh?.(widget.id)}
                title="Refresh widget"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onToggleVisibility(widget.id)}>
                  {widget.visible ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Widget
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Widget
                    </>
                  )}
                </DropdownMenuItem>

                {onResize && (
                  <DropdownMenuItem onClick={handleToggleExpand}>
                    {isExpanded ? (
                      <>
                        <Minimize2 className="h-4 w-4 mr-2" />
                        Minimize
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Expand
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {widget.configurable && onSettings && (
                  <DropdownMenuItem onClick={() => onSettings(widget.id)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}

                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onRemove(widget.id)}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Widget
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {/* Widget Content */}
      <CardContent className={widget.visible ? '' : 'opacity-50'}>
        {children}
      </CardContent>

      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 bg-blue-500/5 border-2 border-blue-300 border-dashed rounded-lg pointer-events-none" />
      )}
    </Card>
  );
}