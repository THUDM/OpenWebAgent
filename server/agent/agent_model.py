import re
from typing import List, Dict
from models.planner_model import PlannerModel
from database.objects import Turn
from args.args import PlannerArguments
class AgentModel():
    def __init__(self, planner_args: PlannerArguments=None, **kwargs):
        self.proxies = kwargs.get("proxies", None)
        self.planner = PlannerModel(**(planner_args.dict()), **kwargs)
    
    def call_act(self, instruction: str=None, history: List[Turn]=None, html_text: str=None, turn_count: int=None):
        try:
            planner_content = self.planner.inference(instruction=instruction, content=history, html=html_text, turn_count=turn_count)
        except Exception as e:
            print(e)
            raise Exception("Call planner API model error")
        
        task_raw, element_raw = re.search(r'instruction="([^"]*)"', planner_content), re.search(r'element="([^"]*)"', planner_content)
        ele_content = task_raw.group(1) if task_raw else None
        element_id = element_raw.group(1) if element_raw else None        
        
        element_bbox = None
        if element_id is not None:  
            bbox_raw = re.search(r'id="'+element_id+r'".*?data-bbox="(\d+,\d+,\d+,\d+)"', html_text)
            if bbox_raw:
                element_bbox = bbox_raw.group(1).split(',')
                element_bbox = [int(x) for x in element_bbox]
        
        agent_response = {
            "response": planner_content if planner_content else "",
            "element_id": element_id,
            "element_bbox": element_bbox
        }
        
        return agent_response
    
    def run(self):
        pass
