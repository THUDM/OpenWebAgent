from mongoengine import connect
# from sshtunnel import SSHTunnelForwarder
import os
from dotenv import load_dotenv

config_path = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')), '.env')
load_dotenv(config_path)

from args.mongo_parser import parse_all_arguments
from database.dump_record import dump_session
mongo_args, dump_args = parse_all_arguments()

base_url = mongo_args.base_url
dbname = mongo_args.dbname
username = mongo_args.username

def do_connection(db='openwebagent-demo', alias='default', base_url='127.0.0.1:27017'):
    assert os.getenv('LOG_DB_PASSWD')
    # We use mongo atlas here
    return connect(
        host=f"mongodb+srv://{username}:{os.getenv('LOG_DB_PASSWD')}@{db}.{base_url}/?retryWrites=true&w=majority",
        alias=alias
    )

# Replace the default socket implementation
do_connection(db=dbname, base_url=base_url)

if dump_args.session_id:
    dump_session(dump_args.session_id, dump_args.output_dir, dump_args.save_html)

    