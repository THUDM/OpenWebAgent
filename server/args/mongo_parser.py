import argparse
import yaml

from .args import MongoArguments

def load_config(file_path: str):
    with open(file_path, 'r') as file:
        config = yaml.safe_load(file)
    return config

def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Initiate a client to interact with the server")
    parser.add_argument('--config', type=str, help="Path to configuration file", default="config/mongo_config.yaml")

    # parameters for dump_session
    parser.add_argument('--session_id', type=str, help='The session ID to dump.', required=False)
    parser.add_argument('--output_dir', type=str, default='.logs/record/', help='The directory to output the dump files.', required=False)
    parser.add_argument('--save_html', action='store_true', help='Flag to save the output as HTML.', required=False)

    return parser.parse_args()

def parse_all_arguments():
    args = parse_arguments()
    file_config = load_config(args.config)
    
    mongo_args = MongoArguments(**file_config['mongo_args'])
    
    return mongo_args, args