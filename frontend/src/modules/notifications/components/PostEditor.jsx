/**
 * PostEditor - Editor avanzado de posts con bloques (Admin)
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
  { type: 'paragraph', icon: Type, label: { es: 'Párrafo', en: 'Paragraph', zh: '段落' } },
  { type: 'heading_1', icon: Heading1, label: { es: 'Título 1', en: 'Heading 1', zh: '标题1' } },
  { type: 'heading_2', icon: Heading2, label: { es: 'Título 2', en: 'Heading 2', zh: '标题2' } },
  { type: 'heading_3', icon: Heading3, label: { es: 'Título 3', en: 'Heading 3', zh: '标题3' } },
  { type: 'bullet_list', icon: List, label: { es: 'Lista', en: 'Bullet List', zh: '列表' } },
  { type: 'numbered_list', icon: ListOrdered, label: { es: 'Lista numerada', en: 'Numbered List', zh: '编号列表' } },
  { type: 'image', icon: Image, label: { es: 'Imagen', en: 'Image', zh: '图片' } },
  { type: 'video', icon: Video, label: { es: 'Video', en: 'Video', zh: '视频' } },
  { type: 'quote', icon: Quote, label: { es: 'Cita', en: 'Quote', zh: '引用' } },
  { type: 'callout', icon: AlertCircle, label: { es: 'Callout', en: 'Callout', zh: '提示框' } },
  { type: 'button', icon: Link2, label: { es: 'Botón', en: 'Button', zh: '按钮' } },
  { type: 'divider', icon: Minus, label: { es: 'Separador', en: 'Divider', zh: '分隔线' } },
  { type: 'embed', icon: Play, label: { es: 'Embed', en: 'Embed', zh: '嵌入' } },
];

const CALLOUT_STYLES = ['info', 'warning', 'success', 'error'];
const CALLOUT_ICONS = {
  info: '💡',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

export default function PostEditor({ blocks = [], onChange, lang = 'es' }) {
  const { i18n } = useTranslation();
  const currentLang = lang || i18n.language || 'es';

  const texts = {
    es: {
      addBlock: 'Agregar bloque',
      placeholder: 'Escribe aquí...',
      urlPlaceholder: 'URL de la imagen o video',
      captionPlaceholder: 'Descripción (opcional)',
      authorPlaceholder: 'Autor (opcional)',
      buttonText: 'Texto del botón',
      buttonUrl: 'URL del botón',
      listItem: 'Elemento de lista',
      addItem: 'Agregar elemento',
      embedUrl: 'URL para embeber (YouTube, Twitter, etc.)',
      calloutStyle: 'Estilo'
    },
    en: {
      addBlock: 'Add block',
      placeholder: 'Write here...',
      urlPlaceholder: 'Image or video URL',
      captionPlaceholder: 'Caption (optional)',
      authorPlaceholder: 'Author (optional)',
      buttonText: 'Button text',
      buttonUrl: 'Button URL',
      listItem: 'List item',
      addItem: 'Add item',
      embedUrl: 'Embed URL (YouTube, Twitter, etc.)',
      calloutStyle: 'Style'
    },
    zh: {
      addBlock: '添加块',
      placeholder: '在此输入...',
      urlPlaceholder: '图片或视频URL',
      captionPlaceholder: '说明（可选）',
      authorPlaceholder: '作者（可选）',
      buttonText: '按钮文本',
      buttonUrl: '按钮URL',
      listItem: '列表项',
      addItem: '添加项',
      embedUrl: '嵌入URL（YouTube、Twitter等）',
      calloutStyle: '样式'
    }
  };

  const txt = texts[currentLang] || texts.es;

  const addBlock = (type, afterIndex = blocks.length - 1) => {
    const newBlock = createEmptyBlock(type);
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    onChange(newBlocks);
  };

  const createEmptyBlock = (type) => {
    const base = { type, id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    
    switch (type) {
      case 'paragraph':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
      case 'code':
        return { ...base, content: '' };
      case 'bullet_list':
      case 'numbered_list':
        return { ...base, items: [''] };
      case 'image':
      case 'video':
        return { ...base, url: '', caption: { es: '', en: '', zh: '' }, alt: '' };
      case 'quote':
        return { ...base, content: '', author: '' };
      case 'callout':
        return { ...base, content: '', icon: '💡', style: 'info' };
      case 'button':
        return { ...base, text: { es: '', en: '', zh: '' }, url: '', style: 'primary' };
      case 'embed':
        return { ...base, url: '', provider: '' };
      case 'divider':
      default:
        return base;
    }
  };

  const updateBlock = (index, updates) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const removeBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  };

  const moveBlock = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  const renderBlockContent = (block, index) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <Textarea
            value={block.content || ''}
            onChange={(e) => updateBlock(index, { content: e.target.value })}
            placeholder={txt.placeholder}
            className="min-h-[80px] resize-none"
          />
        );
      
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return (
          <Input
            value={block.content || ''}
            onChange={(e) => updateBlock(index, { content: e.target.value })}
            placeholder={txt.placeholder}
            className={`font-bold ${
              block.type === 'heading_1' ? 'text-2xl' : 
              block.type === 'heading_2' ? 'text-xl' : 'text-lg'
            }`}
          />
        );
      
      case 'bullet_list':
      case 'numbered_list':
        return (
          <div className="space-y-2">
            {(block.items || []).map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-2">
                <span className="text-muted-foreground w-6 text-center">
                  {block.type === 'numbered_list' ? `${itemIndex + 1}.` : '•'}
                </span>
                <Input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...(block.items || [])];
                    newItems[itemIndex] = e.target.value;
                    updateBlock(index, { items: newItems });
                  }}
                  placeholder={txt.listItem}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newItems = block.items.filter((_, i) => i !== itemIndex);
                    updateBlock(index, { items: newItems.length ? newItems : [''] });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateBlock(index, { items: [...(block.items || []), ''] })}
            >
              <Plus className="h-3 w-3 mr-1" />
              {txt.addItem}
            </Button>
          </div>
        );
      
      case 'image':
      case 'video':
        return (
          <div className="space-y-3">
            <Input
              value={block.url || ''}
              onChange={(e) => updateBlock(index, { url: e.target.value })}
              placeholder={txt.urlPlaceholder}
            />
            {block.url && block.type === 'image' && (
              <img src={block.url} alt={block.alt} className="max-h-48 rounded-lg object-cover" />
            )}
            {block.url && block.type === 'video' && (
              <video src={block.url} controls className="max-h-48 rounded-lg" />
            )}
            <Input
              value={block.caption?.[currentLang] || ''}
              onChange={(e) => updateBlock(index, { 
                caption: { ...block.caption, [currentLang]: e.target.value } 
              })}
              placeholder={txt.captionPlaceholder}
            />
          </div>
        );
      
      case 'quote':
        return (
          <div className="space-y-2 pl-4 border-l-4 border-primary">
            <Textarea
              value={block.content || ''}
              onChange={(e) => updateBlock(index, { content: e.target.value })}
              placeholder={txt.placeholder}
              className="italic"
            />
            <Input
              value={block.author || ''}
              onChange={(e) => updateBlock(index, { author: e.target.value })}
              placeholder={txt.authorPlaceholder}
              className="text-sm"
            />
          </div>
        );
      
      case 'callout':
        return (
          <div 
            className={`p-4 rounded-lg space-y-2 ${
              block.style === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20' :
              block.style === 'success' ? 'bg-green-50 dark:bg-green-950/20' :
              block.style === 'error' ? 'bg-red-50 dark:bg-red-950/20' :
              'bg-blue-50 dark:bg-blue-950/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{CALLOUT_ICONS[block.style] || '💡'}</span>
              <Select 
                value={block.style || 'info'}
                onValueChange={(v) => updateBlock(index, { style: v, icon: CALLOUT_ICONS[v] })}
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALLOUT_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={block.content || ''}
              onChange={(e) => updateBlock(index, { content: e.target.value })}
              placeholder={txt.placeholder}
              className="bg-transparent"
            />
          </div>
        );
      
      case 'button':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={block.text?.es || ''}
                onChange={(e) => updateBlock(index, { text: { ...block.text, es: e.target.value } })}
                placeholder="ES"
              />
              <Input
                value={block.text?.en || ''}
                onChange={(e) => updateBlock(index, { text: { ...block.text, en: e.target.value } })}
                placeholder="EN"
              />
              <Input
                value={block.text?.zh || ''}
                onChange={(e) => updateBlock(index, { text: { ...block.text, zh: e.target.value } })}
                placeholder="ZH"
              />
            </div>
            <Input
              value={block.url || ''}
              onChange={(e) => updateBlock(index, { url: e.target.value })}
              placeholder={txt.buttonUrl}
            />
            <div className="flex gap-2">
              {['primary', 'secondary', 'outline'].map((style) => (
                <Button
                  key={style}
                  variant={block.style === style ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateBlock(index, { style })}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>
        );
      
      case 'embed':
        return (
          <Input
            value={block.url || ''}
            onChange={(e) => updateBlock(index, { url: e.target.value })}
            placeholder={txt.embedUrl}
          />
        );
      
      case 'divider':
        return <hr className="my-2" />;
      
      default:
        return <p className="text-muted-foreground">Bloque no soportado: {block.type}</p>;
    }
  };

  return (
    <div className="space-y-3" data-testid="post-editor">
      {blocks.map((block, index) => {
        const blockType = BLOCK_TYPES.find(b => b.type === block.type);
        const Icon = blockType?.icon || Type;
        
        return (
          <Card 
            key={block.id || index} 
            className="group relative"
            data-testid={`block-${index}`}
          >
            <CardContent className="pt-4">
              {/* Block header */}
              <div className="flex items-center gap-2 mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                <Badge variant="outline" className="text-xs gap-1">
                  <Icon className="h-3 w-3" />
                  {blockType?.label?.[currentLang] || block.type}
                </Badge>
                <div className="flex-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => moveBlock(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => moveBlock(index, 'down')}
                  disabled={index === blocks.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeBlock(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Block content */}
              {renderBlockContent(block, index)}
            </CardContent>
          </Card>
        );
      })}

      {/* Add block button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full border-dashed" data-testid="add-block-btn">
            <Plus className="h-4 w-4 mr-2" />
            {txt.addBlock}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {BLOCK_TYPES.map((blockType, index) => {
            const Icon = blockType.icon;
            if (index > 0 && index % 4 === 0) {
              return (
                <React.Fragment key={blockType.type}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => addBlock(blockType.type)}>
                    <Icon className="h-4 w-4 mr-2" />
                    {blockType.label[currentLang]}
                  </DropdownMenuItem>
                </React.Fragment>
              );
            }
            return (
              <DropdownMenuItem key={blockType.type} onClick={() => addBlock(blockType.type)}>
                <Icon className="h-4 w-4 mr-2" />
                {blockType.label[currentLang]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
