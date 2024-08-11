import os
import sys
import json
import time
import random
import base64
import threading
import traceback

from PIL import Image
from io import BytesIO
from typing import Dict, List
from functools import partial


from flask import Response, Flask, request, jsonify
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.logger_utils import setup_logger
from database.logger import DemoLogger
from agent.agent_model import AgentModel
from database.objects.session import Session
from args.server_parser import parse_all_arguments
from utils.utils import print_with_color, parse_function_call, format_bbox

class ResourceManager:
    def __init__(self, resources: List):
        self.resources = resources
        assert len(resources) > 0
        self._next_index = 0
        self._lock = threading.Lock()

    def get_resource(self):
        with self._lock:
            res = self.resources[self._next_index]
            self._next_index = (self._next_index + 1) % len(self.resources)
        return res

class WebServer:
    def __init__(self, app: Flask, agents: ResourceManager):
        self.app = app
        setup_logger(app)
        self.app.add_url_rule("/v1/controller", "controller", self.controller_endpoint, methods=["POST"])

        self.agents = agents
        self.logger = DemoLogger()

    def run(self, host: str, port: int, debug: bool = False) -> None:
        self.app.run(host=host, port=port, debug=debug)

    def log(self, value: Dict) -> None:
        self.logger(value)
    
    def controller_endpoint(self):
        """
        main function
        you can modify the pipeline for your own purposes
        
        frontend parameters:
        session_id:     for requests handling
        instructions:   user task
        html_text:      user context
        url:            current website url
        viewport_size:  viewport size of the browser
        image:          screenshot of the current website in base64 format
        """
        
        data = request.get_json()
        session_id = data.get('session_id')
        instruction = data.get('instruction')
        html_text = data.get('html_text')
        url = data.get('url')
        window = data.get("viewport_size")
        image=data.get('image', None)

        screenshot = None
        if image:
            screenshot = BytesIO(base64.b64decode(image.replace('data:image/png;base64,', '')))
            image = Image.open(screenshot)
            screenshot.seek(0)
            screenshot = screenshot.read()
        
        if session_id is None:
            if not isinstance(instruction, str):
                error_msg = jsonify({"message": "'instruction' must be a string if starting a new session."})
                app.logger.error("instruction : %s, error: %s" % (instruction, error_msg))
                return error_msg, 440
            session_id = "%010d-%04d" % (int(time.time() * 1e6), random.randint(0, 9999))

        app.logger.info("Session ID: %s" % session_id)
        app.logger.info("Instruction: %s" % instruction)

        # We keep the history of different sessions in Mongodb
        session = Session.get_session(session_id)
        round_count = len(session.turns)
        request_id = "%05d-%04d" % (int(time.time() * 1e5), random.randint(0, 9999))
        
        self.log({
            "flag": "PostRequest",
            "request_id": request_id,
            "session_id": session_id,
            "round": round_count,
            "instruction": instruction,
            "html_text": html_text,
            "screenshot":screenshot,
            "url":url,
            "source": 'Agent'
        })
        
        # TODO: add your own pipeline here
        try:
            agent = self.agents.get_resource()
            rsp = agent.call_act(instruction, session.turns, html_text, round_count)
        except Exception as e:
            app.logger.error("session id: %s, request id: %s, round: %d" % (session_id, request_id, round_count))
            app.logger.error(traceback.print_exc())
            return jsonify({"message": str(e)}), 500
        
        app.logger.info("response: %s" % rsp['response'])

        parsed_action = parse_function_call(rsp['response'])
        parsed_action['element_id'] = rsp['element_id']
        parsed_action['bbox'] = format_bbox(rsp['element_bbox'], image, window) if rsp['element_bbox'] else None
        
        self.log({
            "flag": "ModelGeneration",
            "request_id": request_id,
            "session_id": session_id,
            "response": rsp['response'],
            'parsed_action': parsed_action
        })

        res = {
            "session_id": session_id,
            "request_id": request_id,
            "round": round_count + 1,
            **rsp,
        }
        
        return jsonify(res)

if __name__ == '__main__':

    agent_configs = {
        "proxies": None,
    }
    
    planner_args = parse_all_arguments()
    print(planner_args)

    app = Flask(__name__)
    app.config['JSON_AS_ASCII'] = False
    
    planner_urls = planner_args.base_urls if planner_args.base_urls else []
    planner_urls = planner_urls if len(planner_urls) else ["" for _ in range(planner_args.n_workers)]
    
    agents = []
    for planner_url in planner_urls:
        agents.append(AgentModel(planner_args, planner_url=planner_url, **agent_configs))
    
    server = WebServer(app, ResourceManager(agents))
    server.run("0.0.0.0", 24080, debug=True)
    
