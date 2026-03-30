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
          <Label className="text-xs font-bold">School URL</Label>
          <Input 
            value={config.url || ''} 
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://school.edu/login"
            className="text-xs h-8"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">Action</Label>
          <Select value={config.action || 'extract_html'} onValueChange={(v) => onChange({ action: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="extract_html">Extract HTML / Text</SelectItem>
              <SelectItem value="extract_table">Extract Grade Table</SelectItem>
              <SelectItem value="download_pdf">Download PDF</SelectItem>
              <SelectItem value="login">Login (Auth)</SelectItem>
              <SelectItem value="click_element">Click Element</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {config.action === 'login' && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-muted mt-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 <b>Guide:</b> Enter the CSS selectors for the login form. If the login is inside a modal, use the "Pre-login Button" to click and open it first.
            </p>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Pre-login Button Selector (Optional)</Label>
              <Input value={config.pre_login_click || ''} onChange={(e) => onChange({ pre_login_click: e.target.value })} className="h-7 text-xs" placeholder=".login-btn" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Username CSS Selector</Label>
              <Input value={config.user_selector || ''} onChange={(e) => onChange({ user_selector: e.target.value })} className="h-7 text-xs" placeholder="#username" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Password CSS Selector</Label>
              <Input value={config.pass_selector || ''} onChange={(e) => onChange({ pass_selector: e.target.value })} className="h-7 text-xs" placeholder="#password" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold">Submit Button Selector</Label>
              <Input value={config.submit_selector || ''} onChange={(e) => onChange({ submit_selector: e.target.value })} className="h-7 text-xs" placeholder="button[type='submit']" />
            </div>
          </div>
        )}

        {config.action === 'extract_html' && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-muted mt-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 <b>Guide:</b> Navigates to the URL and extracts visible text. Chain this after a Login node to extract data from a protected page.
            </p>
            <Label className="text-[10px] font-semibold">Wait Time (ms)</Label>
            <Input type="number" value={config.wait_time || 2000} onChange={(e) => onChange({ wait_time: Number(e.target.value) })} className="h-7 text-xs" />
          </div>
        )}
        
        {config.action === 'click_element' && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-muted mt-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 <b>Guide:</b> Clicks a specific element on the page (e.g. a "Load More" button or a tab).
            </p>
            <Label className="text-[10px] font-semibold">Element CSS Selector</Label>
            <Input value={config.click_selector || ''} onChange={(e) => onChange({ click_selector: e.target.value })} className="h-7 text-xs" placeholder=".nav-grades" />
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'llm_process') {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
          <p className="text-[10px] text-purple-800 leading-relaxed mb-2">
            💡 <b>Guide:</b> Takes the scraped text and feeds it to an AI model. 
          </p>
          <div className="text-[10px] text-purple-900 bg-purple-100/50 p-2 rounded">
            <strong>Dynamic Variables available:</strong><br/>
            <code>{`{{student.name}}`}</code><br/>
            <code>{`{{student.grade}}`}</code><br/>
            <code>{`{{student.needs}}`}</code><br/>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">LLM Source / Provider</Label>
          <Select value={config.llm_provider || 'emergent'} onValueChange={(v) => onChange({ llm_provider: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="emergent">Emergent Universal Key (Default)</SelectItem>
              <SelectItem value="openai">OpenAI (Requires API Key)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Requires API Key)</SelectItem>
              <SelectItem value="local">Local Model (Ollama / VLLM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {['openai', 'anthropic'].includes(config.llm_provider) && (
          <div className="space-y-2">
            <Label className="text-xs font-bold">API Key</Label>
            <Input type="password" value={config.api_key || ''} onChange={(e) => onChange({ api_key: e.target.value })} className="text-xs h-8" placeholder="sk-..." />
          </div>
        )}

        {config.llm_provider === 'local' && (
          <div className="space-y-2">
            <Label className="text-xs font-bold">Local API Endpoint</Label>
            <Input value={config.local_url || ''} onChange={(e) => onChange({ local_url: e.target.value })} className="text-xs h-8" placeholder="http://127.0.0.1:11434/v1" />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-bold">System Prompt</Label>
          <Textarea 
            value={config.prompt || ''} 
            onChange={(e) => onChange({ prompt: e.target.value })}
            placeholder="Extract the grades and homework assignments from the following text and format as JSON..."
            className="text-xs min-h-[120px]"
          />
        </div>
      </div>
    );
  }

  if (node.type === 'integration') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
          <p className="text-[10px] text-green-800 leading-relaxed">
            💡 <b>Guide:</b> Push the AI-formatted JSON data into your database, CRM, or send a notification.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">Destination System</Label>
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
            <Label className="text-xs font-bold">Board ID</Label>
            <Input value={config.board_id || ''} onChange={(e) => onChange({ board_id: e.target.value })} className="text-xs h-8" placeholder="e.g. 1234567890" />
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'content_gen') {
    return (
      <div className="space-y-4">
        <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
          <p className="text-[10px] text-pink-800 leading-relaxed">
            💡 <b>Guide:</b> Generate study materials (quizzes, flashcards) automatically based on the extracted school topics.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold">Output Format</Label>
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
          <Label className="text-xs font-bold">Target Audience / Tone</Label>
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
  
  if (node.type === 'trigger') {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
          <p className="text-[10px] text-orange-800 leading-relaxed">
            💡 <b>Guide:</b> The starting point of the automation. Defines when and how this flow runs. Select the Target Platform so the orchestrator knows which students to execute this flow for.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold">Target Platform</Label>
          <Input 
            value={config.target_platform || ''} 
            onChange={(e) => onChange({ target_platform: e.target.value })} 
            className="text-xs h-8" 
            placeholder="e.g. imereb, smart_academy" 
          />
          <p className="text-[9px] text-muted-foreground">Flow will run for all students tagged with this platform.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold">Trigger Type</Label>
          <Select value={config.type || 'manual'} onValueChange={(v) => onChange({ type: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (Click to Run)</SelectItem>
              <SelectItem value="schedule">Scheduled Cron</SelectItem>
              <SelectItem value="webhook">Incoming Webhook</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.type === 'schedule' && (
          <div className="space-y-2">
            <Label className="text-xs font-bold">Cron Expression</Label>
            <Input value={config.cron || '0 6 * * 1-5'} onChange={(e) => onChange({ cron: e.target.value })} className="text-xs h-8" placeholder="0 6 * * 1-5" />
            <p className="text-[9px] text-muted-foreground">E.g., 0 6 * * 1-5 runs at 6 AM Monday-Friday.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground text-center mt-10">Select a configurable node</p>
  );
}
