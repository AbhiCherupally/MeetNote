const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.defaultModel = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free';
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://meetnote.app',
        'X-Title': 'MeetNote AI'
      }
    });
  }

  /**
   * Generate meeting summary from transcript
   */
  async generateMeetingSummary(transcript, participants = []) {
    try {
      const prompt = `Analyze this meeting transcript and create a JSON summary.

TRANSCRIPT: ${transcript.substring(0, 2000)}
PARTICIPANTS: ${participants.join(', ')}

Create JSON with:
- summary: 2-3 sentence overview
- keyPoints: array of main discussion topics
- decisions: array of decisions made
- actionItems: array of tasks with assignee if mentioned
- nextSteps: array of follow-up actions

Respond only with valid JSON.`;

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are a meeting analyst. Extract key information and respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      return this.parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      throw new Error('Failed to generate meeting summary');
    }
  }

  /**
   * Extract action items from transcript
   */
  async extractActionItems(transcript, participants = []) {
    try {
      const prompt = `Extract action items from meeting transcript.

TRANSCRIPT: ${transcript.substring(0, 1500)}
PARTICIPANTS: ${participants.join(', ')}

Find tasks, assignments, and commitments. Return JSON array:
[{"task": "description", "assignee": "person", "priority": "high/medium/low", "context": "background"}]

Only valid JSON:`;

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Extract action items from transcripts. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      return this.parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error extracting action items:', error);
      throw new Error('Failed to extract action items');
    }
  }

  /**
   * Generate smart highlights from transcript
   */
  async generateSmartHighlights(transcript, duration) {
    try {
      const prompt = `Find key moments in this meeting transcript.

TRANSCRIPT: ${transcript.substring(0, 1500)}
DURATION: ${duration} minutes

Identify 3-5 important moments: decisions, insights, agreements, action items.

JSON format:
[{"title": "brief title", "reason": "why important", "timeEstimate": minutes, "duration": clip_seconds}]

Only JSON:`;

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Identify key meeting moments. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      return this.parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating smart highlights:', error);
      throw new Error('Failed to generate smart highlights');
    }
  }

  /**
   * Analyze sentiment and engagement
   */
  async analyzeSentimentAndEngagement(transcript, participants = []) {
    try {
      const prompt = `
Analyze the sentiment and engagement level of this meeting:

TRANSCRIPT:
${transcript}

PARTICIPANTS: ${participants.join(', ')}

Provide analysis on:
1. Overall meeting sentiment (positive/neutral/negative)
2. Engagement level (high/medium/low) 
3. Participant contribution balance
4. Energy/enthusiasm indicators
5. Potential concerns or friction points
6. Collaboration quality

Return as structured JSON with scores and explanations.
`;

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing meeting dynamics, sentiment, and team engagement patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      return this.parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw new Error('Failed to analyze sentiment and engagement');
    }
  }

  /**
   * Generate follow-up suggestions
   */
  async generateFollowUpSuggestions(summary, actionItems, participants) {
    try {
      const prompt = `
Based on this meeting summary and action items, suggest follow-up actions:

MEETING SUMMARY:
${JSON.stringify(summary, null, 2)}

ACTION ITEMS:
${JSON.stringify(actionItems, null, 2)}

PARTICIPANTS: ${participants.join(', ')}

Generate suggestions for:
1. Email follow-up template
2. Calendar events to schedule
3. Documents to create/share
4. Stakeholders to update
5. Next meeting topics
6. CRM/project management updates

Return as structured JSON with actionable suggestions.
`;

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at suggesting productive follow-up actions after meetings to ensure momentum and accountability.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });

      return this.parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating follow-up suggestions:', error);
      throw new Error('Failed to generate follow-up suggestions');
    }
  }

  /**
   * Create meeting title from transcript
   */
  async generateMeetingTitle(transcript, participants = []) {
    try {
      const prompt = `
Based on this meeting transcript, generate a concise, descriptive meeting title:

TRANSCRIPT EXCERPT:
${transcript.substring(0, 1000)}...

PARTICIPANTS: ${participants.join(', ')}

Generate 3 title options:
1. Descriptive title focusing on main topic
2. Action-oriented title focusing on outcomes
3. Creative title that captures the essence

Each title should be 3-8 words maximum.
Return as JSON array.
`;

      const response = await this.client.post('/chat/completions', {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are expert at creating clear, concise meeting titles that capture the main purpose and outcomes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      return this.parseAIResponse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating meeting title:', error);
      throw new Error('Failed to generate meeting title');
    }
  }

  /**
   * Parse AI response and handle JSON extraction
   */
  parseAIResponse(content) {
    try {
      // Try to parse as JSON first
      return JSON.parse(content);
    } catch (error) {
      // If not valid JSON, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error('Failed to parse JSON from code block:', e);
        }
      }
      
      // If all else fails, return the raw content
      console.warn('Could not parse AI response as JSON, returning raw content');
      return { content: content.trim() };
    }
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels() {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error) {
      console.error('Error fetching available models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  /**
   * Check API usage and limits
   */
  async getUsage() {
    try {
      const response = await this.client.get('/auth/key');
      return response.data;
    } catch (error) {
      console.error('Error fetching usage data:', error);
      throw new Error('Failed to fetch usage data');
    }
  }
}

module.exports = new OpenRouterService();