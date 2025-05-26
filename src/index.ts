import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { MasterAgent } from './agents/MasterAgent';
import { TaskRequest, AgentResponse } from './types/agent.types';
import * as dotenv from 'dotenv';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

admin.initializeApp();

const GEMINI_API_KEY = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('Gemini API key is not configured. Set GEMINI_API_KEY in .env file or Firebase config.');
}

const masterAgent = GEMINI_API_KEY ? new MasterAgent(GEMINI_API_KEY) : null;

export const processAgentRequest = functions.region('us-central1').https.onRequest(async (req, res) => {
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
    if (!masterAgent) {
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

    const response: AgentResponse = await masterAgent.processRequest(taskRequest);
    
    res.status(response.success ? 200 : 500).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export const getAgentInfo = functions.https.onRequest(async (req, res) => {
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

  const childAgents = masterAgent ? masterAgent.getChildAgents() : [];
  
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

export const chat = functions.https.onRequest(async (req, res) => {
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

    if (!masterAgent) {
      res.status(503).json({ 
        error: 'Service unavailable. Gemini API key not configured.' 
      });
      return;
    }

    const response = await masterAgent.processRequest(taskRequest);
    res.status(200).json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});