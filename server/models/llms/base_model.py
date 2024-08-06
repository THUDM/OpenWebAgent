import re
import ast
from typing import List, Dict
from database.objects import Turn
from utils.utils import print_with_color, remove_comments
from prompts import PLANNER_PROMPT

class BaseModel():
    def __init__(self, **kwargs):
        self.planner_prompt = PLANNER_PROMPT
        self.past_rnd_prompt = "** html **"

    def get_planner_prompt(self, instruction: str, index: int, html_text: str, contents: List[Turn]) -> List[Dict]:
        print_with_color(f"Instruction: {instruction}", "green")
        messages = [{"role": "system", "content": [{"type": "text", "text": self.planner_prompt}]}]
        for content in contents:
            print_with_color(content.dump(), "blue")
            message =[
                {"role": "user", "content": [{"type": "text", "text": self.past_rnd_prompt}]},
                {"role": "assistant", "content": [{"type": "text", "text": content['response']}]}
            ]
            messages.extend(message)
            
        html = re.sub(r' data-bbox="[^"]*"', "", html_text)
        messages.append({"role": "user", "content": [{"type": "text", "text": f"{instruction}\n\n{html}"}]})
        
        return messages
    
    def generate(self, messages: List[dict]) -> str:
        raise NotImplementedError("generate method is not implemented")