import { Handle, Position } from 'reactflow';
import { Search } from 'lucide-react';

export default function ScrapeNode({ data }) {
  return (
    <div className="bg-white border-2 border-blue-400 rounded-xl shadow-sm min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <div className="bg-blue-50 p-2 rounded-t-lg border-b border-blue-100 flex items-center gap-2">
        <div className="bg-blue-500 p-1.5 rounded-lg text-white">
          <Search className="h-4 w-4" />
        </div>
        <div className="font-semibold text-xs text-blue-900">School Scraper</div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-[10px] font-bold text-blue-800">URL: {data.config?.url || 'Not configured'}</p>
        <p className="text-[10px] text-muted-foreground">Action: {data.config?.action || 'Extract HTML'}</p>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
