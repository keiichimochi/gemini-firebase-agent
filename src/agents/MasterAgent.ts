import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AgentMessage, AgentContext, AgentResponse, TaskRequest, ChildAgentConfig } from '../types/agent.types';

export class MasterAgent {
  private model: GenerativeModel;
  private childAgents: Map<string, ChildAgentConfig>;
  
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    this.childAgents = new Map();
    this.initializeChildAgents();
  }

  private initializeChildAgents(): void {
    const childAgentConfigs: ChildAgentConfig[] = [
      {
        name: 'DataAnalysisAgent',
        description: 'Handles data analysis and processing tasks',
        capabilities: ['data_analysis', 'statistics', 'visualization'],
        systemPrompt: 'You are a data analysis specialist. Focus on providing insights and statistical analysis.'
      },
      {
        name: 'ContentGenerationAgent',
        description: 'Handles content creation and text generation',
        capabilities: ['content_creation', 'summarization', 'translation'],
        systemPrompt: 'You are a content creation specialist. Focus on generating high-quality text content.'
      },
      {
        name: 'CodeAssistantAgent',
        description: 'Handles coding and technical tasks',
        capabilities: ['code_generation', 'debugging', 'optimization'],
        systemPrompt: 'You are a coding assistant. Focus on providing clean, efficient code solutions.'
      }
    ];

    childAgentConfigs.forEach(config => {
      this.childAgents.set(config.name, config);
    });
  }

  async processRequest(request: TaskRequest): Promise<AgentResponse> {
    try {
      const { taskType, parameters, context } = request;
      
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(taskType, parameters, context);
      
      const chat = this.model.startChat({
        history: this.convertToGeminiHistory(context?.conversationHistory || []),
      });

      const result = await chat.sendMessage(userPrompt);
      const response = await result.response;
      const text = response.text();

      const delegationDecision = this.analyzeForDelegation(text, taskType);
      
      if (delegationDecision.shouldDelegate) {
        return {
          success: true,
          message: `Task delegated to ${delegationDecision.targetAgent}`,
          data: {
            delegatedTo: delegationDecision.targetAgent,
            reason: delegationDecision.reason,
            originalResponse: text
          }
        };
      }

      return {
        success: true,
        message: text,
        data: {
          taskType,
          processedBy: 'MasterAgent'
        }
      };
    } catch (error) {
      console.error('Error processing request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildSystemPrompt(): string {
    const childAgentsList = Array.from(this.childAgents.values())
      .map(agent => `- ${agent.name}: ${agent.description} (Capabilities: ${agent.capabilities.join(', ')})`)
      .join('\n');

    return `You are a Master Agent orchestrating multiple specialized AI agents. Your role is to:
1. Understand and analyze incoming requests
2. Determine if a task should be delegated to a child agent
3. Coordinate responses and ensure quality

Available child agents:
${childAgentsList}

When you identify a task that matches a child agent's capabilities, indicate in your response that the task should be delegated.`;
  }

  private buildUserPrompt(taskType: string, parameters: Record<string, any>, context?: AgentContext): string {
    let prompt = `Task Type: ${taskType}\n`;
    prompt += `Parameters: ${JSON.stringify(parameters, null, 2)}\n`;
    
    if (context?.metadata) {
      prompt += `Additional Context: ${JSON.stringify(context.metadata, null, 2)}\n`;
    }
    
    return prompt;
  }

  private convertToGeminiHistory(messages: AgentMessage[]): Array<{role: string, parts: string}> {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: msg.content
    }));
  }

  private analyzeForDelegation(response: string, taskType: string): {
    shouldDelegate: boolean;
    targetAgent?: string;
    reason?: string;
  } {
    const lowerResponse = response.toLowerCase();
    const lowerTaskType = taskType.toLowerCase();

    for (const [agentName, config] of this.childAgents) {
      const hasCapability = config.capabilities.some(cap => 
        lowerTaskType.includes(cap) || lowerResponse.includes(cap)
      );
      
      if (hasCapability || lowerResponse.includes(agentName.toLowerCase())) {
        return {
          shouldDelegate: true,
          targetAgent: agentName,
          reason: `Task matches ${agentName} capabilities`
        };
      }
    }

    return { shouldDelegate: false };
  }

  getChildAgents(): ChildAgentConfig[] {
    return Array.from(this.childAgents.values());
  }

  registerChildAgent(config: ChildAgentConfig): void {
    this.childAgents.set(config.name, config);
  }
}