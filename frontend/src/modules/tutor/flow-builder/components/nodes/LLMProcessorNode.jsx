import { Handle, Position } from 'reactflow';
import { BrainCircuit } from 'lucide-react';

export default function LLMProcessorNode({ data }) {
  const provider = data.config?.llm_provider || 'Emergent Universal Key';
  
  return (
    <div className="bg-white border-2 border-purple-400 rounded-xl shadow-sm min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
      <div className="bg-purple-50 p-2 rounded-t-lg border-b border-purple-100 flex items-center gap-2">
        <div className="bg-purple-500 p-1.5 rounded-lg text-white">
          <BrainCircuit className="h-4 w-4" />
        </div>
        <div className="font-semibold text-xs text-purple-900">LLM Processor</div>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-bold text-purple-800 mb-1">{provider}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-2">
          {data.config?.prompt || 'No prompt defined'}
        </p>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}
