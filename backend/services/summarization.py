import os
import requests
from typing import List, Dict, Tuple

class SummarizationService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "mistralai/mistral-7b-instruct:free"
        
        if not self.api_key:
            print("⚠️  OPENROUTER_API_KEY not set, summarization will not work")
    
    async def summarize_transcript(self, transcript: List[Dict[str, str]]) -> Tuple[str, List[str]]:
        """Summarize transcript and extract action items using Mistral 7B"""
        if not self.api_key:
            raise Exception("OpenRouter API key not configured")
        
        # Format transcript
        transcript_text = "\n".join([
            f"[{seg['timestamp']}] {seg.get('speaker', 'Unknown')}: {seg['text']}"
            for seg in transcript
        ])
        
        prompt = f"""Analyze the following meeting transcript and provide:

1. A concise summary of the key discussion points (3-5 sentences)
2. A list of action items (if any)

Transcript:
{transcript_text}

Respond in this format:
SUMMARY:
[Your summary here]

ACTION ITEMS:
- [Action item 1]
- [Action item 2]
(or "None" if no action items)
"""
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 500,
                "temperature": 0.7,
            }
            
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse response
            summary, action_items = self._parse_response(content)
            
            return summary, action_items
            
        except Exception as e:
            print(f"❌ Summarization Error: {str(e)}")
            raise Exception(f"Summarization failed: {str(e)}")
    
    def _parse_response(self, content: str) -> Tuple[str, List[str]]:
        """Parse the AI response to extract summary and action items"""
        parts = content.split("ACTION ITEMS:")
        
        summary = parts[0].replace("SUMMARY:", "").strip()
        
        action_items = []
        if len(parts) > 1:
            action_text = parts[1].strip()
            if action_text.lower() != "none":
                action_items = [
                    line.strip("- ").strip()
                    for line in action_text.split("\n")
                    if line.strip() and line.strip() != "-"
                ]
        
        return summary, action_items

summarization_service = SummarizationService()
