import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export default function TriggerNode({ data }) {
  const type = data.config?.type || 'manual';
  const platform = data.config?.target_platform || 'None';

  return (
    <div className="bg-white border-2 border-orange-400 rounded-xl shadow-sm min-w-[200px]">
      <div className="bg-orange-50 p-2 rounded-t-lg border-b border-orange-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-1.5 rounded-lg text-white">
            <Play className="h-4 w-4" />
          </div>
          <div className="font-semibold text-xs text-orange-900">Trigger</div>
        </div>
        <div className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded border border-orange-200">
          [{type.toUpperCase()}]
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-[10px] font-bold text-orange-800">Target Platform: {platform}</p>
        <p className="text-[10px] text-muted-foreground">Executes for all matching students</p>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </div>
  );
}
