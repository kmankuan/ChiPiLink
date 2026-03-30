import { Handle, Position } from 'reactflow';
import { Search } from 'lucide-react';

export default function ScrapeNode({ data }) {
  const action = data.config?.action || 'extract_html';
  
  const actionLabels = {
    'login': 'Login Auth',
    'extract_html': 'Extract Text',
    'click_element': 'Click Element'
  };

  const badgeColors = {
    'login': 'bg-orange-100 text-orange-800 border-orange-200',
    'extract_html': 'bg-green-100 text-green-800 border-green-200',
    'click_element': 'bg-purple-100 text-purple-800 border-purple-200'
  };

  return (
    <div className="bg-white border-2 border-blue-400 rounded-xl shadow-sm min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <div className="bg-blue-50 p-2 rounded-t-lg border-b border-blue-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 p-1.5 rounded-lg text-white">
            <Search className="h-4 w-4" />
          </div>
          <div className="font-semibold text-xs text-blue-900">School Scraper</div>
        </div>
        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColors[action] || 'bg-gray-100 border-gray-200 text-gray-800'}`}>
          [{actionLabels[action] || action.toUpperCase()}]
        </div>
      </div>
      <div className="p-3 space-y-1 bg-white rounded-b-lg">
        <p className="text-[10px] font-bold text-blue-800 truncate" title={data.config?.url}>URL: {data.config?.url || 'Inherit from previous'}</p>
        
        {action === 'click_element' && (
          <p className="text-[9px] text-muted-foreground truncate font-mono mt-1">El: {data.config?.click_selector || 'missing selector'}</p>
        )}
        
        {action === 'login' && (
          <div className="mt-1 flex gap-1">
            {data.config?.user_selector && <span className="w-2 h-2 rounded-full bg-green-500" title="User configured" />}
            {data.config?.pass_selector && <span className="w-2 h-2 rounded-full bg-green-500" title="Pass configured" />}
            {data.config?.submit_selector && <span className="w-2 h-2 rounded-full bg-green-500" title="Submit configured" />}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
