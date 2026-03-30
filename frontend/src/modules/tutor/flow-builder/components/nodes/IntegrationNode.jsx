import { Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';

export default function IntegrationNode({ data }) {
  const target = data.config?.target || 'Monday.com';
  
  return (
    <div className="bg-white border-2 border-green-400 rounded-xl shadow-sm min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500" />
      <div className="bg-green-50 p-2 rounded-t-lg border-b border-green-100 flex items-center gap-2">
        <div className="bg-green-600 p-1.5 rounded-lg text-white">
          <Database className="h-4 w-4" />
        </div>
        <div className="font-semibold text-xs text-green-900">Push Record</div>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-bold text-green-800">Target: {target}</p>
        <p className="text-[10px] text-muted-foreground">Action: {data.config?.action || 'Create Item'}</p>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
    </div>
  );
}
