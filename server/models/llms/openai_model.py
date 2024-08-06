# You should install openai with version >= 1.0.0
import os
from openai import OpenAI
from dotenv import load_dotenv
from typing import List, Dict

from database.objects import Turn
from .base_model import BaseModel

config_path = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")), ".env")
load_dotenv(config_path)

class OpenAIModel(BaseModel):
    def __init__(self, **kwargs):
        super().__init__()
        self.openai_key = os.getenv("OPENAI_KEY")
        self.api_url = os.getenv("OPENAI_API_URL")
        self.client = OpenAI(api_key=self.openai_key, base_url=self.api_url) if self.openai_key else None
        self.model = kwargs.get("model", "gpt-4o-2024-05-13")

    def get_planner_prompt(self, instruction: str, index: int, html_text: str, contents: List[Turn]) -> List[Dict]:
        return super().get_planner_prompt(instruction, index, html_text, contents)
    
    def generate(self, messages: List[dict]) -> str:
        if not self.client:
            raise RuntimeError("OpenAI client not initialized.")
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=1024,
        )
        
        return response.choices[0].message.content