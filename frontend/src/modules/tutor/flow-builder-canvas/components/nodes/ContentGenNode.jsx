import { Handle, Position } from 'reactflow';
import { FileText } from 'lucide-react';

export default function ContentGenNode({ data }) {
  const type = data.config?.output_type || 'Quiz';
  
  return (
    <div className="bg-white border-2 border-pink-400 rounded-xl shadow-sm min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-pink-500" />
      <div className="bg-pink-50 p-2 rounded-t-lg border-b border-pink-100 flex items-center gap-2">
        <div className="bg-pink-500 p-1.5 rounded-lg text-white">
          <FileText className="h-4 w-4" />
        </div>
        <div className="font-semibold text-xs text-pink-900">Content Gen</div>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-bold text-pink-800">Type: {type}</p>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-pink-500" />
    </div>
  );
}
