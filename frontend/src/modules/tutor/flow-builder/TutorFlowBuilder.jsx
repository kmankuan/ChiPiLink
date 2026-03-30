import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, ArrowLeft, Play, Settings2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

// Custom Nodes
import TriggerNode from './components/nodes/TriggerNode';
import ScrapeNode from './components/nodes/ScrapeNode';
import LLMProcessorNode from './components/nodes/LLMProcessorNode';
import IntegrationNode from './components/nodes/IntegrationNode';
import ContentGenNode from './components/nodes/ContentGenNode';

import NodeConfigPanel from './components/NodeConfigPanel';

const nodeTypes = {
  trigger: TriggerNode,
  scrape: ScrapeNode,
  llm_process: LLMProcessorNode,
  integration: IntegrationNode,
  content_gen: ContentGenNode,
};

const initialNodes = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 50, y: 250 },
    data: { label: 'Form Trigger / Schedule', type: 'manual' },
  },
];

const initialEdges = [];

export default function TutorFlowBuilder() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const onNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
  };

  const addNode = (type) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 300 + 200, y: Math.random() * 200 + 100 },
      data: { 
        label: `New ${type}`,
        config: {} 
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeConfig = (nodeId, newConfig) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, config: { ...node.data.config, ...newConfig } },
          };
        }
        return node;
      })
    );
  };

  const saveFlow = () => {
    const flowData = { nodes, edges };
    console.log("Saving flow:", flowData);
    toast.success('Flow saved successfully! (Mocked)');
  };

  const runTest = async () => {
    setRunning(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/api/tutor/school-feed-config/flow/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nodes, edges })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Test run completed!');
        setTestResult(data);
      } else {
        toast.error(`Test run failed: ${data.detail || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error('Network error during test run.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar Tools */}
      <div className="w-64 bg-background border-r flex flex-col h-full z-10 shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-bold text-sm">Tutor Flow Engine</h2>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Nodes</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-xs" onClick={() => addNode('scrape')}>
                <Plus className="h-3 w-3 mr-2" /> School Scraper
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs" onClick={() => addNode('llm_process')}>
                <Plus className="h-3 w-3 mr-2" /> LLM Processor
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs" onClick={() => addNode('integration')}>
                <Plus className="h-3 w-3 mr-2" /> Monday / FuseBase
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs" onClick={() => addNode('content_gen')}>
                <Plus className="h-3 w-3 mr-2" /> Gen: Quiz/Flashcards
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/10 space-y-2">
          <Button className="w-full gap-2 bg-primary" onClick={saveFlow}>
            <Save className="h-4 w-4" /> Save Workflow
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={runTest} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-green-600" />}
            Test Run
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50"
        >
          <Background color="#ccc" gap={16} />
          <Controls />
        </ReactFlow>

        {/* Configuration Panel (Slides in from right when node is selected) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 bg-background rounded-xl shadow-xl border overflow-hidden flex flex-col max-h-[90%] z-20">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Node Settings
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNodeId(null)}>✕</Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <NodeConfigPanel 
                node={selectedNode} 
                onChange={(config) => updateNodeConfig(selectedNode.id, config)} 
              />
            </div>
          </div>
        )}

        {/* Execution Result Log Overlay */}
        {testResult && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-black text-green-400 p-4 rounded-xl shadow-2xl font-mono text-xs overflow-y-auto max-h-64 z-20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">Execution Log</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white" onClick={() => setTestResult(null)}>✕</Button>
            </div>
            {testResult.log?.map((l, i) => (
              <div key={i} className="py-0.5 opacity-90">&gt; {l}</div>
            ))}
            {testResult.context?.llm_output && (
              <div className="mt-4 p-2 bg-green-900/30 rounded border border-green-800">
                <div className="text-white font-bold mb-1">LLM Output:</div>
                <div className="whitespace-pre-wrap">{testResult.context.llm_output}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
