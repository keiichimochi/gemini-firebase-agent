import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { MasterAgent } from './agents/MasterAgent';
import { TaskRequest, AgentResponse } from './types/agent.types';
import * as dotenv from 'dotenv';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

admin.initializeApp();

// Define the secret for Firebase Functions v2
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Initialize masterAgent inside functions since secrets are only available at runtime
let masterAgent: MasterAgent | null = null;

function initializeMasterAgent(): MasterAgent | null {
  if (masterAgent) return masterAgent;
  
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    logger.warn('Gemini API key is not configured.');
    return null;
  }
  
  masterAgent = new MasterAgent(apiKey);
  return masterAgent;
}

export const processagentrequest = onRequest(
  { secrets: [geminiApiKey] },
  async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const agent = initializeMasterAgent();
    if (!agent) {
      res.status(503).json({ 
        error: 'Service unavailable. Gemini API key not configured.' 
      });
      return;
    }

    const taskRequest: TaskRequest = req.body;
    
    if (!taskRequest.taskType || !taskRequest.parameters) {
      res.status(400).json({ 
        error: 'Invalid request. taskType and parameters are required.' 
      });
      return;
    }

    const response: AgentResponse = await agent.processRequest(taskRequest);
    
    res.status(response.success ? 200 : 500).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export const getagentinfo = onRequest(
  { secrets: [geminiApiKey] },
  async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const agent = initializeMasterAgent();
  const childAgents = agent ? agent.getChildAgents() : [];
  
  res.status(200).json({
    name: 'MasterAgent',
    version: '1.0.0',
    model: 'gemini-2.0-flash-exp',
    childAgents: childAgents,
    capabilities: [
      'Task orchestration',
      'Multi-agent coordination',
      'Context management',
      'Dynamic task delegation'
    ]
  });
});

export const chat = onRequest(
  { secrets: [geminiApiKey] },
  async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, sessionId, conversationHistory } = req.body;
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const taskRequest: TaskRequest = {
      taskType: 'chat',
      parameters: { message },
      context: {
        sessionId: sessionId || `session_${Date.now()}`,
        conversationHistory: conversationHistory || []
      }
    };

    const agent = initializeMasterAgent();
    if (!agent) {
      res.status(503).json({ 
        error: 'Service unavailable. Gemini API key not configured.' 
      });
      return;
    }

    const response = await agent.processRequest(taskRequest);
    res.status(200).json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});