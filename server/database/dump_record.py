from .objects import *

def dump_session(session_id=None, output_dir='.', save_html = True):
    session = Session.objects.get(session_id=session_id)
    print(session)
    session.dump(output_dir=output_dir, save_html = save_html)
