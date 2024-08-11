import os
import argparse
import yaml
from dataclasses import dataclass, field, asdict, fields
from typing import Optional, List, Dict, Any

from .args import PlannerArguments

@dataclass
class TextOnlyWebTaskConfig:
    config_path: Optional[str] = field(
        default="config/server_config.yaml",
        metadata={"help": "The path to the configuration file."}
    )
    save_dir: Optional[str] = field(
        default="results",
        metadata={"help": "The directory to save the results."}
    )
    max_turns: Optional[int] = field(
        default=25,
        metadata={"help": "The maximum number of turns for the task."}
    )
    
    def subdir_config(self, subdir: str):
        new_config = self.__dict__.copy()
        new_config["save_dir"] = os.path.join(self.save_dir, subdir)
        return TextOnlyWebTaskConfig(**new_config)

def load_config(file_path: str):
    with open(file_path, 'r') as file:
        config = yaml.safe_load(file)
    return config

def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a model with given arguments")

    parser.add_argument('--config-path', type=str, help="Path to configuration file", default="config/server_config.yaml")

    return parser.parse_args()

def parse_all_arguments() -> PlannerArguments:
    args = parse_arguments()
    file_config = load_config(args.config_path)
    planner_args = PlannerArguments(**file_config['planner_args'])

    return planner_args