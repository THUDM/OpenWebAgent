import re
from flask import jsonify
from typing import List, Dict
from models.planner_model import PlannerModel
from database.objects import Turn
from args.server_parser import parse_all_arguments
from args.args import PlannerArguments
from utils.utils import print_with_color
class AgentModel():
    def __init__(self, planner_args: PlannerArguments=None, **kwargs):
        self.proxies = kwargs.get("proxies", None)
        self.planner = PlannerModel(**(planner_args.dict()), **kwargs)
    
    def call_act(self, instruction: str=None, history: List[Turn]=None, html_text: str=None, turn_count: int=None):
        def get_bbox(html_text: str, element_id):
            # we added bbox for most of elements in the html_text, so we can get the bbox of the element by the element_id
            if re.search(r'id="'+element_id+r'".*?data-bbox="(\d+,\d+,\d+,\d+)"', html_text):
                element_bbox = re.search(r'id="'+element_id+r'".*?data-bbox="(\d+,\d+,\d+,\d+)"', html_text).group(1)
                element_bbox = [int(element_bbox.split(',')[0]), int(element_bbox.split(',')[1]), int(element_bbox.split(',')[2]), int(element_bbox.split(',')[3])]
            else:
                element_bbox = None
            return element_bbox
    
        try:
            planner_content = self.planner.inference(instruction=instruction, content=history, html=html_text, turn_count=turn_count)
        except Exception as e:
            print(e)
            raise Exception("Call planner API model error")
        
        task_raw, element_raw = re.search(r'instruction="([^"]*)"', planner_content), re.search(r'element="([^"]*)"', planner_content)
        ele_content = task_raw.group(1) if task_raw else None
        element_id = element_raw.group(1) if element_raw else None        
        element_bbox = None
        
        if ele_content is not None and element_id is None:
            # TODO: here is for executor, you can add your own module here
            try:
                element_id = self.parse_element.get_element_id(ele_content, html_text)
            except Exception as e:
                print(e)
                raise Exception("Call element API model error")
        
        if element_id is not None:  
            element_bbox = get_bbox(html_text, element_id)
        
        agent_response = {
            "response": planner_content if planner_content else "",
            "element_id": element_id,
            "element_bbox": element_bbox
        }
        
        return agent_response
    
    def run(self):
        pass
