import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NodeConfigPanel({ node, onChange }) {
  const config = node.data?.config || {};

  if (node.type === 'scrape') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">School URL</Label>
          <Input 
            value={config.url || ''} 
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://school.edu/login"
            className="text-xs h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Action</Label>
          <Select value={config.action || 'extract_html'} onValueChange={(v) => onChange({ action: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="extract_html">Extract HTML / Text</SelectItem>
              <SelectItem value="extract_table">Extract Grade Table</SelectItem>
              <SelectItem value="download_pdf">Download PDF</SelectItem>
              <SelectItem value="login">Login (Auth)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.action === 'login' && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <Label className="text-[10px]">Username CSS Selector</Label>
            <Input value={config.user_selector || ''} onChange={(e) => onChange({ user_selector: e.target.value })} className="h-7 text-xs" />
            <Label className="text-[10px]">Password CSS Selector</Label>
            <Input value={config.pass_selector || ''} onChange={(e) => onChange({ pass_selector: e.target.value })} className="h-7 text-xs" />
            <Label className="text-[10px]">Submit Button Selector</Label>
            <Input value={config.submit_selector || ''} onChange={(e) => onChange({ submit_selector: e.target.value })} className="h-7 text-xs" />
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'llm_process') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">LLM Source / Provider</Label>
          <Select value={config.llm_provider || 'emergent'} onValueChange={(v) => onChange({ llm_provider: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="emergent">Emergent LLM Universal Key</SelectItem>
              <SelectItem value="openai">OpenAI (Requires API Key)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Requires API Key)</SelectItem>
              <SelectItem value="local">Local Model (Ollama / VLLM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {['openai', 'anthropic'].includes(config.llm_provider) && (
          <div className="space-y-2">
            <Label className="text-xs">API Key</Label>
            <Input type="password" value={config.api_key || ''} onChange={(e) => onChange({ api_key: e.target.value })} className="text-xs h-8" placeholder="sk-..." />
          </div>
        )}

        {config.llm_provider === 'local' && (
          <div className="space-y-2">
            <Label className="text-xs">Local API Endpoint</Label>
            <Input value={config.local_url || ''} onChange={(e) => onChange({ local_url: e.target.value })} className="text-xs h-8" placeholder="http://127.0.0.1:11434/v1" />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">System Prompt</Label>
          <Textarea 
            value={config.prompt || ''} 
            onChange={(e) => onChange({ prompt: e.target.value })}
            placeholder="Extract the grades and homework assignments from the following text and format as JSON..."
            className="text-xs"
            rows={5}
          />
        </div>
      </div>
    );
  }

  if (node.type === 'integration') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Destination System</Label>
          <Select value={config.target || 'monday'} onValueChange={(v) => onChange({ target: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Monday.com CRM</SelectItem>
              <SelectItem value="fusebase">FuseBase Documents</SelectItem>
              <SelectItem value="telegram">Telegram Channel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.target === 'monday' && (
          <div className="space-y-2">
            <Label className="text-xs">Board ID</Label>
            <Input value={config.board_id || ''} onChange={(e) => onChange({ board_id: e.target.value })} className="text-xs h-8" />
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'content_gen') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Output Format</Label>
          <Select value={config.output_type || 'quiz'} onValueChange={(v) => onChange({ output_type: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quiz">Interactive Quiz</SelectItem>
              <SelectItem value="flashcards">Flashcards</SelectItem>
              <SelectItem value="worksheet">PDF Worksheet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Target Audience / Tone</Label>
          <Select value={config.tone || 'child'} onValueChange={(v) => onChange({ tone: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="child">Child-friendly & Encouraging</SelectItem>
              <SelectItem value="teen">Teen / Academic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground text-center mt-10">Select a configurable node</p>
  );
}
