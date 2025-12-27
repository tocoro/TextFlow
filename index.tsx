import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Scale, 
  Feather, 
  Brain, 
  MessageCircle, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  Layout,
  MessageSquare,
  Zap,
  BookOpen,
  ArrowRight,
  Loader2,
  Globe,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  GitGraph,
  List,
  Maximize2,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Download,
  MousePointer2,
  Move,
  Search,
  ZoomIn,
  ZoomOut,
  Wand2,
  Layers,
  CornerDownRight
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---

enum TextType {
  LEGAL = 'LEGAL',
  POETRY = 'POETRY',
  PHILOSOPHY = 'PHILOSOPHY',
  SNS = 'SNS',
  GENERAL = 'GENERAL'
}

type Lang = 'ja' | 'en';

interface TextNode {
  id: string;
  type: string;
  content: string;
  children: TextNode[];
  metadata?: any;
  // Visual properties for graph view
  x?: number;
  y?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  relatedText?: string; // If the message proposes an analysis
  suggestedType?: TextType; // Suggested text type for analysis
  editingRequest?: string; // Optional editing instruction extracted from chat
}

interface TabData {
  id: string;
  type: 'CHAT' | 'ANALYSIS';
  title: string;
  initialText?: string; // For passing text from chat to analysis
  initialType?: TextType;
  initialRequest?: string;
}

// --- Configuration & Constants ---

const translations = {
  ja: {
    title: 'TextFlow',
    subtitle: 'AI文章構造分析',
    tabs: {
      chat: 'AIチャット',
      newAnalysis: '新規分析'
    },
    textTypes: {
      [TextType.LEGAL]: '法律・規約',
      [TextType.POETRY]: '詩歌・俳句',
      [TextType.PHILOSOPHY]: '哲学・論理',
      [TextType.SNS]: 'SNS・短文',
      [TextType.GENERAL]: '一般文章'
    },
    labels: {
      textType: 'テキストタイプ',
      sourceText: '分析対象テキスト',
      editingRequest: '編集・修正リクエスト',
      structureMap: '構造マップ',
      visualMap: 'ビジュアルエディタ',
      aiInsights: 'AIインサイト',
      result: '分析結果',
      season: '季語',
    },
    placeholders: {
      input: 'ここにテキストを入力してください...',
      editingRequest: '例: 第3条に例外を追加して / 上の句と下の句の間に言葉を足して...',
      chat: '分析したい文章を入力するか、質問してください...',
      enterText: 'テキストを入力して構造を可視化'
    },
    buttons: {
      analyze: '構造分解を実行',
      analyzing: '分析中...',
      paraphrase: '言い換え',
      steelman: '最善解釈',
      modernize: '現代語訳',
      counter: '反論',
      save: '保存',
      cancel: 'キャンセル',
      add: '追加',
      delete: '削除',
      openInLab: 'で構造ラボを開く', 
      graphView: 'グラフ表示',
      listView: 'リスト表示',
      exportMd: 'Markdown出力',
      expand: '詳しく',
      summarize: '要約',
      breakdown: '再分解'
    },
    messages: {
      intro: 'こんにちは！TextFlowへようこそ。文章の構造分析や推敲を行います。分析したいテキストをここに貼り付けるか、直接相談してください。',
      thinking: '思考中...',
      error: 'エラーが発生しました。',
      createdAnalysis: '新しい分析タブを作成しました。'
    }
  },
  en: {
    title: 'TextFlow',
    subtitle: 'AI Analysis Suite',
    tabs: {
      chat: 'AI Assistant',
      newAnalysis: 'New Analysis'
    },
    textTypes: {
      [TextType.LEGAL]: 'Legal / Terms',
      [TextType.POETRY]: 'Poetry / Haiku',
      [TextType.PHILOSOPHY]: 'Philosophy',
      [TextType.SNS]: 'Social Media',
      [TextType.GENERAL]: 'General'
    },
    labels: {
      textType: 'TEXT TYPE',
      sourceText: 'SOURCE TEXT',
      editingRequest: 'EDITING REQUEST',
      structureMap: 'Structure Map',
      visualMap: 'Visual Editor',
      aiInsights: 'AI Insights',
      result: 'RESULT',
      season: 'Seasonal Word',
    },
    placeholders: {
      input: 'Enter text here...',
      editingRequest: 'e.g., Add an exception to Article 3 / Add a phrase in the middle...',
      chat: 'Enter text to analyze or ask a question...',
      enterText: 'Enter text to visualize structure'
    },
    buttons: {
      analyze: 'Decompose Structure',
      analyzing: 'Analyzing...',
      paraphrase: 'Paraphrase',
      steelman: 'Steelman',
      modernize: 'Modernize',
      counter: 'Counter',
      save: 'Save',
      cancel: 'Cancel',
      add: 'Add',
      delete: 'Delete',
      openInLab: 'Open in Lab as',
      graphView: 'Graph View',
      listView: 'List View',
      exportMd: 'Export Markdown',
      expand: 'Expand',
      summarize: 'Summarize',
      breakdown: 'Breakdown'
    },
    messages: {
      intro: 'Hello! Welcome to TextFlow. Paste your text here to analyze its structure, or ask me anything.',
      thinking: 'Thinking...',
      error: 'An error occurred.',
      createdAnalysis: 'Created a new analysis tab.'
    }
  }
};

const typeConfig: Record<TextType, { icon: any; color: string; bg: string; border: string }> = {
  [TextType.LEGAL]: { icon: Scale, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  [TextType.POETRY]: { icon: Feather, color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
  [TextType.PHILOSOPHY]: { icon: Brain, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  [TextType.SNS]: { icon: MessageCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  [TextType.GENERAL]: { icon: FileText, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' }
};

const NODE_TYPES_BY_TEXT_TYPE: Record<TextType, string[]> = {
  [TextType.LEGAL]: ['RULE', 'CONDITION', 'EFFECT', 'EXCEPTION', 'DEFINITION', 'OTHER'],
  [TextType.POETRY]: ['VERSE', 'KIGO', 'SCENE', 'EMOTION', 'TECHNIQUE', 'OTHER'],
  [TextType.PHILOSOPHY]: ['AXIOM', 'DEFINITION', 'PROPOSITION', 'PROOF', 'COROLLARY', 'OTHER'],
  [TextType.SNS]: ['CLAIM', 'EVIDENCE', 'INTENT', 'RHETORIC', 'EMOTION', 'OTHER'],
  [TextType.GENERAL]: ['CLAIM', 'EVIDENCE', 'CONTEXT', 'SECTION', 'SUMMARY', 'OTHER']
};

const nodeColors: Record<string, string> = {
  ROOT: 'bg-slate-100 border-slate-300 text-slate-800',
  OTHER: 'bg-gray-50 border-gray-200 text-gray-600',
  // Legal
  RULE: 'bg-blue-100 border-blue-300 text-blue-900',
  CONDITION: 'bg-amber-100 border-amber-300 text-amber-900',
  EFFECT: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  EXCEPTION: 'bg-rose-100 border-rose-300 text-rose-900',
  DEFINITION: 'bg-purple-100 border-purple-300 text-purple-900',
  // Poetry
  VERSE: 'bg-pink-100 border-pink-300 text-pink-900',
  KIGO: 'bg-green-100 border-green-300 text-green-900',
  SCENE: 'bg-sky-100 border-sky-300 text-sky-900',
  EMOTION: 'bg-red-100 border-red-300 text-red-900',
  // Philosophy
  AXIOM: 'bg-slate-200 border-slate-400 text-slate-900',
  PROPOSITION: 'bg-indigo-100 border-indigo-300 text-indigo-900',
  PROOF: 'bg-cyan-100 border-cyan-300 text-cyan-900',
  // SNS
  CLAIM: 'bg-blue-100 border-blue-300 text-blue-900',
  EVIDENCE: 'bg-teal-100 border-teal-300 text-teal-900',
  INTENT: 'bg-orange-100 border-orange-300 text-orange-900',
  RHETORIC: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900',
};

// --- Services ---

const getDecompositionPrompt = (textType: TextType, text: string, lang: Lang, editingRequest?: string): string => {
  const languageInstruction = lang === 'ja' 
    ? "All 'content' fields in the JSON must be in Japanese." 
    : "All 'content' fields in the JSON must be in English.";

  return `
You are an expert in text structure analysis and editing.
Task: Decompose the text into a structured JSON tree.

IMPORTANT - EDITING REQUEST:
User has provided an Editing Request: "${editingRequest || 'None'}"

IF an Editing Request is provided:
1. First, apply the editing request to the INPUT TEXT mentally. (e.g., if asked to add a line, imagine it added).
2. Then, decompose the NEW, MODIFIED text structure.

RULES:
1. Return ONLY valid JSON.
2. The root object must be: { "id": "root", "type": "ROOT", "content": "Summary of the content", "children": [...] }
3. Generate appropriate "type" for children based on the TextType instructions below.
4. "id" should be unique (e.g., "node-1", "node-2").
5. ${languageInstruction}

TEXT TYPE: ${textType}

INPUT TEXT:
${text}
`;
};

// --- Tree Logic ---

const updateNodeInTree = (node: TextNode, targetId: string, newContent: string, newType: string): TextNode => {
  if (node.id === targetId) {
    return { ...node, content: newContent, type: newType };
  }
  if (node.children && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(child => updateNodeInTree(child, targetId, newContent, newType))
    };
  }
  return node;
};

const updateNodePositionInTree = (node: TextNode, targetId: string, x: number, y: number): TextNode => {
  if (node.id === targetId) {
    return { ...node, x, y };
  }
  if (node.children && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(child => updateNodePositionInTree(child, targetId, x, y))
    };
  }
  return node;
};

const updateNodeChildrenInTree = (node: TextNode, targetId: string, newChildren: TextNode[]): TextNode => {
  if (node.id === targetId) {
    return { ...node, children: [...(node.children || []), ...newChildren] };
  }
  if (node.children && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(child => updateNodeChildrenInTree(child, targetId, newChildren))
    };
  }
  return node;
};

const insertNodeInTree = (node: TextNode, parentId: string, newNode: TextNode): TextNode => {
  if (node.id === parentId) {
    // Safe spread: ensure node.children is an array before spreading
    const currentChildren = Array.isArray(node.children) ? node.children : [];
    return {
      ...node,
      children: [...currentChildren, newNode]
    };
  }
  if (node.children && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(child => insertNodeInTree(child, parentId, newNode))
    };
  }
  return node;
};

const removeNodeFromTree = (node: TextNode, targetId: string): TextNode | null => {
  if (node.id === targetId) return null;
  if (node.children && Array.isArray(node.children)) {
    const newChildren = node.children
      .map(child => removeNodeFromTree(child, targetId))
      .filter((child): child is TextNode => child !== null);
    return { ...node, children: newChildren };
  }
  return node;
};

// -- Indentation Logic --

const indentNodeInTree = (node: TextNode, targetId: string): TextNode => {
  if (!node.children || !Array.isArray(node.children) || node.children.length === 0) return node;

  const index = node.children.findIndex(c => c.id === targetId);
  if (index > 0) {
      // Target is a child of this node, and has a predecessor
      const targetNode = node.children[index];
      const prevSibling = node.children[index - 1];

      const newPrevSibling = {
          ...prevSibling,
          children: [...(Array.isArray(prevSibling.children) ? prevSibling.children : []), targetNode]
      };

      const newChildren = [...node.children];
      newChildren[index - 1] = newPrevSibling; // Update sibling to include target
      newChildren.splice(index, 1); // Remove target from original spot

      return { ...node, children: newChildren };
  }

  // Continue searching deeper
  return {
      ...node,
      children: node.children.map(child => indentNodeInTree(child, targetId))
  };
};

const outdentNodeInTree = (node: TextNode, targetId: string): TextNode => {
  if (!node.children || !Array.isArray(node.children) || node.children.length === 0) return node;

  // Does one of my children contain the target?
  for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.children && Array.isArray(child.children)) {
          const targetIndex = child.children.findIndex(c => c.id === targetId);
          if (targetIndex !== -1) {
              // Found the parent (child) and the target (grandchild)
              const targetNode = child.children[targetIndex];

              // 1. Remove target from parent (child)
              const newChildChildren = [...child.children];
              newChildChildren.splice(targetIndex, 1);
              const newChild = { ...child, children: newChildChildren };

              // 2. Add target to current node (grandparent), AFTER the parent
              const newChildren = [...node.children];
              newChildren[i] = newChild; // Update parent
              newChildren.splice(i + 1, 0, targetNode); // Insert target after parent

              return { ...node, children: newChildren };
          }
      }
  }

  // Recurse
  return {
      ...node,
      children: node.children.map(c => outdentNodeInTree(c, targetId))
  };
};


// --- Export Logic ---
const generateMarkdown = (node: TextNode, level: number = 0): string => {
  const indent = '  '.repeat(level);
  const bullet = level === 0 ? '# ' : '- ';
  let md = `${indent}${bullet}**${node.type}**: ${node.content}\n`;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      md += generateMarkdown(child, level + 1);
    });
  }
  return md;
};

// --- Graph Layout Logic (Simple Tree Layout) ---

const calculateTreeLayout = (root: TextNode, startX = 50, startY = 50, levelWidth = 280, nodeHeight = 100): TextNode => {
  // Only calculate if x and y are not already set (preserve manual positions)
  const cloned = JSON.parse(JSON.stringify(root));
  
  // Reset Y cursor for calculation
  let currentY = startY;

  const traverse = (node: TextNode, level: number) => {
    // If user hasn't manually moved it (we assume logic handles this check outside or we overwrite initially)
    if (node.x === undefined) node.x = startX + level * levelWidth;
    
    if (!node.children || !Array.isArray(node.children) || node.children.length === 0) {
      if (node.y === undefined) {
        node.y = currentY;
        currentY += nodeHeight;
      } else {
        // If node has Y, update cursor to avoid overlap for next nodes
        currentY = Math.max(currentY, node.y + nodeHeight);
      }
    } else {
      node.children.forEach(child => traverse(child, level + 1));
      
      // Fix: Only auto-center parent if it doesn't have a position yet.
      // This prevents the "parent moves when child drags" issue.
      if (node.y === undefined) {
        const firstChildY = node.children[0].y!;
        const lastChildY = node.children[node.children.length - 1].y!;
        node.y = (firstChildY + lastChildY) / 2;
      } else {
        // If parent is fixed, we still need to advance currentY for subsequent nodes in the traversal
        // so they don't overlap if they haven't been positioned.
        // Heuristic: Ensure currentY is at least below this parent's group
        const lastChildY = node.children[node.children.length - 1].y!;
        currentY = Math.max(currentY, lastChildY + nodeHeight);
      }
    }
  };

  traverse(cloned, 0);
  return cloned;
};

// --- Sub-Components ---

// 1. Outline View (List)
const NodeItem: React.FC<{ 
  node: TextNode; 
  level?: number;
  textType: TextType;
  selectedId?: string | null;
  onUpdate: (id: string, content: string, type: string) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  onIndent?: (id: string) => void;
  onOutdent?: (id: string) => void;
  onSelect?: (id: string) => void;
  onAiAction?: (node: TextNode, action: string) => void;
  onBreakdown?: (node: TextNode) => void;
}> = ({ node, level = 0, textType, selectedId, onUpdate, onAdd, onDelete, onIndent, onOutdent, onSelect, onAiAction, onBreakdown }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.content);
  const [editType, setEditType] = useState(node.type);
  const [showMenu, setShowMenu] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const colorClass = nodeColors[node.type] || nodeColors['OTHER'];
  // Ensure children check is safe
  const hasChildren = node.children && Array.isArray(node.children) && node.children.length > 0;
  const allowedTypes = NODE_TYPES_BY_TEXT_TYPE[textType] || NODE_TYPES_BY_TEXT_TYPE[TextType.GENERAL];
  const isRoot = node.type === 'ROOT';
  const isSelected = selectedId === node.id;

  // Auto-focus when selected and not editing
  useEffect(() => {
    if (isSelected && !isEditing && nodeRef.current) {
      // Use setTimeout to allow browser focus queue to clear if needed
      setTimeout(() => nodeRef.current?.focus(), 0);
    }
  }, [isSelected, isEditing, node.id]);

  const handleSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdate(node.id, editValue, editType);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        onOutdent?.(node.id);
      } else {
        onIndent?.(node.id);
      }
    }
    // Enter to edit
    if (e.key === 'Enter' && !isEditing) {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  return (
    <div className="relative">
      <div 
        ref={nodeRef}
        className={`flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer group outline-none 
          ${isSelected ? 'bg-indigo-50/80 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
        onClick={(e) => { e.stopPropagation(); onSelect?.(node.id); if (!isEditing && hasChildren) setIsOpen(!isOpen); }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ marginLeft: `${level * 24}px` }}
      >
        <button 
          className={`mt-1 text-slate-400 hover:text-indigo-500 transition-colors ${!hasChildren ? 'invisible' : ''}`}
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        >
           {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <div className={`flex-1 min-w-0 border rounded px-3 py-2 text-sm shadow-sm relative ${colorClass} ${isEditing ? 'ring-2 ring-indigo-500 bg-white z-10' : ''}`}>
          
          <div className="flex justify-between items-center mb-1">
            {isEditing && !isRoot ? (
              <select 
                value={editType} 
                onChange={(e) => setEditType(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-300 rounded px-1 py-0.5"
              >
                {allowedTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className="font-bold text-[10px] uppercase tracking-wider opacity-70">{node.type}</span>
            )}

            <div className="flex items-center gap-2 relative">
              {!isEditing && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onBreakdown?.(node); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-all text-indigo-600" title="AI Breakdown"><CornerDownRight size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onAdd(node.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-all text-slate-500"><Plus size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-all text-slate-500"><Edit2 size={12} /></button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-all text-slate-500"
                  >
                    <MoreHorizontal size={12} />
                  </button>
                  
                  {/* Context Menu */}
                  {showMenu && (
                    <div className="absolute right-0 top-6 bg-white border border-slate-200 shadow-xl rounded-lg z-50 w-32 py-1">
                      <button onClick={(e) => { e.stopPropagation(); onBreakdown?.(node); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2"><CornerDownRight size={10}/> Breakdown</button>
                      <button onClick={(e) => { e.stopPropagation(); onAiAction?.(node, 'expand'); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2"><Sparkles size={10}/> Expand</button>
                      <button onClick={(e) => { e.stopPropagation(); onAiAction?.(node, 'summarize'); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2"><Sparkles size={10}/> Summary</button>
                      {!isRoot && <div className="h-px bg-slate-100 my-1"></div>}
                      {!isRoot && <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(node.id); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-500 flex items-center gap-2"><Trash2 size={10}/> Delete</button>}
                    </div>
                  )}
                  {showMenu && <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />}
                </>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-800 outline-none focus:ring-1 focus:ring-indigo-300 mb-2 resize-y custom-scroll"
                rows={3}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X size={14} /></button>
                <button onClick={handleSave} className="p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded"><Check size={14} /></button>
              </div>
            </div>
          ) : (
            <div className="font-medium leading-relaxed break-words whitespace-pre-wrap">{node.content}</div>
          )}
        </div>
      </div>
      
      {isOpen && hasChildren && (
        <div className="relative">
          {/* Tree vertical line */}
          <div className="absolute top-0 bottom-2 w-px bg-slate-200" style={{ left: `${level * 24 + 20}px` }}></div>
          {node.children.map(child => (
            <NodeItem 
              key={child.id} 
              node={child} 
              level={level + 1} 
              textType={textType} 
              selectedId={selectedId}
              onUpdate={onUpdate} 
              onAdd={onAdd} 
              onDelete={onDelete} 
              onIndent={onIndent} 
              onOutdent={onOutdent} 
              onSelect={onSelect}
              onAiAction={onAiAction}
              onBreakdown={onBreakdown}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 2. Graph View (Visual Editor)
const GraphView: React.FC<{
  rootNode: TextNode;
  textType: TextType;
  onUpdate: (id: string, content: string, type: string) => void;
  onPositionUpdate: (id: string, x: number, y: number) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  onAiAction?: (node: TextNode, action: string) => void;
  onBreakdown?: (node: TextNode) => void;
}> = ({ rootNode, textType, onUpdate, onPositionUpdate, onAdd, onDelete, onAiAction, onBreakdown }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Drag State
  const [isPanning, setIsPanning] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });

  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Use rootNode directly because layout is now managed in AnalysisTab state. 
  // We still run calculateTreeLayout to fill in gaps if any, but it preserves existing X/Y.
  const layoutRoot = useMemo(() => {
    if (!rootNode) return null;
    return calculateTreeLayout(rootNode);
  }, [rootNode]);

  // Handle Zoom via Wheel with non-passive listener to prevent default scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.001;
      // Allow zooming without Ctrl key for smoother experience like infinite canvas tools
      setScale(s => Math.min(Math.max(0.1, s + zoomFactor), 3));
    };

    // React's onWheel is passive by default in some cases, so we use native listener with non-passive option
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []); // Empty dependency array as setScale handles previous state correctly

  if (!layoutRoot) return null;

  // Flatten nodes for rendering
  const flattenedNodes: TextNode[] = [];
  const edges: { x1: number, y1: number, x2: number, y2: number }[] = [];
  
  const collect = (node: TextNode) => {
    flattenedNodes.push(node);
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        edges.push({ x1: node.x! + 200, y1: node.y!, x2: child.x!, y2: child.y! });
        collect(child);
      });
    }
  };
  collect(layoutRoot);

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space+Click to pan
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; // Only Left Click
    e.stopPropagation();
    setDragNodeId(nodeId);
    setStartDragPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setStartPan({ x: e.clientX, y: e.clientY });
    } else if (dragNodeId) {
      const dx = (e.clientX - startDragPos.x) / scale;
      const dy = (e.clientY - startDragPos.y) / scale;
      
      const node = flattenedNodes.find(n => n.id === dragNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
         onPositionUpdate(dragNodeId, node.x + dx, node.y + dy);
      }
      setStartDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragNodeId(null);
  };

  return (
    <div 
      className="flex-1 overflow-hidden bg-slate-100 relative h-full cursor-grab active:cursor-grabbing select-none"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-md border border-slate-200">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-1 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={16} /></button>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-1 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={16} /></button>
        <div className="text-xs text-center font-mono text-slate-400">{Math.round(scale * 100)}%</div>
      </div>
      
      <div className="absolute bottom-4 left-4 z-50 bg-white/90 p-2 rounded text-xs text-slate-500 shadow-sm pointer-events-none">
        Wheel to Zoom • Shift+Drag to Pan
      </div>

      <div 
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, 
          transformOrigin: '0 0',
          width: '10000px', // Large canvas
          height: '10000px'
        }} 
        className="relative"
      >
        {/* SVG Layer for Edges */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          {edges.map((e, i) => (
            <path 
              key={i} 
              d={`M ${e.x1} ${e.y1} C ${e.x1 + 50} ${e.y1}, ${e.x2 - 50} ${e.y2}, ${e.x2} ${e.y2}`}
              fill="none" 
              stroke="#cbd5e1" 
              strokeWidth="2" 
            />
          ))}
        </svg>

        {/* Nodes Layer */}
        {flattenedNodes.map((node) => {
           const colorClass = nodeColors[node.type] || nodeColors['OTHER'];
           const isEditing = editingId === node.id;
           const allowedTypes = NODE_TYPES_BY_TEXT_TYPE[textType];

           return (
             <div 
               key={node.id}
               className={`absolute w-[220px] transition-shadow duration-200 z-10 flex flex-col`}
               style={{ left: node.x, top: node.y, transform: 'translate(0, -50%)' }}
               onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
             >
               <div className={`
                 bg-white border shadow-sm rounded-lg p-2 text-sm cursor-default
                 ${colorClass}
                 ${isEditing ? 'ring-2 ring-indigo-500 z-50 scale-105 shadow-xl' : 'hover:shadow-md'}
               `}>
                 <div className="flex justify-between items-center mb-1 border-b border-black/5 pb-1">
                   {isEditing ? (
                      <select 
                        defaultValue={node.type}
                        id={`type-${node.id}`}
                        className="text-[10px] bg-white border rounded"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                         {allowedTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   ) : (
                     <span className="text-[10px] font-bold uppercase opacity-70 cursor-move">{node.type}</span>
                   )}
                   <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
                      {!isEditing ? (
                        <>
                           <button onClick={() => onBreakdown?.(node)} className="p-0.5 hover:bg-black/10 rounded text-indigo-600" title="AI Breakdown"><CornerDownRight size={10} /></button>
                           <button onClick={() => onAiAction?.(node, 'expand')} className="p-0.5 hover:bg-black/10 rounded text-indigo-500" title="AI Expand"><Sparkles size={10} /></button>
                          <button onClick={() => onAdd(node.id)} className="p-0.5 hover:bg-black/10 rounded" title="Add Child"><Plus size={10} /></button>
                          <button onClick={() => setEditingId(node.id)} className="p-0.5 hover:bg-black/10 rounded" title="Edit"><Edit2 size={10} /></button>
                          {node.type !== 'ROOT' && <button onClick={() => onDelete(node.id)} className="p-0.5 hover:bg-red-100 text-red-500 rounded" title="Delete"><Trash2 size={10} /></button>}
                        </>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => {
                             const content = (document.getElementById(`content-${node.id}`) as HTMLTextAreaElement).value;
                             const type = (document.getElementById(`type-${node.id}`) as HTMLSelectElement).value;
                             onUpdate(node.id, content, type);
                             setEditingId(null);
                          }} className="p-0.5 bg-indigo-500 text-white rounded"><Check size={10} /></button>
                          <button onClick={() => setEditingId(null)} className="p-0.5 hover:bg-slate-100 rounded"><X size={10} /></button>
                        </div>
                      )}
                   </div>
                 </div>
                 {isEditing ? (
                   <textarea 
                     id={`content-${node.id}`}
                     defaultValue={node.content} 
                     className="w-full text-xs p-1 border rounded resize-none" 
                     rows={3} 
                     autoFocus
                     onClick={e => e.stopPropagation()}
                     onMouseDown={e => e.stopPropagation()}
                   />
                 ) : (
                   <div className="text-xs line-clamp-4 font-medium" onDoubleClick={() => setEditingId(node.id)}>{node.content}</div>
                 )}
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};


// 3. Tab Components

const ChatTab = ({ lang, onOpenAnalysis }: { lang: Lang, onOpenAnalysis: (text: string, type?: TextType, request?: string) => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = translations[lang];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: 'init', role: 'assistant', content: t.messages.intro }]);
    }
  }, [lang]);

  const sendMessage = async () => {
    if (!inputRef.current?.value) return;
    const text = inputRef.current.value;
    inputRef.current.value = '';
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          User message: ${text}
          Lang: ${lang}
          
          Analyze the user's message.
          1. Respond naturally to the user.
          2. If the user provided a text block (e.g., a poem, a contract, a social post) or asked to analyze something, extract that text as 'analysisTarget'.
          3. If 'analysisTarget' is present, classify it into one of these TextTypes: LEGAL, POETRY, PHILOSOPHY, SNS, GENERAL.
          4. If the user included any requests to modify, edit, or specific instructions for the analysis (e.g., "add a middle phrase", "rewrite as formal"), extract that as 'editingRequest'.
          
          Return JSON:
          {
            "response": "Your conversational response here...",
            "analysisTarget": "The extracted text to analyze (or null if none)",
            "textType": "ONE_OF_THE_ENUMS (or null)",
            "editingRequest": "extracted instruction (or null)"
          }
        `,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || "{}");
      const { response: aiText, analysisTarget, textType, editingRequest } = data;

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: aiText || t.messages.error,
        relatedText: analysisTarget || undefined,
        suggestedType: textType || undefined,
        editingRequest: editingRequest || undefined
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: t.messages.error }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 max-w-4xl mx-auto w-full border-x border-slate-200 shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
              ? 'bg-indigo-600 text-white rounded-br-none' 
              : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && msg.relatedText && (
              <div className="flex flex-col items-start gap-1">
                {msg.editingRequest && (
                  <div className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-1.5 max-w-[300px]">
                    <Wand2 size={12} />
                    <span className="truncate">{msg.editingRequest}</span>
                  </div>
                )}
                <button 
                  onClick={() => onOpenAnalysis(msg.relatedText!, msg.suggestedType, msg.editingRequest)}
                  className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  <Layout size={14} />
                  <span className="font-bold">{msg.suggestedType ? t.textTypes[msg.suggestedType] : ''}</span>
                  {t.buttons.openInLab}
                </button>
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-slate-500 p-4">
            <Loader2 size={16} className="animate-spin" /> {t.messages.thinking}
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative">
           <textarea 
             ref={inputRef}
             onKeyDown={handleKeyDown}
             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-12 resize-none custom-scroll shadow-sm"
             placeholder={t.placeholders.chat}
             rows={3}
           />
           <button 
             onClick={sendMessage}
             disabled={isThinking}
             className="absolute right-3 bottom-3 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-slate-300 shadow-sm"
           >
             <ArrowRight size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

const AnalysisTab = ({ initialText, initialType, initialRequest, lang }: { initialText?: string, initialType?: TextType, initialRequest?: string, lang: Lang }) => {
  const [textType, setTextType] = useState<TextType>(initialType || TextType.GENERAL);
  const [rawText, setRawText] = useState(initialText || '');
  const [editingRequest, setEditingRequest] = useState(initialRequest || '');
  const [rootNode, setRootNode] = useState<TextNode | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRAPH'>('LIST');
  const [analysisOutput, setAnalysisOutput] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const t = translations[lang];

  const TOOL_LABELS: Record<string, string> = {
    Paraphrase: t.buttons.paraphrase,
    Steelman: t.buttons.steelman,
    Modern: t.buttons.modernize,
    Counter: t.buttons.counter
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: getDecompositionPrompt(textType, rawText, lang, editingRequest),
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || "{}");
      
      // Calculate initial layout immediately to freeze positions
      const layoutData = calculateTreeLayout(data);
      setRootNode(layoutData);

       // Also generate a quick summary/analysis text
      const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on this structured data: ${JSON.stringify(data)}, provide a brief 3-sentence analytical summary focusing on the key insights for a ${textType} context. Output strictly in ${lang === 'ja' ? 'Japanese' : 'English'}.`
      });
      setAnalysisOutput(summaryResponse.text || "");
    } catch (e) {
      console.error(e);
      alert(t.messages.error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdate = (id: string, c: string, type: string) => {
    if (rootNode) setRootNode(updateNodeInTree(rootNode, id, c, type));
  };
  const handlePositionUpdate = (id: string, x: number, y: number) => {
    if (rootNode) setRootNode(updateNodePositionInTree(rootNode, id, x, y));
  };
  const handleAdd = (parentId: string) => {
    if (rootNode) {
      const newNode = { id: `new-${Date.now()}`, type: NODE_TYPES_BY_TEXT_TYPE[textType][0], content: 'New Node', children: [] };
      const newTree = insertNodeInTree(rootNode, parentId, newNode);
      // Re-run layout to position new node, preserving others
      setRootNode(calculateTreeLayout(newTree));
    }
  };
  const handleDelete = (id: string) => {
    if (rootNode && id !== rootNode.id) {
       const newTree = removeNodeFromTree(rootNode, id);
       if (newTree) setRootNode(calculateTreeLayout(newTree));
    }
  };
  const handleIndent = (id: string) => {
    if (rootNode) {
       const newTree = indentNodeInTree(rootNode, id);
       setRootNode(calculateTreeLayout(newTree));
    }
  };
  const handleOutdent = (id: string) => {
    if (rootNode) {
       const newTree = outdentNodeInTree(rootNode, id);
       setRootNode(calculateTreeLayout(newTree));
    }
  };

  const handleBreakdown = async (node: TextNode) => {
    if (!rootNode) return;
    setAnalysisOutput(`BREAKDOWN for "${node.content.slice(0, 20)}..." \n${t.messages.thinking}`);
    try {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
       const response = await ai.models.generateContent({
         model: 'gemini-3-flash-preview',
         contents: `
           Task: Break down the following text node into more detailed structural components (children).
           Input Node Content: "${node.content}"
           Text Type: ${textType}
           Language: ${lang}
           
           Rules:
           1. Create 3-5 child nodes that represent a deeper logical breakdown of the input.
           2. Return ONLY valid JSON with a "children" array.
           3. Child nodes must have "id", "type", "content", and empty "children" array.
           4. "type" should be appropriate for ${textType} (e.g., for Legal: RULE -> CONDITIONS/EXCEPTIONS).
           
           JSON Schema:
           {
             "children": [
               { "id": "uuid", "type": "TYPE", "content": "content", "children": [] }
             ]
           }
         `,
         config: { responseMimeType: "application/json" }
       });
       const data = JSON.parse(response.text || "{}");
       if (data.children && Array.isArray(data.children)) {
          // Generate IDs if missing
          const newChildren = data.children.map((c: any, i: number) => ({
             ...c,
             id: c.id || `gen-${Date.now()}-${i}`,
             children: c.children || []
          }));
          
          const newTree = updateNodeChildrenInTree(rootNode, node.id, newChildren);
          setRootNode(calculateTreeLayout(newTree));
          setAnalysisOutput(`Breakdown complete for "${node.content.slice(0, 20)}..."`);
       }
    } catch(e) { 
       console.error(e);
       setAnalysisOutput(t.messages.error); 
    }
  };

  const handleFeature = async (feature: string) => {
      if (!rootNode) return;
      setAnalysisOutput(t.messages.thinking);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: `Task: ${feature} Analysis. Context: ${JSON.stringify(rootNode)}. Lang: ${lang}.`
        });
        setAnalysisOutput(response.text || "");
      } catch(e) { setAnalysisOutput(t.messages.error); }
  };

  const handleNodeAiAction = async (node: TextNode, action: string) => {
     setAnalysisOutput(`${action.toUpperCase()} for "${node.content.slice(0, 20)}..." \n${t.messages.thinking}`);
     try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `
            Action: ${action}
            Target Node: ${JSON.stringify(node)}
            Full Context Root: ${JSON.stringify(rootNode).slice(0, 1000)}...
            
            Perform the action (Expand, Summarize, etc.) on the target node content.
            Output purely the result in ${lang === 'ja' ? 'Japanese' : 'English'}.
          `
        });
        setAnalysisOutput(prev => `[${action.toUpperCase()}: ${node.content.slice(0, 15)}...]\n\n${response.text}\n\n---\n\n${prev}`);
     } catch(e) { setAnalysisOutput(t.messages.error); }
  };

  const handleExportMarkdown = () => {
    if (!rootNode) return;
    const md = generateMarkdown(rootNode);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${rootNode.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white h-full">
      {/* Left Sidebar: Controls */}
      <div className="w-[280px] border-r border-slate-200 flex flex-col bg-slate-50/50 z-20 shadow-sm shrink-0">
        <div className="p-4 flex-1 overflow-y-auto custom-scroll">
           <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t.labels.textType}</label>
           <select 
             className="w-full p-2 rounded bg-white border border-slate-300 text-sm mb-6"
             value={textType}
             onChange={(e) => setTextType(e.target.value as TextType)}
           >
             {Object.values(TextType).map(type => <option key={type} value={type}>{t.textTypes[type]}</option>)}
           </select>
           
           <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">{t.labels.sourceText}</label>
           <textarea 
             className="w-full h-64 p-3 text-sm border border-slate-300 rounded-lg resize-none mb-6 focus:ring-2 focus:ring-indigo-200 outline-none transition-shadow"
             value={rawText}
             onChange={(e) => setRawText(e.target.value)}
             placeholder={t.placeholders.input}
           />

           <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1">
             <Wand2 size={12} /> {t.labels.editingRequest}
           </label>
           <textarea 
             className="w-full h-32 p-3 text-sm border border-amber-200 bg-amber-50/50 rounded-lg resize-none mb-6 focus:ring-2 focus:ring-amber-200 outline-none placeholder:text-amber-800/30 text-amber-900 transition-shadow"
             value={editingRequest}
             onChange={(e) => setEditingRequest(e.target.value)}
             placeholder={t.placeholders.editingRequest}
           />

           <button 
             onClick={handleAnalyze} 
             disabled={isAnalyzing || !rawText}
             className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:bg-slate-300 font-medium text-sm flex justify-center items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
           >
             {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16} fill="currentColor"/>}
             {t.buttons.analyze}
           </button>
        </div>
      </div>

      {/* Main View: Visualization (Center) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative border-r border-slate-200">
         <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Layout size={18} className="text-indigo-500" />
              {viewMode === 'LIST' ? t.labels.structureMap : t.labels.visualMap}
            </h2>
            <div className="flex items-center gap-2">
               {rootNode && (
                 <button 
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors mr-2"
                 >
                    <Download size={14} /> {t.buttons.exportMd}
                 </button>
               )}
               <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    title={t.buttons.listView}
                  ><List size={16} /></button>
                  <button 
                    onClick={() => setViewMode('GRAPH')}
                    className={`p-1.5 rounded ${viewMode === 'GRAPH' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    title={t.buttons.graphView}
                  ><GitGraph size={16} /></button>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-hidden relative">
            {!rootNode ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                 <BookOpen size={48} strokeWidth={1} />
                 <p className="mt-4 text-sm">{t.placeholders.enterText}</p>
               </div>
            ) : (
               viewMode === 'LIST' ? (
                 <div className="p-8 overflow-auto h-full custom-scroll" onClick={() => setSelectedNodeId(null)}>
                    <NodeItem 
                      node={rootNode} 
                      textType={textType} 
                      selectedId={selectedNodeId}
                      onUpdate={handleUpdate} 
                      onAdd={handleAdd} 
                      onDelete={handleDelete} 
                      onIndent={handleIndent} 
                      onOutdent={handleOutdent} 
                      onSelect={setSelectedNodeId}
                      onAiAction={handleNodeAiAction} 
                      onBreakdown={handleBreakdown}
                    />
                 </div>
               ) : (
                 <GraphView 
                   rootNode={rootNode} 
                   textType={textType} 
                   onUpdate={handleUpdate} 
                   onPositionUpdate={handlePositionUpdate}
                   onAdd={handleAdd} 
                   onDelete={handleDelete} 
                   onAiAction={handleNodeAiAction}
                   onBreakdown={handleBreakdown}
                 />
               )
            )}
         </div>
      </div>

      {/* Right Sidebar: AI Insights */}
      <div className="w-[350px] bg-white flex flex-col z-20 shadow-lg shrink-0">
         <div className="h-12 border-b border-slate-200 bg-slate-50/50 flex items-center px-4 shrink-0 justify-between">
             <div className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <Sparkles size={16} className="text-indigo-500" />
                {t.labels.aiInsights}
             </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 custom-scroll bg-slate-50/30">
           <div className="flex flex-wrap gap-2 mb-6">
              {['Paraphrase', 'Steelman', 'Modern', 'Counter'].map(f => (
                <button key={f} onClick={() => handleFeature(f)} disabled={!rootNode} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm">{TOOL_LABELS[f] || f}</button>
              ))}
           </div>
           
           <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm min-h-[200px]">
               {analysisOutput ? (
                 <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-700">
                   {analysisOutput}
                 </div>
               ) : (
                 <div className="text-slate-400 text-sm text-center mt-10 italic flex flex-col items-center gap-2">
                   <Sparkles size={24} className="opacity-20" />
                   <div>Select text and choose an AI tool</div>
                 </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};


// --- Main App ---

const App = () => {
  const [lang, setLang] = useState<Lang>('ja');
  const [tabs, setTabs] = useState<TabData[]>([{ id: 'chat-1', type: 'CHAT', title: 'AI Chat' }]);
  const [activeTabId, setActiveTabId] = useState('chat-1');
  const t = translations[lang];

  const handleNewAnalysis = (initialText?: string, initialType?: TextType, initialRequest?: string) => {
    const newId = `analysis-${Date.now()}`;
    const newTab: TabData = { 
      id: newId, 
      type: 'ANALYSIS', 
      title: `Analysis ${tabs.filter(t => t.type === 'ANALYSIS').length + 1}`,
      initialText,
      initialType,
      initialRequest
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-800 font-sans">
      {/* Header & Tabs */}
      <header className="bg-white border-b border-slate-200 flex items-center px-4 h-12 shadow-sm z-30 gap-4">
        <div className="flex items-center gap-2 mr-4">
           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-1 rounded shadow">
             <Sparkles size={16} />
           </div>
           <span className="font-bold text-slate-700 hidden md:block">TextFlow</span>
        </div>

        <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scroll no-scrollbar">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-all border-b-2
                ${activeTabId === tab.id 
                  ? 'bg-slate-50 border-indigo-500 text-indigo-700' 
                  : 'hover:bg-slate-50 border-transparent text-slate-500 hover:text-slate-700'}
              `}
            >
              {tab.type === 'CHAT' ? <MessageSquare size={14} /> : <Layout size={14} />}
              <span className="truncate max-w-[120px]">{tab.type === 'CHAT' ? t.tabs.chat : tab.title}</span>
              {tab.type !== 'CHAT' && (
                <button onClick={(e) => closeTab(e, tab.id)} className="opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded p-0.5">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button 
             onClick={() => handleNewAnalysis()} 
             className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-500 transition-colors"
             title={t.tabs.newAnalysis}
          >
            <Plus size={16} />
          </button>
        </div>

        <button 
          onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          <Globe size={14} /> {lang === 'ja' ? 'EN' : 'JA'}
        </button>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab?.type === 'CHAT' && (
          <ChatTab lang={lang} onOpenAnalysis={handleNewAnalysis} />
        )}
        {tabs.map(tab => (
           tab.type === 'ANALYSIS' && (
             <div key={tab.id} className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}>
                <AnalysisTab initialText={tab.initialText} initialType={tab.initialType} initialRequest={tab.initialRequest} lang={lang} />
             </div>
           )
        ))}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);