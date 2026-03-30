import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export default function TriggerNode({ data }) {
  return (
    <div className="bg-white border-2 border-orange-400 rounded-xl shadow-sm min-w-[200px]">
      <div className="bg-orange-50 p-2 rounded-t-lg border-b border-orange-100 flex items-center gap-2">
        <div className="bg-orange-500 p-1.5 rounded-lg text-white">
          <Play className="h-4 w-4" />
        </div>
        <div className="font-semibold text-xs text-orange-900">Trigger</div>
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </div>
  );
}
