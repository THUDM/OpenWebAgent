import os, re
import requests
import time
from typing import List
from database.objects import Turn
from utils.utils import print_with_color
from prompts import PLANNER_PROMPT
from .base_model import BaseModel

class HttpModel(BaseModel):
    def __init__(self, **kwargs):
        super().__init__()
        self.base_url = kwargs.get("planner_url", "")
        self.proxies = kwargs.get("proxies", {})
    
    def get_planner_prompt(self, instruction: str, index: int, html_text: str, contents: List[Turn]) -> str:
    
        def format_history(contents: List[Turn], index: int) -> str:
            history = ""
            for i, content in enumerate(reversed(contents)):
                obs = f"<|observation|>\n{content['observation']}\n\n" if "observation" in content else ""
                history = f"Round {i}\n\n<|user|>\n{self.past_rnd_prompt}\n\n<|assistant|>\n{content['response']}\n\n{obs}{history}"
            return history
        
        def remove_bbox(html: str) -> str:
            return re.sub(r' data-bbox="[^"]*"', "", html)
    
        # TODO: Set your own prompt here!
        history = format_history(contents, index)
        
        # Limit the length of the history and html_text to avoid exceeding the maximum length
        if len(history) + len(html_text) > (16384 - 1024):
            html_text = html_text[:(16384 - 1024)-len(history)]

        # Only use instruction (task) for the first round
        newinstr = f"{instruction}\n\n" if index == 0 else ""
        
        # The current turn prompt
        current_turn = f"Round {index}\n\n<|user|>\n{newinstr}{remove_bbox(html_text)}\n\n<|assistant|>\n"
        system_prompt = "" # f"<|system|>\n{PLANNER_PROMPT}\n\n"
        prompt = f"{system_prompt}{history}{current_turn}"
        print_with_color(prompt, "red")

        return prompt
        
    def generate(self, prompt: str) -> str:
        payload = {
            "inputs": f"{prompt}",
            "parameters": {
                "do_sample": False,
                # "temperature": 0.0,
                "max_new_tokens": 1024,
                "decoder_input_details": False,
                "details": False,
                "stop": [
                "</s>",
                "<|endoftext|>",
                "<|user|>",
                "<|observation|>"
                ]
            },
            "stream": False
        }
        headers = { 'Content-Type': 'application/json' }
        for _ in range(3):
            try:
                response = requests.post(self.base_url, headers=headers, json=payload, proxies=self.proxies)
                response = response.json()
                if 'error' in response:
                    raise Exception(f"{response['error']}")
                return response[0]['generated_text'].rstrip("</s>")
            except Exception as e:
                print(e)
                time.sleep(1)
        raise Exception("planner model error")