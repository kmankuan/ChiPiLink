/**
 * PostEditor - Advanced block-based post editor (Admin)
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Trash2, GripVertical, Type, Heading1, Heading2, Heading3, 
  List, ListOrdered, Image, Video, Quote, Code, Minus, AlertCircle,
  Link2, Play, ChevronUp, ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const BLOCK_TYPES = [
  { type: 'paragraph', icon: Type, labelKey: 'paragraph' },
  { type: 'heading_1', icon: Heading1, labelKey: 'heading1' },
  { type: 'heading_2', icon: Heading2, labelKey: 'heading2' },
  { type: 'heading_3', icon: Heading3, labelKey: 'heading3' },
  { type: 'bullet_list', icon: List, labelKey: 'bulletList' },
  { type: 'numbered_list', icon: ListOrdered, labelKey: 'numberedList' },
  { type: 'image', icon: Image, labelKey: 'image' },
  { type: 'video', icon: Video, labelKey: 'video' },
  { type: 'quote', icon: Quote, labelKey: 'quote' },
  { type: 'callout', icon: AlertCircle, labelKey: 'callout' },
  { type: 'button', icon: Link2, labelKey: 'button' },
  { type: 'divider', icon: Minus, labelKey: 'divider' },
  { type: 'embed', icon: Play, labelKey: 'embed' },
];

const CALLOUT_STYLES = ['info', 'warning', 'success', 'error'];
const CALLOUT_ICONS = {
  info: '💡',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

export default function PostEditor({ blocks = [], onChange, lang = 'es' }) {
  const { t, i18n } = useTranslation();
  const currentLang = lang || i18n.language || 'es';

  const getBlockLabel = (labelKey) => {
    const key = `postEditor.blocks.${labelKey}`;
    const translated = t(key);
    // Fallback if key doesn't exist
    if (translated === key) {
      return labelKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
    return translated;
  };

  const addBlock = (type, index) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type,
      content: type === 'callout' ? { style: 'info', text: '' } : '',
      meta: {}
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange(newBlocks);
  };

  const updateBlock = (index, updates) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  };

  const moveBlock = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(index, 1);
    newBlocks.splice(newIndex, 0, removed);
    onChange(newBlocks);
  };

  const renderBlockContent = (block, index) => {
    switch (block.type) {
      case 'paragraph':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return (
          <Textarea
            value={block.content || ''}
            onChange={(e) => updateBlock(index, { content: e.target.value })}
            placeholder={t('postEditor.placeholder')}
            className={`min-h-[60px] resize-none ${
              block.type === 'heading_1' ? 'text-2xl font-bold' :
              block.type === 'heading_2' ? 'text-xl font-semibold' :
              block.type === 'heading_3' ? 'text-lg font-medium' : ''
            }`}
          />
        );

      case 'bullet_list':
      case 'numbered_list':
        return (
          <Textarea
            value={block.content || ''}
            onChange={(e) => updateBlock(index, { content: e.target.value })}
            placeholder={t('postEditor.listPlaceholder')}
            className="min-h-[80px] resize-none"
          />
        );

      case 'image':
      case 'video':
        return (
          <div className="space-y-2">
            <Input
              value={block.content || ''}
              onChange={(e) => updateBlock(index, { content: e.target.value })}
              placeholder={t('postEditor.urlPlaceholder')}
            />
            <Input
              value={block.meta?.caption || ''}
              onChange={(e) => updateBlock(index, { meta: { ...block.meta, caption: e.target.value } })}
              placeholder={t('postEditor.captionPlaceholder')}
            />
            {block.content && block.type === 'image' && (
              <img 
                src={block.content} 
                alt={block.meta?.caption || ''} 
                className="max-h-40 rounded-lg object-cover"
              />
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-2 border-l-4 border-primary pl-4">
            <Textarea
              value={block.content || ''}
              onChange={(e) => updateBlock(index, { content: e.target.value })}
              placeholder={t('postEditor.quotePlaceholder')}
              className="italic"
            />
            <Input
              value={block.meta?.author || ''}
              onChange={(e) => updateBlock(index, { meta: { ...block.meta, author: e.target.value } })}
              placeholder={t('postEditor.authorPlaceholder')}
              className="text-sm"
            />
          </div>
        );

      case 'callout':
        const calloutContent = typeof block.content === 'object' ? block.content : { style: 'info', text: block.content || '' };
        return (
          <div className="space-y-2">
            <Select
              value={calloutContent.style || 'info'}
              onValueChange={(v) => updateBlock(index, { content: { ...calloutContent, style: v } })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALLOUT_STYLES.map(style => (
                  <SelectItem key={style} value={style}>
                    {CALLOUT_ICONS[style]} {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className={`p-3 rounded-lg ${
              calloutContent.style === 'info' ? 'bg-blue-50 dark:bg-blue-950/30' :
              calloutContent.style === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30' :
              calloutContent.style === 'success' ? 'bg-green-50 dark:bg-green-950/30' :
              'bg-red-50 dark:bg-red-950/30'
            }`}>
              <Textarea
                value={calloutContent.text || ''}
                onChange={(e) => updateBlock(index, { content: { ...calloutContent, text: e.target.value } })}
                placeholder={t('postEditor.calloutPlaceholder')}
                className="bg-transparent border-0 resize-none"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-2">
            <Input
              value={block.content || ''}
              onChange={(e) => updateBlock(index, { content: e.target.value })}
              placeholder={t('postEditor.buttonText')}
            />
            <Input
              value={block.meta?.url || ''}
              onChange={(e) => updateBlock(index, { meta: { ...block.meta, url: e.target.value } })}
              placeholder={t('postEditor.buttonUrl')}
            />
          </div>
        );

      case 'embed':
        return (
          <Input
            value={block.content || ''}
            onChange={(e) => updateBlock(index, { content: e.target.value })}
            placeholder={t('postEditor.embedPlaceholder')}
          />
        );

      case 'divider':
        return <hr className="border-t-2 border-muted" />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2" data-testid="post-editor">
      {blocks.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">{t('postEditor.empty')}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('postEditor.addBlock')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {BLOCK_TYPES.map((blockType) => {
                const Icon = blockType.icon;
                return (
                  <DropdownMenuItem
                    key={blockType.type}
                    onClick={() => addBlock(blockType.type, -1)}
                    className="cursor-pointer"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {getBlockLabel(blockType.labelKey)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {blocks.map((block, index) => (
        <Card key={block.id || index} className="relative group">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              {/* Drag handle and controls */}
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Block content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {getBlockLabel(BLOCK_TYPES.find(b => b.type === block.type)?.labelKey || block.type)}
                  </Badge>
                </div>
                {renderBlockContent(block, index)}
              </div>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => deleteBlock(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Add block button */}
            <div className="mt-2 -mb-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    {t('postEditor.addBlock')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {BLOCK_TYPES.map((blockType) => {
                    const Icon = blockType.icon;
                    return (
                      <DropdownMenuItem
                        key={blockType.type}
                        onClick={() => addBlock(blockType.type, index)}
                        className="cursor-pointer"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {getBlockLabel(blockType.labelKey)}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
