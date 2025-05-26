export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  sessionId: string;
  userId?: string;
  conversationHistory: AgentMessage[];
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface TaskRequest {
  taskType: string;
  parameters: Record<string, any>;
  context?: AgentContext;
}

export interface ChildAgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
}