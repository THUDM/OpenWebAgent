import time
import requests
import re
import os, sys

from typing import List, Dict
from args.args import PlannerArguments
from models.api_model import APIModel
from utils.utils import print_with_color
from database.objects import Turn

# from prompts.template_web import SYSTEM_PROMPT
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class PlannerModel(APIModel):
    def __init__(self, **kwargs):
        provider = kwargs.pop('provider', None)
        super().__init__(provider, **kwargs)

    def inference(self, html: str, turn_count: int, **kwargs):
        if not self.model:
            raise Exception(f"Model {self.model_name} not created.")
        
        start_time = time.time()

        instruction = kwargs["instruction"]
        contents = kwargs['content']
        planner_prompt = self.model.get_planner_prompt(instruction, turn_count, html, contents)
        response = self.model.generate(planner_prompt)
        
        print(f"Planner request lasting: {time.time() - start_time} ms")

        return response
